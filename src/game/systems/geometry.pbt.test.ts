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

// House-scale coordinates: the joglo floor plan fits well inside ±50 m. `fc.double` samples evenly over
// representable doubles (~90% of raw values land within 1 mm of 0), so most coordinates sit on a 1 mm
// grid across the whole range; raw doubles stay in the mix for near-degenerate cases.
const coord = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: -50_000, max: 50_000 }).map((n) => n / 1000) },
  { weight: 1, arbitrary: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }) },
);
const point: fc.Arbitrary<Vec2> = fc.record({ x: coord, y: coord });
const wall: fc.Arbitrary<Wall> = fc.record({ a: point, b: point });
const walls = fc.array(wall, { maxLength: 8, size: "max" });
const facing: fc.Arbitrary<Vec2> = point.filter((f) => Math.hypot(f.x, f.y) > 1e-3);

/** A uniform value in [min, max] on a 1/1000 grid (fc.double would cluster at the low end). */
const uniform = (min: number, max: number) =>
  fc.integer({ min: Math.round(min * 1000), max: Math.round(max * 1000) }).map((n) => n / 1000);

/** Shortest distance between two segments: 0 when they touch or cross. */
function segmentDistance(p: Wall, q: Wall): number {
  if (segmentsIntersect(p.a, p.b, q.a, q.b)) return 0;
  return Math.min(distanceToSegment(p.a, q), distanceToSegment(p.b, q), distanceToSegment(q.a, p), distanceToSegment(q.b, p));
}

/**
 * A player, a facing, and walls placed where the lamp's pull-back actually matters: crossing,
 * collinear with or grazing the facing ray 1–60 cm ahead (or up to 1 m behind, where nothing
 * should pull the lamp back), or meeting at a corner there.
 */
const playerWithNearbyWalls = fc
  .tuple(point, facing, fc.array(wall, { maxLength: 3, size: "max" }))
  .chain(([player, dir, farWalls]) => {
    const length = Math.hypot(dir.x, dir.y);
    const u = { x: dir.x / length, y: dir.y / length };
    const at = (t: number, side: number): Vec2 => ({
      x: player.x + u.x * t - u.y * side,
      y: player.y + u.y * t + u.x * side,
    });
    const ahead = fc.oneof({ weight: 3, arbitrary: uniform(0.01, 0.6) }, { weight: 1, arbitrary: uniform(-1, -0.05) });
    const side = fc.oneof(fc.constant(0), uniform(-0.15, 0.15), fc.double({ min: -1e-6, max: 1e-6, noNaN: true }));
    const angle = fc.oneof(fc.constant(0), fc.constant(Math.PI / 2), uniform(0, Math.PI));
    const halfLength = uniform(0.05, 3);
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
      .array(fc.oneof(nearWall, corner), { minLength: 1, maxLength: 3, size: "max" })
      .map((groups) => ({ player, dir, walls: [...farWalls, ...groups.flat()] }));
  });

describe("geometry properties", () => {
  it("pulls the lamp back only when needed: if the full-reach path keeps clear of every wall's margin, the lamp is at LAMP_OFFSET", () => {
    const scene = fc.oneof(playerWithNearbyWalls, fc.record({ player: point, dir: facing, walls }));
    const coverage = { runs: 0, clearPath: 0 };
    fc.assert(
      fc.property(scene, ({ player, dir, walls: ws }) => {
        coverage.runs++;
        const length = Math.hypot(dir.x, dir.y);
        const path: Wall = {
          a: player,
          b: { x: player.x + (dir.x / length) * LAMP_OFFSET, y: player.y + (dir.y / length) * LAMP_OFFSET },
        };
        if (!ws.every((w) => segmentDistance(path, w) > LAMP_WALL_MARGIN + 1e-9)) return;
        coverage.clearPath++;
        expect(distance(player, lampPosition(player, dir, ws))).toBeCloseTo(LAMP_OFFSET, 9);
      }),
      { numRuns: 500 },
    );
    expect(coverage.clearPath / coverage.runs, "share of scenes with a clear path").toBeGreaterThan(0.15);
  });

  it("a pulled-back lamp stops exactly on the clearance boundary of the wall that stopped it, not short of it", () => {
    const coverage = { runs: 0, pulledBack: 0 };
    fc.assert(
      fc.property(playerWithNearbyWalls, ({ player, dir, walls: ws }) => {
        coverage.runs++;
        const lamp = lampPosition(player, dir, ws);
        const reach = distance(player, lamp);
        if (reach >= LAMP_OFFSET - 1e-9 || reach <= LAMP_MIN_REACH + 1e-9) return;
        coverage.pulledBack++;
        // The documented clearance rule: the full margin when the player is clear, else half the player's clearance.
        const keep = (w: Wall) => {
          const clearance = distanceToSegment(player, w);
          return clearance >= LAMP_WALL_MARGIN ? LAMP_WALL_MARGIN : clearance / 2;
        };
        const gaps = ws.map((w) => Math.abs(distanceToSegment(lamp, w) - keep(w)));
        expect(Math.min(...gaps), "gap to the nearest clearance boundary").toBeLessThanOrEqual(1e-6);
      }),
      { numRuns: 500 },
    );
    expect(coverage.pulledBack / coverage.runs, "share of scenes with a pulled-back lamp").toBeGreaterThan(0.2);
  });
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
