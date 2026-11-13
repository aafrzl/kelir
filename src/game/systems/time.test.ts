import { describe, expect, it } from "vitest";
import { validDt } from "./time";

describe("validDt", () => {
  it("passes a positive, finite step through unchanged", () => {
    expect(validDt(1 / 60)).toBe(1 / 60);
    expect(validDt(30)).toBe(30);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "treats %s as no time passing",
    (dt) => {
      expect(validDt(dt)).toBe(0);
    },
  );
});
