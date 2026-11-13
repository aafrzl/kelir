import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  DISTORTION_ONSET,
  SUKMA_DRAIN_DARK,
  SUKMA_EPSILON,
  SUKMA_LOW,
  SUKMA_LOW_EXIT,
  SUKMA_MAX,
  SUKMA_REGEN_LIT,
} from "./constants";
import { clampSukma, distortionFrom, nextSukmaLow, tickSukma } from "./sukma";
import type { LampState } from "./types";

// Generator notes (tech.md): arrays take `size: "max"`, times are whole 60 Hz ticks, levels sit on a
// 0.1 grid (one branch biased to the low thresholds), and raw doubles appear only where tiny or odd
// values are the point. Coverage guards fail the test if a rare case stops being reached.

/** The fixed logic step (design.md: 60 Hz). */
const DT = 1 / 60;

/** Steepest slope of smoothstep (1.5 at its midpoint), in distortion per unit of Sukma. */
const MAX_SLOPE = 1.5 / DISTORTION_ONSET;

/** Fastest Sukma ever moves, in units per second. */
const MAX_RATE = Math.max(SUKMA_DRAIN_DARK, SUKMA_REGEN_LIT);

const lampState: fc.Arbitrary<LampState> = fc.constantFrom("high", "low", "off");

/** Any level on a 0.1 grid, often near the low thresholds, plus raw doubles. */
const sukmaLevel = fc.oneof(
  fc.integer({ min: 0, max: SUKMA_MAX * 10 }).map((n) => n / 10),
  fc.integer({ min: (SUKMA_LOW - 5) * 10, max: (SUKMA_LOW_EXIT + 5) * 10 }).map((n) => n / 10),
  fc.double({ min: 0, max: SUKMA_MAX, noNaN: true }),
);

/**
 * A lamp state held for a stretch of play at the 60 Hz step: a tap of the lamp key, up to 10 s, or
 * 10–30 s (long enough to empty or refill the soul, so runs reach the rare cases the guards demand).
 */
const segment = fc.record({
  lamp: lampState,
  ticks: fc.oneof(
    fc.integer({ min: 1, max: 6 }),
    fc.integer({ min: 1, max: 10 * 60 }),
    fc.integer({ min: 10 * 60, max: 30 * 60 }),
  ),
});

/** A per-tick check that stays cheap (`expect` on every tick is far too slow): the message is built only on failure. */
function check(ok: boolean, message: () => string): void {
  if (!ok) throw new Error(message());
}

