import { describe, expect, it } from "vitest";
import {
  LAMP_START,
  OIL_DRAIN,
  OIL_EPSILON,
  OIL_JAR_AMOUNT,
  OIL_LOW,
  OIL_MAX,
  OIL_SOURCE_AMOUNT,
  OIL_SOURCE_COOLDOWN,
  OIL_START,
} from "./constants";
import { addOil, clampOil, collectJar, cycleLamp, drawFromOilSource, tickOil, tickOilSource } from "./oil";
import type { LampState } from "./types";

/** The fixed logic step (design.md: 60 Hz). */
const DT = 1 / 60;

/** Tick oil at the fixed step for `seconds` of game time, counting "oil low" cues. */
function burn(oil: number, lamp: LampState, seconds: number) {
  let state = { oil, lamp, lowCues: 0 };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const next = tickOil(state.oil, state.lamp, DT);
    state = { oil: next.oil, lamp: next.lamp, lowCues: state.lowCues + (next.crossedLow ? 1 : 0) };
  }
  return state;
}

describe("start of a run (Req 4.8)", () => {
  it("starts with a full tank and the flame on high", () => {
    expect(OIL_START).toBe(OIL_MAX);
    expect(LAMP_START).toBe("high");
  });
});

describe("cycleLamp (Req 4.1, 4.4)", () => {
  it("cycles high → low → off → high while there is oil", () => {
    expect(cycleLamp("high", 50)).toBe("low");
    expect(cycleLamp("low", 50)).toBe("off");
    expect(cycleLamp("off", 50)).toBe("high");
  });

  it("cannot light an empty lamp", () => {
    expect(cycleLamp("off", 0)).toBe("off");
  });

  it("puts out a lamp that is lit with no oil", () => {
    expect(cycleLamp("high", 0)).toBe("off");
    expect(cycleLamp("low", 0)).toBe("off");
  });

  it("lights again as soon as there is any oil", () => {
    expect(cycleLamp("off", addOil(0))).toBe("high");
  });

  it("treats a remainder below OIL_EPSILON as empty, matching tickOil's snap", () => {
    expect(cycleLamp("off", OIL_EPSILON / 2)).toBe("off");
    expect(tickOil(OIL_EPSILON / 2, "off", 0).oil).toBe(0);
  });
});

describe("tickOil drain (Req 4.2, 4.3, 4.4)", () => {
  it("burns half as fast on low as on high, and nothing when off (product.md lamp table)", () => {
    expect(OIL_DRAIN.high).toBeGreaterThan(0);
    expect(OIL_DRAIN.low).toBe(OIL_DRAIN.high / 2);
    expect(OIL_DRAIN.off).toBe(0);
  });

  it.each(["high", "low", "off"] as const)("10 s at %s burns OIL_DRAIN × 10 at the 60 Hz step", (lamp) => {
    expect(burn(OIL_MAX, lamp, 10).oil).toBeCloseTo(OIL_MAX - OIL_DRAIN[lamp] * 10, 9);
  });

  it("stops at 0 and forces the lamp off when the oil runs out", () => {
    const dry = tickOil(OIL_DRAIN.high * 0.5, "high", 1);
    expect(dry.oil).toBe(0);
    expect(dry.lamp).toBe("off");
  });

  it.each(["high", "low"] as const)("a full tank on %s goes out on exactly the right tick, despite float drift", (lamp) => {
    const ticks = Math.round(OIL_MAX / OIL_DRAIN[lamp] / DT);
    const almost = burn(OIL_MAX, lamp, (ticks - 1) * DT);
    expect(almost.lamp).toBe(lamp);
    expect(almost.oil).toBeGreaterThan(0);
    const out = tickOil(almost.oil, almost.lamp, DT);
    expect(out).toMatchObject({ oil: 0, lamp: "off" });
  });

  it("keeps the flame while oil remains", () => {
    expect(tickOil(50, "low", DT).lamp).toBe("low");
  });

  it("treats negative or NaN dt as no time passing", () => {
    expect(tickOil(50, "high", -1).oil).toBe(50);
    expect(tickOil(50, "high", Number.NaN).oil).toBe(50);
  });

  it("pulls an out-of-range oil value back into 0..OIL_MAX", () => {
    expect(tickOil(OIL_MAX + 50, "off", DT).oil).toBe(OIL_MAX);
    expect(tickOil(-5, "high", DT)).toEqual({ oil: 0, lamp: "off", crossedLow: false });
    expect(tickOil(Number.NaN, "high", DT).oil).toBe(0);
    expect(clampOil(Number.POSITIVE_INFINITY)).toBe(OIL_MAX);
  });
});

