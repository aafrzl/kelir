/**
 * Tuning constants for the pure game systems. Tests import these instead of repeating
 * numbers, so the balance pass (task 25) can change values without rewriting tests.
 */
import type { LampState } from "./types";

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

// --- Time ------------------------------------------------------------------

/** Countdown remainders below this many seconds snap to 0, so fixed-step float drift never adds a tick. */
export const TIME_EPSILON = 1e-6;

// --- Oil: the blencong's fuel (Requirement 4) ---------------------------------

/** Tank capacity. Oil always stays within 0..OIL_MAX. */
export const OIL_MAX = 100;

/** Oil remainders below this snap to exactly 0, so an empty lamp goes out on the tick it runs dry. */
export const OIL_EPSILON = 1e-9;

/** Oil at the start of a run: a full tank (Req 4.8). */
export const OIL_START = OIL_MAX;

/** Flame at the start of a run (Req 4.8). */
export const LAMP_START: LampState = "high";

/** The "oil low" cue plays when oil falls to this or below, once per downward crossing (Req 4.9). */
export const OIL_LOW = 20;

/** Oil burned per second of game time in each lamp state (Req 4.2). */
export const OIL_DRAIN: Readonly<Record<LampState, number>> = { high: 1.0, low: 0.5, off: 0 };

/** Oil one jar adds, capped at OIL_MAX (Req 4.5). */
export const OIL_JAR_AMOUNT = 40;

/** Oil the refillable source in the pawon (kitchen) adds, capped at OIL_MAX (Req 4.10). */
export const OIL_SOURCE_AMOUNT = 40;

/** Game seconds before the pawon oil source can be used again (Req 4.10). */
export const OIL_SOURCE_COOLDOWN = 90;

// --- Sukma: the player's soul (Requirement 6) ---------------------------------

/** Sukma (soul) capacity. Sukma always stays within 0..SUKMA_MAX. */
export const SUKMA_MAX = 100;

/** Sukma at the start of a run and after every restore (Req 6.7, 11.4). */
export const SUKMA_START = SUKMA_MAX;

/** Sukma remainders below this snap to exactly 0, so the soul is lost on the tick it runs out. */
export const SUKMA_EPSILON = 1e-9;

/** Sukma lost per second of game time while the lamp is off (Req 6.1). */
export const SUKMA_DRAIN_DARK = 4;

/** Sukma regained per second of game time while the lamp is lit, high or low (Req 6.2). */
export const SUKMA_REGEN_LIT = 2;

/** Sukma at and above which there is no distortion; below it, distortion eases up to 1 at Sukma 0 (Req 6.5). */
export const DISTORTION_ONSET = 60;

/** Sukma becomes "low" below this: the meter's shape change and the reduced-motion text (Req 6.6). */
export const SUKMA_LOW = 30;

/** Low Sukma clears only once Sukma is back at or above this, so the cue never flickers at the threshold. */
export const SUKMA_LOW_EXIT = 35;
