/** Colour-contrast helpers (WCAG 2.2) for checking design tokens and dimmed HUD states. */

type Triple = readonly [number, number, number];

/** Build a three-channel tuple from a per-channel function. */
const map3 = (f: (i: 0 | 1 | 2) => number): Triple => [f(0), f(1), f(2)];

/** Parse `#RRGGBB` into 0–255 channels. Throws on anything else. */
export function parseHex(hex: string): Triple {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Expected #RRGGBB, got "${hex}"`);
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Triple): string {
  const channel = (c: number) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0");
  return `#${rgb.map(channel).join("")}`.toUpperCase();
}

const toLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toGamma = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colours, 1 to 21. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The opaque colour painted for `fg` at `alpha` over `bg` (Tailwind's `bg-x/80`). */
export function alphaOver(fg: string, bg: string, alpha: number): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return toHex(map3((i) => alpha * f[i] + (1 - alpha) * b[i]));
}

function toOklab(hex: string): Triple {
  const [r, g, b] = parseHex(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, A, B]: Triple): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const linear: Triple = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return toHex(map3((i) => Math.min(1, Math.max(0, toGamma(linear[i]))) * 255));
}

/** CSS `color-mix(in oklab, a weightA, b)` for two opaque colours. */
export function mixOklab(a: string, b: string, weightA: number): string {
  const la = toOklab(a);
  const lb = toOklab(b);
  return fromOklab(map3((i) => weightA * la[i] + (1 - weightA) * lb[i]));
}

/** CSS `color-mix(in oklch, a weightA, b)`: hue takes the shorter arc; an achromatic side adopts the other's hue. */
export function mixOklch(a: string, b: string, weightA: number): string {
  const ACHROMATIC = 1e-4;
  const toLch = (hex: string): Triple => {
    const [L, A, B] = toOklab(hex);
    return [L, Math.hypot(A, B), Math.atan2(B, A)];
  };
  const [la, ca, ha0] = toLch(a);
  const [lb, cb, hb0] = toLch(b);
  const ha = ca < ACHROMATIC ? hb0 : ha0;
  const hb = cb < ACHROMATIC ? ha0 : hb0;
  let delta = hb - ha;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  const L = weightA * la + (1 - weightA) * lb;
  const C = weightA * ca + (1 - weightA) * cb;
  const H = ha + (1 - weightA) * delta;
  return fromOklab([L, C * Math.cos(H), C * Math.sin(H)]);
}

/** WCAG 2.2 AA minimums: 1.4.3 text, 1.4.3 large text, 1.4.11 UI components and graphics. */
export const MIN_CONTRAST = { text: 4.5, largeText: 3, ui: 3 } as const;
