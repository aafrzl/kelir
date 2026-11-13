/**
 * 2D geometry for the floor plan: segment intersection, line-of-sight occlusion,
 * the lamp's position and the player's body occluder. Pure and deterministic.
 */
import { BODY_WIDTH, GEOMETRY_EPSILON as EPS, LAMP_MIN_REACH, LAMP_OFFSET, LAMP_WALL_MARGIN } from "./constants";
import type { Vec2, Wall } from "./types";

const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const SIDES = [1, -1] as const;

/** Unit vector for `facing`; a zero-length facing falls back to +y so callers never get NaN. */
function unit(facing: Vec2): Vec2 {
  const length = Math.hypot(facing.x, facing.y);
  return length > EPS ? { x: facing.x / length, y: facing.y / length } : { x: 0, y: 1 };
}

/** Side of `c` relative to the directed line a→b: 1 left, -1 right, 0 collinear (within tolerance). */
function orientation(a: Vec2, b: Vec2, c: Vec2): -1 | 0 | 1 {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (value > EPS) return 1;
  if (value < -EPS) return -1;
  return 0;
}

/** For `c` collinear with a–b: is it inside the segment's bounding box? */
function withinBounds(a: Vec2, b: Vec2, c: Vec2): boolean {
  return (
    c.x >= Math.min(a.x, b.x) - EPS &&
    c.x <= Math.max(a.x, b.x) + EPS &&
    c.y >= Math.min(a.y, b.y) - EPS &&
    c.y <= Math.max(a.y, b.y) + EPS
  );
}

/**
 * Do segments p1–p2 and q1–q2 share at least one point? Proper crossings, T-junctions,
 * shared endpoints and collinear overlaps all count. A zero-length segment acts as a point.
 */
export function segmentsIntersect(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && withinBounds(p1, p2, q1)) ||
    (o2 === 0 && withinBounds(p1, p2, q2)) ||
    (o3 === 0 && withinBounds(q1, q2, p1)) ||
    (o4 === 0 && withinBounds(q1, q2, p2))
  );
}

/** Cheap reject: the two segments' bounding boxes do not overlap. */
function boxesApart(p1: Vec2, p2: Vec2, w: Wall): boolean {
  return (
    Math.max(p1.x, p2.x) < Math.min(w.a.x, w.b.x) - EPS ||
    Math.min(p1.x, p2.x) > Math.max(w.a.x, w.b.x) + EPS ||
    Math.max(p1.y, p2.y) < Math.min(w.a.y, w.b.y) - EPS ||
    Math.min(p1.y, p2.y) > Math.max(w.a.y, w.b.y) + EPS
  );
}

/**
 * Is the straight line from `from` to `to` blocked by any segment? A point lying exactly on a
 * segment counts as blocked, and so does a line that grazes a segment's endpoint.
 */
export function isOccluded(from: Vec2, to: Vec2, segments: readonly Wall[]): boolean {
  for (const w of segments) {
    if (!boxesApart(from, to, w) && segmentsIntersect(from, to, w.a, w.b)) return true;
  }
  return false;
}

/** Euclidean distance in metres. */
export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Shortest distance from point `p` to segment `w`, in metres. */
export function distanceToSegment(p: Vec2, w: Wall): number {
  const edge = sub(w.b, w.a);
  const lengthSquared = dot(edge, edge);
  if (lengthSquared <= EPS) return distance(p, w.a);
  const t = Math.min(1, Math.max(0, dot(sub(p, w.a), edge) / lengthSquared));
  return distance(p, { x: w.a.x + edge.x * t, y: w.a.y + edge.y * t });
}

/** Entry distance of the ray into the disc of radius `r` around `c`, or ∞. Ignores discs behind or being left. */
function rayCircleEntry(origin: Vec2, dir: Vec2, c: Vec2, r: number): number {
  const fx = origin.x - c.x;
  const fy = origin.y - c.y;
  const b = fx * dir.x + fy * dir.y;
  const disc = b * b - (fx * fx + fy * fy - r * r);
  if (disc < 0) return Number.POSITIVE_INFINITY;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Number.POSITIVE_INFINITY;
}

