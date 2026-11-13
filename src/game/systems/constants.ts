/**
 * Tuning constants for the pure game systems. Tests import these instead of repeating
 * numbers, so the balance pass (task 25) can change values without rewriting tests.
 */

// --- Geometry -------------------------------------------------------------

/**
 * Numerical tolerance for the geometric predicates: cross products (m²) in the orientation test,
 * metre tolerances in the bounding-box checks, and the near-zero checks for segment lengths and
 * ray/segment parallelism.
 */
export const GEOMETRY_EPSILON = 1e-9;

/** How far in front of the player the blencong (oil lamp) is held, in metres. */
export const LAMP_OFFSET = 0.4;

/**
 * Minimum clearance between the lamp and the centreline of any opaque segment, in metres.
 * The 3D layer must keep every wall's half-thickness below this, so the light never ends up
 * inside wall geometry.
 */
export const LAMP_WALL_MARGIN = 0.1;

/** Shortest the lamp's reach ever gets, in metres; only hit when a player stands on a wall (no collision). */
export const LAMP_MIN_REACH = 0.001;

/** Width of the player's body as a 2D occluder, in metres. It throws the shadow wedge behind the player. */
export const BODY_WIDTH = 0.5;
