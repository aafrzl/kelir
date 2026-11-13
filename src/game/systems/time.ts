/** Game-time helpers shared by the pure systems. Time is always game seconds. */

/** A usable time step: negative, NaN and infinite steps count as no time passing. */
export function validDt(dt: number): number {
  return Number.isFinite(dt) && dt > 0 ? dt : 0;
}
