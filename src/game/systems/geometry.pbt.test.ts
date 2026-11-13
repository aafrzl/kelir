import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BODY_WIDTH, LAMP_MIN_REACH, LAMP_OFFSET, LAMP_WALL_MARGIN } from "./constants";
import {
  bodyOccluder,
  distance,
  distanceToSegment,
  isOccluded,
  lampPosition,
  segmentsIntersect,
} from "./geometry";
import type { Vec2, Wall } from "./types";

// House-scale coordinates: the joglo floor plan fits well inside ±50 m.
const coord = fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true });
const point: fc.Arbitrary<Vec2> = fc.record({ x: coord, y: coord });
const wall: fc.Arbitrary<Wall> = fc.record({ a: point, b: point });
const walls = fc.array(wall, { maxLength: 8 });
const facing: fc.Arbitrary<Vec2> = point.filter((f) => Math.hypot(f.x, f.y) > 1e-3);

/**
 * A player, a facing, and walls placed where the lamp's pull-back actually matters: crossing,
 * collinear with or grazing the facing ray 1–60 cm ahead, or meeting at a corner there.
 */
const playerWithNearbyWalls = fc
  .tuple(point, facing, fc.array(wall, { maxLength: 3 }))
  .chain(([player, dir, farWalls]) => {
    const length = Math.hypot(dir.x, dir.y);
    const u = { x: dir.x / length, y: dir.y / length };
    const at = (t: number, side: number): Vec2 => ({
      x: player.x + u.x * t - u.y * side,
      y: player.y + u.y * t + u.x * side,
    });
    const ahead = fc.double({ min: 0.01, max: 0.6, noNaN: true });
    const side = fc.oneof(fc.constant(0), fc.double({ min: -0.15, max: 0.15, noNaN: true }));
    const angle = fc.oneof(fc.constant(0), fc.constant(Math.PI / 2), fc.double({ min: 0, max: Math.PI, noNaN: true }));
    const halfLength = fc.double({ min: 0.05, max: 3, noNaN: true });
    const nearWall = fc.tuple(ahead, side, angle, halfLength).map(([t, s, a, h]): Wall[] => {
      const centre = at(t, s);
      const d = { x: Math.cos(a) * u.x - Math.sin(a) * u.y, y: Math.sin(a) * u.x + Math.cos(a) * u.y };
      return [{ a: { x: centre.x - d.x * h, y: centre.y - d.y * h }, b: { x: centre.x + d.x * h, y: centre.y + d.y * h } }];
    });
    const corner = fc.tuple(ahead, side, angle, angle, halfLength).map(([t, s, a1, a2, h]): Wall[] => {
      const c = at(t, s);
      const end = (a: number): Vec2 => ({
        x: c.x + (Math.cos(a) * u.x - Math.sin(a) * u.y) * h * 2,
        y: c.y + (Math.sin(a) * u.x + Math.cos(a) * u.y) * h * 2,
      });
      return [{ a: c, b: end(a1) }, { a: c, b: end(a2 + Math.PI) }];
    });
    return fc
      .array(fc.oneof(nearWall, corner), { minLength: 1, maxLength: 3 })
      .map((groups) => ({ player, dir, walls: [...farWalls, ...groups.flat()] }));
  });

