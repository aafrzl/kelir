import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { OIL_DRAIN, OIL_EPSILON, OIL_JAR_AMOUNT, OIL_LOW, OIL_MAX, OIL_SOURCE_COOLDOWN, TIME_EPSILON } from "./constants";
import { addOil, clampOil, collectJar, cycleLamp, drawFromOilSource, tickOil, tickOilSource } from "./oil";
import type { LampState } from "./types";

// Generator notes. fast-check 4 caps arrays at about 10 items unless `size: "max"` is given, and
// `fc.double` samples evenly over representable doubles, so ~90% of values in [0, 30] land below
// 1e-9. Times are therefore whole 60 Hz ticks, levels sit on a 0.1 grid (biased towards OIL_LOW),
// and raw doubles are mixed in only where tiny values are the point.

/** Game time in whole fixed-step ticks, up to `maxTicks`. */
const ticks = (maxTicks: number) => fc.integer({ min: 0, max: maxTicks }).map((n) => n / 60);

/** Half frame-sized steps, half up to 60 s, so a run burns through refills and spans several cooldowns. */
const step = fc.oneof(ticks(2), ticks(60 * 60));

const lampState: fc.Arbitrary<LampState> = fc.constantFrom("high", "low", "off");

/** Any level on a 0.1 grid, often near OIL_LOW, plus raw doubles for near-empty edge cases. */
const oilLevel = fc.oneof(
  fc.integer({ min: 0, max: OIL_MAX * 10 }).map((n) => n / 10),
  fc.integer({ min: (OIL_LOW - 5) * 10, max: (OIL_LOW + 10) * 10 }).map((n) => n / 10),
  fc.double({ min: 0, max: OIL_MAX, noNaN: true }),
);

/** Seconds left on the pawon source's cooldown at the start of a run. */
const startCooldown = fc.oneof(fc.constant(0), ticks(OIL_SOURCE_COOLDOWN * 60));

const JAR_IDS = ["jar-1", "jar-2", "jar-3", "jar-4", "jar-5", "jar-6", "jar-7", "jar-8"] as const;

type Action = { kind: "tick"; dt: number } | { kind: "cycle" } | { kind: "jar"; id: string } | { kind: "source" };

// Weights keep the flame lit most of the time and refills rarer than burning, so oil keeps
// recrossing OIL_LOW instead of sitting at a full tank.
const action: fc.Arbitrary<Action> = fc.oneof(
  { weight: 6, arbitrary: step.map((dt): Action => ({ kind: "tick", dt })) },
  { weight: 1, arbitrary: fc.constant<Action>({ kind: "cycle" }) },
  { weight: 1, arbitrary: fc.constantFrom(...JAR_IDS).map((id): Action => ({ kind: "jar", id })) },
  { weight: 1, arbitrary: fc.constant<Action>({ kind: "source" }) },
);

/** Slack for the cooldown checks: the countdown snaps below TIME_EPSILON, plus float drift in the sums. */
const COOLDOWN_SLACK = 2 * TIME_EPSILON;