describe("oil low cue (Req 4.9)", () => {
  it("fires once when oil falls past OIL_LOW", () => {
    expect(burn(OIL_LOW + 1, "high", 3).lowCues).toBe(1);
  });

  it("counts landing exactly on OIL_LOW as crossing", () => {
    expect(tickOil(OIL_LOW + 0.5, "high", 0.5 / OIL_DRAIN.high).crossedLow).toBe(true);
  });

  it("stays quiet while oil is already low", () => {
    expect(burn(OIL_LOW, "high", 5).lowCues).toBe(0);
    expect(burn(OIL_LOW - 1, "low", 5).lowCues).toBe(0);
  });

  it("fires again after a refill takes oil back above OIL_LOW", () => {
    const first = burn(OIL_LOW + 1, "high", 2);
    const refilled = addOil(first.oil, OIL_JAR_AMOUNT);
    expect(refilled).toBeGreaterThan(OIL_LOW);
    const second = burn(refilled, "high", refilled - OIL_LOW + 1);
    expect(first.lowCues + second.lowCues).toBe(2);
  });
});

describe("addOil and jars (Req 4.5)", () => {
  it("adds one jar's worth by default", () => {
    expect(addOil(10)).toBe(10 + OIL_JAR_AMOUNT);
  });

  it("caps at OIL_MAX", () => {
    expect(addOil(OIL_MAX - 5)).toBe(OIL_MAX);
  });

  it("never takes oil away", () => {
    expect(addOil(50, -10)).toBe(50);
    expect(addOil(50, Number.NaN)).toBe(50);
  });

  it("collects a jar: adds oil and removes the jar from the world", () => {
    expect(collectJar(30, [], "jar-pawon")).toEqual({
      oil: 30 + OIL_JAR_AMOUNT,
      jarsTaken: ["jar-pawon"],
      collected: true,
    });
  });

  it("cannot collect the same jar twice", () => {
    expect(collectJar(30, ["jar-pawon"], "jar-pawon")).toEqual({ oil: 30, jarsTaken: ["jar-pawon"], collected: false });
  });

  it("does not modify the jarsTaken list it was given", () => {
    const taken: string[] = ["jar-dalem"];
    collectJar(30, taken, "jar-gandok");
    expect(taken).toEqual(["jar-dalem"]);
  });
});

describe("pawon oil source (Req 4.10)", () => {
  it("adds OIL_SOURCE_AMOUNT and starts the cooldown", () => {
    expect(drawFromOilSource(10, 0)).toEqual({ oil: 10 + OIL_SOURCE_AMOUNT, cooldown: OIL_SOURCE_COOLDOWN, used: true });
  });

  it("caps the refill at OIL_MAX", () => {
    expect(drawFromOilSource(OIL_MAX - 1, 0).oil).toBe(OIL_MAX);
  });

  it("changes nothing while cooling down", () => {
    expect(drawFromOilSource(10, 0.01)).toEqual({ oil: 10, cooldown: 0.01, used: false });
  });

  it("is ready again after exactly OIL_SOURCE_COOLDOWN seconds at the 60 Hz step, not one tick early", () => {
    const ticks = Math.round(OIL_SOURCE_COOLDOWN / DT);
    let cooldown = drawFromOilSource(10, 0).cooldown;
    for (let i = 0; i < ticks - 1; i++) cooldown = tickOilSource(cooldown, DT);
    expect(cooldown).toBeGreaterThan(0);
    expect(drawFromOilSource(10, cooldown).used).toBe(false);
    cooldown = tickOilSource(cooldown, DT);
    expect(cooldown).toBe(0);
    expect(drawFromOilSource(10, cooldown).used).toBe(true);
  });

  it("is still cooling down with less than one tick left", () => {
    const cooldown = tickOilSource(2.5 * DT, 2 * DT);
    expect(cooldown).toBeCloseTo(0.5 * DT, 12);
    expect(drawFromOilSource(10, cooldown).used).toBe(false);
  });

  it("never counts below 0 and ignores negative or NaN dt", () => {
    expect(tickOilSource(1, 5)).toBe(0);
    expect(tickOilSource(30, -1)).toBe(30);
    expect(tickOilSource(30, Number.NaN)).toBe(30);
    expect(tickOilSource(Number.NaN, DT)).toBe(0);
  });
});
