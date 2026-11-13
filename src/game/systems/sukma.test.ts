import { describe, expect, it } from "vitest";
import {
  DISTORTION_ONSET,
  SUKMA_DRAIN_DARK,
  SUKMA_LOW,
  SUKMA_LOW_EXIT,
  SUKMA_MAX,
  SUKMA_REGEN_LIT,
  SUKMA_START,
} from "./constants";
import { clampSukma, distortionFrom, nextSukmaLow, tickSukma } from "./sukma";
import type { LampState } from "./types";

/** The fixed logic step (design.md: 60 Hz). */
const DT = 1 / 60;

/** Tick Sukma at the fixed step under one lamp state for `ticks` ticks. */
function hold(sukma: number, lamp: LampState, ticks: number): number {
  let s = sukma;
  for (let i = 0; i < ticks; i++) s = tickSukma(s, lamp, DT);
  return s;
}

/** Ticks at the fixed step, under one lamp state, until `done` holds. */
function ticksUntil(sukma: number, lamp: LampState, done: (s: number) => boolean, limit = 100_000): number {
  let s = sukma;
  for (let i = 1; i <= limit; i++) {
    s = tickSukma(s, lamp, DT);
    if (done(s)) return i;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Design floor for fairness: from a calm soul, total darkness must give the player at least this
 * many seconds of "low Sukma" warning before the soul is lost. R11's user story asks that failing
 * feel fair, and the survival-crafting skill's rule is "warn, then fail with time to recover".
 * The balance pass may move it, deliberately.
 */
const MIN_WARNING_SECONDS = 5;

describe("start of a run (Req 6.7)", () => {
  it("starts with a full, calm soul: no distortion and not low", () => {
    expect(SUKMA_START).toBe(SUKMA_MAX);
    expect(distortionFrom(SUKMA_START)).toBe(0);
    expect(nextSukmaLow(SUKMA_START, false)).toBe(false);
  });

  it("orders the thresholds: low Sukma only ever happens on an already distorted screen", () => {
    expect(0).toBeLessThan(SUKMA_LOW);
    expect(SUKMA_LOW).toBeLessThan(SUKMA_LOW_EXIT);
    expect(SUKMA_LOW_EXIT).toBeLessThan(DISTORTION_ONSET);
    expect(DISTORTION_ONSET).toBeLessThan(SUKMA_MAX);
  });
});

describe("tickSukma in darkness (Req 6.1)", () => {
  it("drains SUKMA_DRAIN_DARK per second at the 60 Hz step", () => {
    expect(hold(SUKMA_MAX, "off", 600)).toBeCloseTo(SUKMA_MAX - SUKMA_DRAIN_DARK * 10, 9);
  });

  it("lowers Sukma on every tick until it is 0, then stays at 0", () => {
    let s = 3;
    for (let i = 0; i < 200; i++) {
      const next = tickSukma(s, "off", DT);
      if (s > 0) expect(next).toBeLessThan(s);
      else expect(next).toBe(0);
      s = next;
    }
    expect(s).toBe(0);
  });
});

describe("tickSukma in lamplight (Req 6.2)", () => {
  it.each(["high", "low"] as const)("regenerates SUKMA_REGEN_LIT per second while %s", (lamp) => {
    expect(hold(50, lamp, 600)).toBeCloseTo(50 + SUKMA_REGEN_LIT * 10, 9);
  });

  it("restores at the same rate on a high and a low flame", () => {
    expect(tickSukma(40, "high", 1)).toBe(tickSukma(40, "low", 1));
  });
});

describe("range (Req 6.3)", () => {
  it("caps regeneration at SUKMA_MAX and drain at 0", () => {
    expect(tickSukma(SUKMA_MAX - 1, "high", 10)).toBe(SUKMA_MAX);
    expect(tickSukma(1, "off", 10)).toBe(0);
  });

  it("pulls out-of-range values back into 0..SUKMA_MAX", () => {
    expect(tickSukma(SUKMA_MAX + 50, "off", 0)).toBe(SUKMA_MAX);
    expect(tickSukma(-5, "off", 1)).toBe(0);
    expect(tickSukma(-5, "high", 1)).toBe(SUKMA_REGEN_LIT);
    expect(clampSukma(Number.POSITIVE_INFINITY)).toBe(SUKMA_MAX);
    expect(clampSukma(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("treats NaN as a full soul, so an unknown value can never end the run", () => {
    expect(clampSukma(Number.NaN)).toBe(SUKMA_MAX);
    expect(tickSukma(Number.NaN, "off", 1)).toBe(SUKMA_MAX - SUKMA_DRAIN_DARK);
    expect(distortionFrom(Number.NaN)).toBe(0);
    expect(nextSukmaLow(Number.NaN, true)).toBe(false);
  });

  it("treats negative, NaN and infinite dt as no time passing", () => {
    for (const dt of [-1, Number.NaN, Number.POSITIVE_INFINITY]) expect(tickSukma(50, "off", dt)).toBe(50);
  });
});

describe("soul lost (Req 6.4)", () => {
  it("a full soul in darkness reaches exactly 0 on the right tick, not one tick late", () => {
    const ticks = Math.round(SUKMA_MAX / SUKMA_DRAIN_DARK / DT);
    const almost = hold(SUKMA_MAX, "off", ticks - 1);
    expect(almost).toBeGreaterThan(0);
    expect(tickSukma(almost, "off", DT)).toBe(0);
  });
});

describe("distortionFrom (Req 6.5)", () => {
  it("is exactly 0 at and above DISTORTION_ONSET, so every effect fully switches off", () => {
    for (const s of [SUKMA_MAX, DISTORTION_ONSET + 0.5, DISTORTION_ONSET]) expect(distortionFrom(s)).toBe(0);
  });

  it("is exactly 1 at Sukma 0 and below", () => {
    expect(distortionFrom(0)).toBe(1);
    expect(distortionFrom(-5)).toBe(1);
  });

  it("follows smoothstep between them", () => {
    expect(distortionFrom(DISTORTION_ONSET / 2)).toBeCloseTo(0.5, 12);
    expect(distortionFrom(DISTORTION_ONSET / 4)).toBeCloseTo(0.84375, 12);
    expect(distortionFrom((DISTORTION_ONSET * 3) / 4)).toBeCloseTo(0.15625, 12);
  });

  it("grows as Sukma falls", () => {
    const levels = [DISTORTION_ONSET, 45, 30, 15, 0].map(distortionFrom);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1]);
  });

  it("eases in and out: one unit of Sukma from either end moves it far less than a straight ramp would", () => {
    const linearStep = 1 / DISTORTION_ONSET;
    expect(distortionFrom(DISTORTION_ONSET - 1)).toBeLessThan(linearStep / 10);
    expect(1 - distortionFrom(1)).toBeLessThan(linearStep / 10);
  });
});

describe("low Sukma (glossary; Req 6.6)", () => {
  it("becomes low only below SUKMA_LOW", () => {
    expect(nextSukmaLow(SUKMA_LOW - 0.01, false)).toBe(true);
    expect(nextSukmaLow(SUKMA_LOW, false)).toBe(false);
    expect(nextSukmaLow(0, false)).toBe(true);
  });

  it("stays low until Sukma is back at SUKMA_LOW_EXIT", () => {
    expect(nextSukmaLow((SUKMA_LOW + SUKMA_LOW_EXIT) / 2, true)).toBe(true);
    expect(nextSukmaLow(SUKMA_LOW_EXIT - 0.01, true)).toBe(true);
    expect(nextSukmaLow(SUKMA_LOW_EXIT, true)).toBe(false);
  });

  it("between the two thresholds keeps whatever it was", () => {
    expect(nextSukmaLow((SUKMA_LOW + SUKMA_LOW_EXIT) / 2, false)).toBe(false);
  });

  it("pulls out-of-range values into range first", () => {
    expect(nextSukmaLow(-5, false)).toBe(true);
    expect(nextSukmaLow(SUKMA_MAX + 50, true)).toBe(false);
  });
});

describe("what the player experiences (survival-crafting timing check)", () => {
  it("from a full soul, total darkness brings distortion, then the low warning, then soul lost, with time to react", () => {
    const onset = ticksUntil(SUKMA_MAX, "off", (s) => distortionFrom(s) > 0);
    const low = ticksUntil(SUKMA_MAX, "off", (s) => s < SUKMA_LOW);
    const lost = ticksUntil(SUKMA_MAX, "off", (s) => s === 0);

    expect(onset * DT).toBeCloseTo((SUKMA_MAX - DISTORTION_ONSET) / SUKMA_DRAIN_DARK, 1);
    expect(low * DT).toBeCloseTo((SUKMA_MAX - SUKMA_LOW) / SUKMA_DRAIN_DARK, 1);
    expect(lost).toBe(Math.round(SUKMA_MAX / SUKMA_DRAIN_DARK / DT));
    expect(onset).toBeLessThan(low);
    expect(
      (lost - low) * DT,
      `low-Sukma warning before the soul is lost; MIN_WARNING_SECONDS (${MIN_WARNING_SECONDS} s) is a fairness floor, see its comment before retuning`,
    ).toBeGreaterThanOrEqual(MIN_WARNING_SECONDS);
  });

  it("relighting the lamp brings every effect back to exactly rest within (DISTORTION_ONSET − Sukma) / SUKMA_REGEN_LIT", () => {
    const start = SUKMA_LOW - 0.5;
    const ticks = ticksUntil(start, "high", (s) => distortionFrom(s) === 0);
    expect(ticks * DT).toBeLessThanOrEqual((DISTORTION_ONSET - start) / SUKMA_REGEN_LIT + DT);
    const later = hold(start, "high", ticks + 600);
    expect(distortionFrom(later)).toBe(0);
    expect(nextSukmaLow(later, true)).toBe(false);
  });

  it("holding steady takes SUKMA_DRAIN_DARK / SUKMA_REGEN_LIT seconds of light per second of darkness", () => {
    // The ratio the floor-plan oil check (task 5.1) relies on: today 2 s lit for every 1 s dark.
    const litPerDarkSecond = SUKMA_DRAIN_DARK / SUKMA_REGEN_LIT;
    let s = 50;
    for (let cycle = 0; cycle < 20; cycle++) {
      s = tickSukma(s, "low", litPerDarkSecond);
      s = tickSukma(s, "off", 1);
    }
    expect(s).toBeCloseTo(50, 9);
  });
});