/**
 * Distance along the ray at which it first comes within `r` of segment `w` (entry into the
 * capsule of radius `r` around it), or ∞. Assumes `origin` starts at least `r` away.
 */
function rayCapsuleEntry(origin: Vec2, dir: Vec2, w: Wall, r: number): number {
  let best = Math.min(rayCircleEntry(origin, dir, w.a, r), rayCircleEntry(origin, dir, w.b, r));
  const ex = w.b.x - w.a.x;
  const ey = w.b.y - w.a.y;
  const length = Math.hypot(ex, ey);
  if (length <= EPS) return best;
  const ux = ex / length;
  const uy = ey / length;
  for (const side of SIDES) {
    // This side of the capsule is the segment shifted by r along its outward normal.
    const nx = -uy * side;
    const ny = ux * side;
    const approach = dir.x * nx + dir.y * ny;
    if (approach >= -EPS) continue; // parallel to, or moving away from, this side
    const t = ((w.a.x + nx * r - origin.x) * nx + (w.a.y + ny * r - origin.y) * ny) / approach;
    if (t < 0 || t >= best) continue;
    const along = (origin.x + dir.x * t - w.a.x) * ux + (origin.y + dir.y * t - w.a.y) * uy;
    if (along >= 0 && along <= length) best = t;
  }
  return best;
}

/** Cheap reject: `p` is further than `reach` from `w`'s bounding box. */
function outOfReach(p: Vec2, w: Wall, reach: number): boolean {
  return (
    p.x < Math.min(w.a.x, w.b.x) - reach ||
    p.x > Math.max(w.a.x, w.b.x) + reach ||
    p.y < Math.min(w.a.y, w.b.y) - reach ||
    p.y > Math.max(w.a.y, w.b.y) + reach
  );
}

/**
 * Where the blencong (oil lamp) is: LAMP_OFFSET in front of the player, pulled back so it keeps
 * LAMP_WALL_MARGIN of clearance from every opaque segment's centreline, measured at right angles.
 * It therefore never shines from the far side of a wall, nor from inside a wall's 3D thickness.
 * If the player is already closer than the margin to a wall (collision normally prevents this),
 * the lamp keeps half the player's own clearance from that wall instead. One exception, only
 * possible without collision (e.g. the 2D dev page): a player less than LAMP_MIN_REACH from a
 * wall can have the lamp pushed past it by the minimum-reach clamp.
 * Pass every opaque segment except the player's body.
 */
export function lampPosition(player: Vec2, facing: Vec2, walls: readonly Wall[]): Vec2 {
  const dir = unit(facing);
  let reach = LAMP_OFFSET;
  for (const w of walls) {
    if (outOfReach(player, w, LAMP_OFFSET + LAMP_WALL_MARGIN)) continue;
    const clearance = distanceToSegment(player, w);
    const keep = clearance >= LAMP_WALL_MARGIN ? LAMP_WALL_MARGIN : clearance / 2;
    reach = Math.min(reach, rayCapsuleEntry(player, dir, w, keep));
  }
  reach = Math.max(reach, LAMP_MIN_REACH);
  return { x: player.x + dir.x * reach, y: player.y + dir.y * reach };
}

/**
 * The player's body as an occluder: a BODY_WIDTH segment through the player, perpendicular to
 * `facing`. With the lamp held in front, it throws a shadow wedge behind the player.
 */
export function bodyOccluder(player: Vec2, facing: Vec2): Wall {
  const dir = unit(facing);
  const half = BODY_WIDTH / 2;
  const side = { x: -dir.y * half, y: dir.x * half };
  return {
    a: { x: player.x + side.x, y: player.y + side.y },
    b: { x: player.x - side.x, y: player.y - side.y },
  };
}

/** The one 2D → 3D mapping: floor-plan (x, y) becomes three.js [x, height, z = y]. */
export function toWorld(v: Vec2, height = 0): [number, number, number] {
  return [v.x, height, v.y];
}
