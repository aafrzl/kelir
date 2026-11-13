/**
 * Sukma (soul): drains in darkness, recovers in lamplight, and sets the one `distortion` value that
 * every horror effect reads (post-processing, HUD ink bleed, gamelan detune). Also decides when
 * Sukma counts as "low". Pure and deterministic; time is game seconds.
 */
import {
  DISTORTION_ONSET,
  SUKMA_DRAIN_DARK,
  SUKMA_EPSILON,
  SUKMA_LOW,
  SUKMA_LOW_EXIT,
  SUKMA_MAX,
  SUKMA_REGEN_LIT,
} from "./constants";
import { validDt } from "./time";
import type { LampState } from "./types";

/** Sukma pulled into 0..SUKMA_MAX. NaN counts as a full soul: an unknown value must never end the run. */
export function clampSukma(sukma: number): number {
  if (Number.isNaN(sukma)) return SUKMA_MAX;
  return Math.min(SUKMA_MAX, Math.max(0, sukma));
}

/**
 * Advance Sukma by `dt` game seconds (Req 6.1–6.3): darkness drains SUKMA_DRAIN_DARK per second and a
 * lit lamp, high or low, restores SUKMA_REGEN_LIT per second. Remainders below SUKMA_EPSILON snap to
 * exactly 0, so the soul is lost (Req 6.4) on the tick it runs out, never one tick late.
 */
export function tickSukma(sukma: number, lamp: LampState, dt: number): number {
  const rate = lamp === "off" ? -SUKMA_DRAIN_DARK : SUKMA_REGEN_LIT;
  const next = clampSukma(clampSukma(sukma) + rate * validDt(dt));
  return next < SUKMA_EPSILON ? 0 : next;
}

/**
 * Distortion strength, 0..1, for a Sukma value (Req 6.5): exactly 0 at and above DISTORTION_ONSET,
 * then easing up along smoothstep to exactly 1 at Sukma 0. Smoothstep starts and ends gently, and its
 * slope never exceeds 1.5 / DISTORTION_ONSET per unit of Sukma, so effects that follow it ramp over
 * seconds and can never jump or flash.
 */
export function distortionFrom(sukma: number): number {
  const t = clampSukma(sukma) / DISTORTION_ONSET;
  if (t >= 1) return 0;
  const eased = t * t * (3 - 2 * t);
  return Math.min(1, Math.max(0, 1 - eased));
}

/**
 * Whether Sukma is low this tick, given whether it was low last tick. Low Sukma starts below
 * SUKMA_LOW and clears only at SUKMA_LOW_EXIT or above. The gap is hysteresis: a soul hovering at the
 * threshold never makes the meter's shape or the reduced-motion text flicker (Req 6.6).
 */
export function nextSukmaLow(sukma: number, wasLow: boolean): boolean {
  const s = clampSukma(sukma);
  if (s < SUKMA_LOW) return true;
  if (s >= SUKMA_LOW_EXIT) return false;
  return wasLow;
}
