import { describe, expect, it } from "vitest";
import { BODY_WIDTH, LAMP_MIN_REACH, LAMP_OFFSET, LAMP_WALL_MARGIN } from "./constants";
import {
  bodyOccluder,
  distance,
  distanceToSegment,
  isOccluded,
  lampPosition,
  segmentsIntersect,
  toWorld,
} from "./geometry";
import type { Vec2, Wall } from "./types";

const v = (x: number, y: number): Vec2 => ({ x, y });
const wall = (ax: number, ay: number, bx: number, by: number): Wall => ({ a: v(ax, ay), b: v(bx, by) });

describe("segmentsIntersect", () => {
  it("detects a proper crossing", () => {
    expect(segmentsIntersect(v(0, 0), v(2, 2), v(0, 2), v(2, 0))).toBe(true);
  });

  it("rejects parallel segments", () => {
    expect(segmentsIntersect(v(0, 0), v(2, 0), v(0, 1), v(2, 1))).toBe(false);
  });

  it("counts an endpoint touching the other segment (T-junction)", () => {
    expect(segmentsIntersect(v(0, 0), v(2, 0), v(1, 0), v(1, 1))).toBe(true);
  });

  it("counts a shared endpoint", () => {
    expect(segmentsIntersect(v(0, 0), v(1, 0), v(1, 0), v(2, 5))).toBe(true);
  });

  it("counts collinear overlap but not collinear gaps", () => {
    expect(segmentsIntersect(v(0, 0), v(2, 0), v(1, 0), v(3, 0))).toBe(true);
    expect(segmentsIntersect(v(0, 0), v(1, 0), v(2, 0), v(3, 0))).toBe(false);
  });

  it("rejects a near miss past the end of a segment", () => {
    expect(segmentsIntersect(v(0, 0), v(1, 0), v(1.0001, -1), v(1.0001, 1))).toBe(false);
  });

  it("treats a zero-length segment as a point", () => {
    expect(segmentsIntersect(v(1, 0), v(1, 0), v(0, 0), v(2, 0))).toBe(true);
    expect(segmentsIntersect(v(1, 1), v(1, 1), v(0, 0), v(2, 0))).toBe(false);
  });
});

describe("isOccluded", () => {
  const walls = [wall(1, -1, 1, 1)];

  it("is false with no occluders", () => {
    expect(isOccluded(v(0, 0), v(5, 0), [])).toBe(false);
  });

  it("is true when a wall lies between the two points", () => {
    expect(isOccluded(v(0, 0), v(2, 0), walls)).toBe(true);
  });

  it("is false when the wall is off to the side", () => {
    expect(isOccluded(v(0, 2), v(2, 2), walls)).toBe(false);
  });

  it("counts a target that sits exactly on a wall as occluded", () => {
    expect(isOccluded(v(0, 0), v(1, 0), walls)).toBe(true);
  });
});

describe("distance and distanceToSegment", () => {
  it("measures a 3-4-5 triangle", () => {
    expect(distance(v(0, 0), v(3, 4))).toBe(5);
  });

  it("measures perpendicular distance when the point projects onto the segment", () => {
    expect(distanceToSegment(v(1, 2), wall(0, 0, 2, 0))).toBeCloseTo(2, 12);
  });

  it("measures to the nearest endpoint when the point projects past it", () => {
    expect(distanceToSegment(v(5, 4), wall(0, 0, 2, 0))).toBeCloseTo(5, 12);
  });

  it("handles a zero-length segment", () => {
    expect(distanceToSegment(v(3, 4), wall(0, 0, 0, 0))).toBe(5);
  });
});