describe("geometry properties", () => {
  it("segmentsIntersect is symmetric in its two segments (design.md, Req 5.1)", () => {
    fc.assert(
      fc.property(point, point, point, point, (p1, p2, q1, q2) => {
        expect(segmentsIntersect(p1, p2, q1, q2)).toBe(segmentsIntersect(q1, q2, p1, p2));
      }),
      { numRuns: 1000 },
    );
  });

  it("segmentsIntersect ignores the direction of either segment", () => {
    fc.assert(
      fc.property(point, point, point, point, (p1, p2, q1, q2) => {
        const forward = segmentsIntersect(p1, p2, q1, q2);
        expect(segmentsIntersect(p2, p1, q1, q2)).toBe(forward);
        expect(segmentsIntersect(p1, p2, q2, q1)).toBe(forward);
      }),
      { numRuns: 1000 },
    );
  });

  it("isOccluded is symmetric: blocked from A to B iff blocked from B to A", () => {
    fc.assert(
      fc.property(point, point, walls, (a, b, ws) => {
        expect(isOccluded(a, b, ws)).toBe(isOccluded(b, a, ws));
      }),
    );
  });

  it("isOccluded detects a wall built across the line of sight", () => {
    fc.assert(
      fc.property(point, point, fc.double({ min: 0.05, max: 10, noNaN: true }), (a, b, halfLength) => {
        const length = distance(a, b);
        fc.pre(length > 0.1);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
        const across: Wall = {
          a: { x: mid.x + normal.x * halfLength, y: mid.y + normal.y * halfLength },
          b: { x: mid.x - normal.x * halfLength, y: mid.y - normal.y * halfLength },
        };
        expect(isOccluded(a, b, [across])).toBe(true);
      }),
    );
  });

  it("distance is non-negative, symmetric and obeys the triangle inequality", () => {
    fc.assert(
      fc.property(point, point, point, (a, b, c) => {
        expect(distance(a, b)).toBeGreaterThanOrEqual(0);
        expect(distance(a, b)).toBe(distance(b, a));
        expect(distance(a, c)).toBeLessThanOrEqual(distance(a, b) + distance(b, c) + 1e-9);
      }),
    );
  });

  it("the lamp is never further than LAMP_OFFSET and never on the far side of a wall", () => {
    fc.assert(
      fc.property(playerWithNearbyWalls, ({ player, dir, walls: ws }) => {
        // Collision keeps the player's centre clear of walls; mirror that precondition.
        fc.pre(ws.every((w) => distanceToSegment(player, w) > 0.01));
        const lamp = lampPosition(player, dir, ws);
        expect(distance(player, lamp)).toBeLessThanOrEqual(LAMP_OFFSET + 1e-9);
        expect(distance(player, lamp)).toBeGreaterThan(0);
        expect(isOccluded(player, lamp, ws)).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  it("with the player clear of every wall, the lamp keeps LAMP_WALL_MARGIN from every wall", () => {
    fc.assert(
      fc.property(playerWithNearbyWalls, ({ player, dir, walls: ws }) => {
        // The minimum reach can push the lamp up to LAMP_MIN_REACH into the margin, so require that much extra.
        fc.pre(ws.every((w) => distanceToSegment(player, w) >= LAMP_WALL_MARGIN + LAMP_MIN_REACH));
        const lamp = lampPosition(player, dir, ws);
        for (const w of ws) expect(distanceToSegment(lamp, w)).toBeGreaterThanOrEqual(LAMP_WALL_MARGIN - 1e-9);
      }),
      { numRuns: 300 },
    );
  });

  it("closer than the margin, the lamp keeps half the player's clearance from each wall", () => {
    fc.assert(
      fc.property(playerWithNearbyWalls, ({ player, dir, walls: ws }) => {
        fc.pre(ws.every((w) => distanceToSegment(player, w) > 2 * LAMP_MIN_REACH));
        const lamp = lampPosition(player, dir, ws);
        for (const w of ws) {
          const keep = Math.min(LAMP_WALL_MARGIN, distanceToSegment(player, w) / 2);
          expect(distanceToSegment(lamp, w)).toBeGreaterThanOrEqual(keep - LAMP_MIN_REACH - 1e-9);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("the lamp also stays legal among random far-away walls", () => {
    fc.assert(
      fc.property(point, facing, walls, (player, dir, ws) => {
        fc.pre(ws.every((w) => distanceToSegment(player, w) > 0.01));
        const lamp = lampPosition(player, dir, ws);
        expect(distance(player, lamp)).toBeLessThanOrEqual(LAMP_OFFSET + 1e-9);
        expect(isOccluded(player, lamp, ws)).toBe(false);
      }),
    );
  });

  it("the body occluder is BODY_WIDTH long, centred on the player, perpendicular to facing", () => {
    fc.assert(
      fc.property(point, facing, (player, dir) => {
        const body = bodyOccluder(player, dir);
        const along = { x: body.b.x - body.a.x, y: body.b.y - body.a.y };
        const unitFacing = Math.hypot(dir.x, dir.y);
        expect(distance(body.a, body.b)).toBeCloseTo(BODY_WIDTH, 9);
        expect((body.a.x + body.b.x) / 2).toBeCloseTo(player.x, 9);
        expect((body.a.y + body.b.y) / 2).toBeCloseTo(player.y, 9);
        expect((along.x * dir.x + along.y * dir.y) / unitFacing).toBeCloseTo(0, 9);
      }),
    );
  });

  it("the lamp sits in front of the body, so the body never shadows the lamp itself", () => {
    fc.assert(
      fc.property(playerWithNearbyWalls, ({ player, dir, walls: ws }) => {
        fc.pre(ws.every((w) => distanceToSegment(player, w) > 0.01));
        const lamp = lampPosition(player, dir, ws);
        expect(distanceToSegment(lamp, bodyOccluder(player, dir))).toBeGreaterThan(0);
      }),
      { numRuns: 500 },
    );
  });
});
