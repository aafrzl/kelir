/**
 * Oil: fuel for the blencong (oil lamp). Drain per lamp state, the lamp cycle, oil jars and the
 * refillable oil source in the pawon (kitchen). Pure and deterministic; time is game seconds.
 */
import {
  OIL_DRAIN,
  OIL_EPSILON,
  OIL_JAR_AMOUNT,
  OIL_LOW,
  OIL_MAX,
  OIL_SOURCE_AMOUNT,
  OIL_SOURCE_COOLDOWN,
  TIME_EPSILON,
} from "./constants";
import type { LampState } from "./types";

/** A usable time step: negative, NaN and infinite steps count as no time passing. */
const validDt = (dt: number): number => (Number.isFinite(dt) && dt > 0 ? dt : 0);

/** Oil pulled into 0..OIL_MAX. NaN counts as an empty tank. */
export function clampOil(oil: number): number {
  if (Number.isNaN(oil)) return 0;
  return Math.min(OIL_MAX, Math.max(0, oil));
}

/** Seconds left on the oil source's cooldown, pulled into 0..OIL_SOURCE_COOLDOWN. */
function clampCooldown(cooldown: number): number {
  if (Number.isNaN(cooldown) || cooldown < TIME_EPSILON) return 0;
  return Math.min(OIL_SOURCE_COOLDOWN, cooldown);
}

const NEXT_LAMP: Readonly<Record<LampState, LampState>> = { high: "low", low: "off", off: "high" };

/**
 * The lamp key: high → low → off → high (Req 4.1). An empty lamp cannot be lit and a lit one goes
 * out (Req 4.4). "Empty" uses the same OIL_EPSILON threshold as `tickOil`, so a lamp is never lit
 * for a single tick on a remainder the next tick would snap to 0.
 */
export function cycleLamp(lamp: LampState, oil: number): LampState {
  return clampOil(oil) >= OIL_EPSILON ? NEXT_LAMP[lamp] : "off";
}

/**
 * Burn oil for `dt` game seconds (Req 4.2). Oil stays within 0..OIL_MAX (Req 4.3) and an empty lamp
 * is forced off (Req 4.4). `crossedLow` is true on the one tick that oil falls to OIL_LOW or below
 * from above it, which drives the "oil low" cue (Req 4.9).
 */
export function tickOil(oil: number, lamp: LampState, dt: number): { oil: number; lamp: LampState; crossedLow: boolean } {
  const before = clampOil(oil);
  const burnt = before - OIL_DRAIN[lamp] * validDt(dt);
  // Snap float drift to an exact 0 so an empty lamp goes out on the tick it runs dry.
  const after = burnt < OIL_EPSILON ? 0 : burnt;
  return {
    oil: after,
    lamp: after > 0 ? lamp : "off",
    crossedLow: before > OIL_LOW && after <= OIL_LOW,
  };
}

/** Add oil, capped at OIL_MAX (Req 4.5). Never takes oil away; defaults to one jar's worth. */
export function addOil(oil: number, amount: number = OIL_JAR_AMOUNT): number {
  const gain = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return clampOil(clampOil(oil) + gain);
}

/**
 * Collect an oil jar: add OIL_JAR_AMOUNT (capped) and mark the jar taken so it leaves the world and
 * is remembered by the checkpoint (Req 4.5, 11.5). A jar already taken changes nothing.
 */
export function collectJar(
  oil: number,
  jarsTaken: readonly string[],
  jarId: string,
): { oil: number; jarsTaken: readonly string[]; collected: boolean } {
  if (jarsTaken.includes(jarId)) return { oil: clampOil(oil), jarsTaken, collected: false };
  return { oil: addOil(oil, OIL_JAR_AMOUNT), jarsTaken: [...jarsTaken, jarId], collected: true };
}

/**
 * Draw from the refillable oil source in the pawon (Req 4.10): adds OIL_SOURCE_AMOUNT (capped) and
 * starts a cooldown of OIL_SOURCE_COOLDOWN seconds. While `cooldown` (seconds left) is above 0 it
 * changes nothing, and the prompt can show the seconds left.
 */
export function drawFromOilSource(oil: number, cooldown: number): { oil: number; cooldown: number; used: boolean } {
  const remaining = clampCooldown(cooldown);
  if (remaining > 0) return { oil: clampOil(oil), cooldown: remaining, used: false };
  return { oil: addOil(oil, OIL_SOURCE_AMOUNT), cooldown: OIL_SOURCE_COOLDOWN, used: true };
}

/** Count the oil source's cooldown down by `dt` game seconds, never below 0. */
export function tickOilSource(cooldown: number, dt: number): number {
  const remaining = clampCooldown(cooldown) - validDt(dt);
  return remaining < TIME_EPSILON ? 0 : remaining;
}