describe("lampPosition", () => {
  it("holds the lamp LAMP_OFFSET in front of the player, whatever the facing vector's length", () => {
    const lamp = lampPosition(v(1, 1), v(0, 2), []);
    expect(lamp.x).toBeCloseTo(1, 12);
    expect(lamp.y).toBeCloseTo(1 + LAMP_OFFSET, 12);
  });

  it("stops LAMP_WALL_MARGIN short of a wall ahead", () => {
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(0.3, -1, 0.3, 1)]);
    expect(lamp.x).toBeCloseTo(0.3 - LAMP_WALL_MARGIN, 12);
    expect(lamp.y).toBeCloseTo(0, 12);
  });

  it("stops at the nearest of several walls ahead", () => {
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(0.35, -1, 0.35, 1), wall(0.2, -1, 0.2, 1)]);
    expect(lamp.x).toBeCloseTo(0.2 - LAMP_WALL_MARGIN, 12);
  });

  it("stops at a wall that lies along the lamp's path", () => {
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(0.25, 0, 3, 0)]);
    expect(lamp.x).toBeCloseTo(0.25 - LAMP_WALL_MARGIN, 12);
  });

  it("keeps clearance from a wall it would only graze, measured at right angles", () => {
    // Wall parallel to the facing ray, 6 cm to the side: the ray never hits it, but a lamp at
    // full reach would sit inside the wall's 3D thickness. It stops at the wall end's clearance circle.
    const grazed = wall(0.2, 0.06, 3, 0.06);
    const lamp = lampPosition(v(0, 0), v(1, 0), [grazed]);
    expect(lamp.x).toBeCloseTo(0.2 - Math.sqrt(LAMP_WALL_MARGIN ** 2 - 0.06 ** 2), 9);
    expect(distanceToSegment(lamp, grazed)).toBeCloseTo(LAMP_WALL_MARGIN, 9);
  });

  it("keeps clearance from both walls at a corner the ray points into", () => {
    const walls = [wall(0.3, -1, 0.3, 0.3), wall(0.3, 0.3, -1, 0.3)];
    const lamp = lampPosition(v(0, 0), v(1, 1), walls);
    for (const w of walls) expect(distanceToSegment(lamp, w)).toBeGreaterThanOrEqual(LAMP_WALL_MARGIN - 1e-9);
  });

  it("stops at a wall when the player is exactly LAMP_WALL_MARGIN from it (rounding puts the entry a hair behind)", () => {
    // Shrunk counterexample from the property tests: the capsule entry came out as about -5e-18 and
    // the wall was skipped, so the lamp landed 0.3 m beyond it.
    const player = v(-0.006, -4.348);
    const walls = [wall(0.094, -10, 0.094, 10), wall(0.094, -4.4, 0.094, -4.3), wall(0.094, -4.348, 0.094, 0)];
    for (const w of walls) {
      const lamp = lampPosition(player, v(1, 0), [w]);
      expect(isOccluded(player, lamp, [w])).toBe(false);
      expect(lamp.x).toBeLessThan(0.094);
    }
  });

  it("does not pull back for a wall end it is leaving, even from exactly LAMP_WALL_MARGIN away", () => {
    // On the boundary of the clearance circle around the wall's end, facing almost along the tangent
    // but away from it: nothing is ahead, so the lamp keeps its full reach.
    const lamp = lampPosition(v(0, 0.1), v(Math.cos(1e-9), Math.sin(1e-9)), [wall(0, 0, 0, -1)]);
    expect(distance(v(0, 0.1), lamp)).toBeCloseTo(LAMP_OFFSET, 9);
  });

  it("keeps half its clearance from a wall the player is already inside the margin of", () => {
    // Only reachable without collision (e.g. the 2D dev page). The lamp stays on the player's side
    // of the wall unless the player is within LAMP_MIN_REACH of it.
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(0.06, -1, 0.06, 1)]);
    expect(lamp.x).toBeCloseTo(0.03, 12);
    expect(lamp.y).toBeCloseTo(0, 12);
  });

  it("never collapses onto the player, even standing on a wall", () => {
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(0, -1, 0, 1)]);
    expect(lamp.x).toBeCloseTo(LAMP_MIN_REACH, 12);
  });

  it("ignores walls behind the player", () => {
    const lamp = lampPosition(v(0, 0), v(1, 0), [wall(-0.15, -1, -0.15, 1)]);
    expect(lamp.x).toBeCloseTo(LAMP_OFFSET, 12);
  });

  it("falls back to +y when the facing vector has no length", () => {
    const lamp = lampPosition(v(0, 0), v(0, 0), []);
    expect(lamp.x).toBeCloseTo(0, 12);
    expect(lamp.y).toBeCloseTo(LAMP_OFFSET, 12);
  });
});

describe("bodyOccluder", () => {
  it("is a BODY_WIDTH segment centred on the player, perpendicular to facing", () => {
    const body = bodyOccluder(v(0, 0), v(0, 3));
    expect(distance(body.a, body.b)).toBeCloseTo(BODY_WIDTH, 12);
    expect((body.a.x + body.b.x) / 2).toBeCloseTo(0, 12);
    expect((body.a.y + body.b.y) / 2).toBeCloseTo(0, 12);
    expect(body.a.y).toBeCloseTo(0, 12);
    expect(body.b.y).toBeCloseTo(0, 12);
  });

  it("casts the player's shadow behind them and nowhere in front", () => {
    const player = v(0, 0);
    const facing = v(0, 1);
    const lamp = lampPosition(player, facing, []);
    const body = [bodyOccluder(player, facing)];
    expect(isOccluded(lamp, v(0, -2), body)).toBe(true);
    expect(isOccluded(lamp, v(0.3, -3), body)).toBe(true);
    expect(isOccluded(lamp, v(0, 2), body)).toBe(false);
    expect(isOccluded(lamp, v(5, 0), body)).toBe(false);
  });
});

describe("toWorld", () => {
  it("maps 2D y to three.js z", () => {
    expect(toWorld(v(2, 3), 1.5)).toEqual([2, 1.5, 3]);
    expect(toWorld(v(-1, 4))).toEqual([-1, 0, 4]);
  });
});