describe("oil properties", () => {
  it("over any sequence of play: oil stays in 0..OIL_MAX, a lit lamp always has oil, ticks never add oil, the low cue fires once per downward crossing, and the pawon source keeps its cooldown", () => {
    const coverage = { runs: 0, twoDraws: 0, twoLowCues: 0 };
    fc.assert(
      fc.property(
        oilLevel,
        lampState,
        startCooldown,
        fc.array(action, { maxLength: 200, size: "max" }),
        (startOil, startLamp, cooldownAtStart, actions) => {
          // A zero-length tick applies the empty-lamp rule to the starting state.
          let { oil, lamp } = tickOil(startOil, startLamp, 0);
          let jarsTaken: readonly string[] = [];
          let cooldown = cooldownAtStart;
          let sinceLastDraw = OIL_SOURCE_COOLDOWN - cooldownAtStart; // as if drawn that long ago
          let draws = 0;
          let lowCues = 0;

          for (const a of actions) {
            const before = oil;
            if (a.kind === "tick") {
              const next = tickOil(oil, lamp, a.dt);
              expect(next.oil, "ticks never add oil (Req 4.2)").toBeLessThanOrEqual(before);
              expect(next.crossedLow, "low cue iff oil fell from above OIL_LOW to it or below (Req 4.9)").toBe(
                before > OIL_LOW && next.oil <= OIL_LOW,
              );
              if (next.crossedLow) lowCues++;
              ({ oil, lamp } = next);
              cooldown = tickOilSource(cooldown, a.dt);
              sinceLastDraw += a.dt;
            } else if (a.kind === "cycle") {
              lamp = cycleLamp(lamp, oil);
            } else if (a.kind === "jar") {
              const wasTaken = jarsTaken.includes(a.id);
              const result = collectJar(oil, jarsTaken, a.id);
              expect(result.collected).toBe(!wasTaken);
              expect(result.oil).toBe(wasTaken ? before : Math.min(OIL_MAX, before + OIL_JAR_AMOUNT));
              ({ oil, jarsTaken } = result);
              expect(new Set(jarsTaken).size, "each jar is taken at most once").toBe(jarsTaken.length);
            } else {
              const result = drawFromOilSource(oil, cooldown);
              if (result.used) {
                expect(sinceLastDraw, "never twice within the cooldown (Req 4.10)").toBeGreaterThanOrEqual(
                  OIL_SOURCE_COOLDOWN - COOLDOWN_SLACK,
                );
                sinceLastDraw = 0;
                draws++;
              } else {
                expect(sinceLastDraw, "only refuses while genuinely cooling down").toBeLessThan(
                  OIL_SOURCE_COOLDOWN - TIME_EPSILON / 2,
                );
                expect(result.oil).toBe(before);
              }
              ({ oil, cooldown } = result);
            }

            expect(oil, "oil never below 0 (Req 4.3)").toBeGreaterThanOrEqual(0);
            expect(oil, "oil never above OIL_MAX (Req 4.3)").toBeLessThanOrEqual(OIL_MAX);
            if (lamp !== "off") expect(oil, "a lit lamp has oil (Req 4.4)").toBeGreaterThanOrEqual(OIL_EPSILON);
          }

          coverage.runs++;
          if (draws >= 2) coverage.twoDraws++;
          if (lowCues >= 2) coverage.twoLowCues++;
        },
      ),
      { numRuns: 300 },
    );
    // Guard the generators: runs must really reuse the source and recross the low threshold.
    expect(coverage.twoDraws / coverage.runs, "share of runs with 2+ source draws").toBeGreaterThan(0.3);
    expect(coverage.twoLowCues / coverage.runs, "share of runs with 2+ low cues").toBeGreaterThan(0.3);
  });

  it("tried after every tick, the pawon source refills once its cooldown has elapsed, never earlier or later (Req 4.10)", () => {
    const coverage = { runs: 0, multiDraw: 0 };
    fc.assert(
      fc.property(fc.array(ticks(120), { minLength: 1, maxLength: 600, size: "max" }), (dts) => {
        let cooldown = 0;
        let sinceLastDraw = Number.POSITIVE_INFINITY;
        let draws = 0;
        for (const dt of dts) {
          cooldown = tickOilSource(cooldown, dt);
          sinceLastDraw += dt;
          const result = drawFromOilSource(50, cooldown);
          if (result.used) {
            expect(sinceLastDraw).toBeGreaterThanOrEqual(OIL_SOURCE_COOLDOWN - COOLDOWN_SLACK);
            sinceLastDraw = 0;
            draws++;
          } else {
            expect(sinceLastDraw).toBeLessThan(OIL_SOURCE_COOLDOWN - TIME_EPSILON / 2);
          }
          cooldown = result.cooldown;
        }
        coverage.runs++;
        if (draws >= 3) coverage.multiDraw++;
      }),
      { numRuns: 300 },
    );
    expect(coverage.multiDraw / coverage.runs, "share of runs with 3+ draws").toBeGreaterThan(0.3);
  });

  it("a tick burns exactly the flame's rate, and never below empty (Req 4.2, 4.3)", () => {
    const dt = fc.oneof(ticks(200 * 60), fc.double({ min: 0, max: 200, noNaN: true }));
    fc.assert(
      fc.property(oilLevel, lampState, dt, (oil, lamp, seconds) => {
        const expected = Math.max(0, oil - OIL_DRAIN[lamp] * seconds);
        expect(Math.abs(tickOil(oil, lamp, seconds).oil - expected)).toBeLessThanOrEqual(OIL_EPSILON + 1e-12);
      }),
    );
  });

  it("with oil in the tank, three presses of the lamp key visit all three flames and come back (Req 4.1)", () => {
    const fuelled = fc.oneof(
      fc.integer({ min: 1, max: OIL_MAX * 10 }).map((n) => n / 10),
      fc.double({ min: OIL_EPSILON, max: OIL_MAX, noNaN: true }),
    );
    fc.assert(
      fc.property(lampState, fuelled, (lamp, oil) => {
        const a = cycleLamp(lamp, oil);
        const b = cycleLamp(a, oil);
        expect(new Set([lamp, a, b]).size).toBe(3);
        expect(cycleLamp(b, oil)).toBe(lamp);
      }),
    );
  });

  it("when oil is 0, no number of presses lights the lamp (design.md, Req 4.4)", () => {
    fc.assert(
      fc.property(lampState, fc.integer({ min: 1, max: 10 }), (lamp, presses) => {
        let current = lamp;
        for (let i = 0; i < presses; i++) {
          current = cycleLamp(current, 0);
          expect(current).toBe("off");
        }
      }),
    );
  });

  it("collecting jars in any order, with repeats, adds each jar once, capped at OIL_MAX (Req 4.5)", () => {
    fc.assert(
      fc.property(oilLevel, fc.array(fc.constantFrom(...JAR_IDS), { maxLength: 20, size: "max" }), (start, ids) => {
        let state = { oil: start, jarsTaken: [] as readonly string[] };
        for (const id of ids) state = collectJar(state.oil, state.jarsTaken, id);
        const distinct = [...new Set(ids)];
        expect(state.jarsTaken).toEqual(distinct);
        expect(state.oil).toBeCloseTo(Math.min(OIL_MAX, start + OIL_JAR_AMOUNT * distinct.length), 9);
      }),
    );
  });

  it("addOil never removes oil and never exceeds the cap, whatever it is given", () => {
    fc.assert(
      fc.property(fc.double(), fc.double(), (oil, amount) => {
        const result = addOil(oil, amount);
        expect(result).toBeGreaterThanOrEqual(clampOil(oil));
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(OIL_MAX);
      }),
    );
  });
});
