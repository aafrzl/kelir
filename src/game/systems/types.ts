/** Shared value types for the pure game systems. All distances are metres on the 2D floor plan. */

/** A point or direction on the floor plan. 2D `y` maps to three.js `z` (see `toWorld`). */
export type Vec2 = Readonly<{ x: number; y: number }>;

/** A line segment that can block the lamp's light: a wall, door, pillar side, furniture edge or the player's body. */
export type Wall = Readonly<{ a: Vec2; b: Vec2 }>;