describe("Sukma properties", () => {
  it("over any realistic play at 60 Hz: range, exact rates, darkness always costs, distortion never jumps, low Sukma never chatters, and the low warning always comes long before the soul is lost", () => {
    const coverage = { runs: 0, lostAfterWarning: 0, repeatFlips: 0, refilled: 0 };
    fc.assert(
      fc.property(
        sukmaLevel,
        fc.boolean(),
        fc.array(segment, { minLength: 1, maxLength: 40, size: "max" }),
        (start, startLow, segments) => {
          let sukma = start;
          let low = nextSukmaLow(start, startLow);
          let time = 0;
          let lastFlip = Number.NaN; // time of the previous flip of the low flag
          let lowSince = Number.NaN; // time low Sukma was last entered from not-low
          let flips = 0;
          let lostAfterWarning = false;
          let refilled = false;

          for (const { lamp, ticks } of segments) {
            const rate = lamp === "off" ? -SUKMA_DRAIN_DARK : SUKMA_REGEN_LIT;
            for (let i = 0; i < ticks; i++) {
              const before = sukma;
              sukma = tickSukma(sukma, lamp, DT);
              time += DT;
              const at = () => `t=${time.toFixed(3)}s lamp=${lamp} ${before} → ${sukma}`;

              const expected = Math.min(SUKMA_MAX, Math.max(0, before + rate * DT));
              check(sukma >= 0 && sukma <= SUKMA_MAX, () => `out of range (Req 6.3) ${at()}`);
              check(Math.abs(sukma - expected) <= SUKMA_EPSILON, () => `wrong rate (Req 6.1, 6.2) ${at()}`);
              if (lamp === "off") {
                check(before > 0 ? sukma < before : sukma === 0, () => `darkness did not cost Sukma ${at()}`);
              }

              const change = Math.abs(distortionFrom(sukma) - distortionFrom(before));
              check(change <= MAX_SLOPE * Math.abs(sukma - before) + 1e-12, () => `distortion jumped by ${change} ${at()}`);

              const nextLow = nextSukmaLow(sukma, low);
              const want = sukma < SUKMA_LOW ? true : sukma >= SUKMA_LOW_EXIT ? false : low;
              check(nextLow === want, () => `low flag ${nextLow}, expected ${want} ${at()}`);
              if (nextLow !== low) {
                if (!Number.isNaN(lastFlip)) {
                  const gap = time - lastFlip;
                  check(gap >= (SUKMA_LOW_EXIT - SUKMA_LOW) / MAX_RATE - 1e-9, () => `low flag chattered: flips ${gap}s apart ${at()}`);
                }
                lastFlip = time;
                flips++;
                if (nextLow) lowSince = time;
              }
              low = nextLow;

              if (before > 0 && sukma === 0 && !Number.isNaN(lowSince)) {
                lostAfterWarning = true;
                const warned = time - lowSince;
                check(warned >= SUKMA_LOW / SUKMA_DRAIN_DARK - DT - 1e-9, () => `soul lost only ${warned}s after the low warning ${at()}`);
              }
              if (before < SUKMA_MAX && sukma === SUKMA_MAX) refilled = true;
            }
          }

          coverage.runs++;
          if (lostAfterWarning) coverage.lostAfterWarning++;
          if (flips >= 2) coverage.repeatFlips++;
          if (refilled) coverage.refilled++;
        },
      ),
      { numRuns: 300 },
    );
    // Guard the generators: runs must really lose the soul after a warning, flip the low flag more
    // than once (the chatter check only bites from the second flip) and refill to the top.
    expect(coverage.lostAfterWarning / coverage.runs, "souls lost after a warning, per run").toBeGreaterThan(0.3);
    expect(coverage.repeatFlips / coverage.runs, "share of runs with 2+ low flips").toBeGreaterThan(0.3);
    expect(coverage.refilled / coverage.runs, "share of runs that refill to SUKMA_MAX").toBeGreaterThan(0.3);
  });

  it("darkness always costs Sukma: any positive soul and any whole number of ticks leaves less (design.md, Req 6.1)", () => {
    const positive = fc.oneof(
      fc.integer({ min: 1, max: SUKMA_MAX * 10 }).map((n) => n / 10),
      fc.double({ min: Number.MIN_VALUE, max: SUKMA_MAX, noNaN: true }),
    );
    fc.assert(
      fc.property(positive, fc.integer({ min: 1, max: 60 * 60 }), (s, ticks) => {
        expect(tickSukma(s, "off", ticks * DT)).toBeLessThan(s);
      }),
    );
  });

  it("whatever it is given, a tick lands in 0..SUKMA_MAX", () => {
    fc.assert(
      fc.property(fc.double(), lampState, fc.double(), (s, lamp, dt) => {
        const next = tickSukma(s, lamp, dt);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThanOrEqual(SUKMA_MAX);
      }),
    );
  });

  const level = fc.oneof(
    fc.integer({ min: -100, max: (SUKMA_MAX + 10) * 10 }).map((n) => n / 10),
    fc.double({ min: -10, max: SUKMA_MAX + 10, noNaN: true }),
  );

  it("distortion is within [0, 1] for any input, and exactly 0 at or above the onset (design.md, Req 6.5)", () => {
    // Raw fc.double() alone almost never lands in 60..100, the range the onset rule is about.
    fc.assert(
      fc.property(fc.oneof(level, fc.double()), (s) => {
        const d = distortionFrom(s);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
        if (clampSukma(s) >= DISTORTION_ONSET) expect(d).toBe(0);
      }),
      { numRuns: 500 },
    );
  });

  it("distortion never decreases as Sukma falls (design.md, Req 6.5)", () => {
    fc.assert(
      fc.property(level, level, (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(distortionFrom(lo)).toBeGreaterThanOrEqual(distortionFrom(hi) - 1e-12);
      }),
      { numRuns: 1000 },
    );
  });

  it("distortion changes by at most MAX_SLOPE per unit of Sukma, so effects ramp over seconds and cannot flash (Req 6.5, 10.6)", () => {
    fc.assert(
      fc.property(level, level, (a, b) => {
        expect(Math.abs(distortionFrom(a) - distortionFrom(b))).toBeLessThanOrEqual(
          MAX_SLOPE * Math.abs(clampSukma(a) - clampSukma(b)) + 1e-12,
        );
      }),
      { numRuns: 1000 },
    );
  });
});
