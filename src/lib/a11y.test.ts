import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { alphaOver, contrastRatio, MIN_CONTRAST, mixOklab, mixOklch, parseHex } from "./a11y";

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#F2A541", "#0B0A0D")).toBe(contrastRatio("#0B0A0D", "#F2A541"));
  });

  it("rejects colours that are not #RRGGBB", () => {
    expect(() => parseHex("#FFF")).toThrow();
    expect(() => parseHex("oklch(0.5 0 0)")).toThrow();
  });
});

describe("colour mixing", () => {
  it("returns the endpoints at weight 1 and 0", () => {
    for (const mix of [mixOklab, mixOklch]) {
      expect(mix("#EDE3CC", "#6B3E26", 1)).toBe("#EDE3CC");
      expect(mix("#EDE3CC", "#6B3E26", 0)).toBe("#6B3E26");
    }
    expect(alphaOver("#F2A541", "#0B0A0D", 1)).toBe("#F2A541");
    expect(alphaOver("#F2A541", "#0B0A0D", 0)).toBe("#0B0A0D");
  });

  it("keeps a grey mix grey in oklch (achromatic side adopts the other hue, at zero chroma)", () => {
    expect(mixOklch("#808080", "#808080", 0.5)).toBe("#808080");
  });
});

// ---------------------------------------------------------------------------
// Token pairings actually rendered by the shadcn components and game HUD.
// Primitives AND role mappings are read from globals.css, so changing either
// re-runs this check. Unknown value syntax fails loudly instead of being skipped.
// ---------------------------------------------------------------------------

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Custom-property declarations inside the first `selector { … }` block. */
function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No "${selector}" block in globals.css`);
  const open = css.indexOf("{", start);
  const body = css.slice(open + 1, css.indexOf("}", open));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map(([, n, v]) => [n, v.trim()]));
}

type Scope = readonly Record<string, string>[];
const ROOT: Scope = [declarations(":root")];
const SLIDER: Scope = [declarations('[data-slot="slider"]'), ...ROOT];
const KELIR: Scope = [declarations('[data-surface="kelir"]'), ...ROOT];
const KELIR_SLIDER: Scope = [declarations('[data-slot="slider"]'), ...KELIR];

/** Resolve `--name` to an opaque hex colour the way the cascade would inside `scope`. */
function resolve(name: string, scope: Scope): string {
  const raw = scope.find((block) => name in block)?.[name];
  if (raw === undefined) throw new Error(`--${name} is not defined in this scope`);
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const ref = /^var\(--([a-z0-9-]+)\)$/i.exec(raw);
  if (ref) return resolve(ref[1], scope);
  const mix = /^color-mix\(in oklab,\s*var\(--([a-z0-9-]+)\)\s+(\d+)%,\s*var\(--([a-z0-9-]+)\)\)$/i.exec(raw);
  if (mix) return mixOklab(resolve(mix[1], scope), resolve(mix[3], scope), Number(mix[2]) / 100);
  throw new Error(`Cannot evaluate --${name}: ${raw}`);
}

const PRIMITIVES = [
  "malam", "kelir", "kelir-redup", "blencong", "prada",
  "soga", "soga-muda", "sukma", "bahaya", "bahaya-muda",
] as const;

type Pair = { label: string; fg: string; bg: string; min: number };
const { text, ui } = MIN_CONTRAST;

/** Pairings for one surface. `r` resolves a role in that surface's scope. */
function surfacePairs(name: string, scope: Scope, sliderScope: Scope): Pair[] {
  const r = (role: string) => resolve(role, scope);
  const bg = r("background");
  const pair = (label: string, fg: string, back: string, min: number): Pair => ({ label: `${name}: ${label}`, fg, bg: back, min });
  const switchTrackOff = alphaOver(r("input"), bg, 0.8); // dark:data-unchecked:bg-input/80
  const dialogFooter = alphaOver(r("muted"), r("popover"), 0.5); // bg-muted/50
  const secondaryHover = mixOklch(r("secondary"), r("foreground"), 0.95); // color-mix(in oklch, secondary, foreground 5%)
  return [
    pair("text: foreground on background", r("foreground"), bg, text),
    pair("text: muted-foreground on background", r("muted-foreground"), bg, text),
    pair("text: muted-foreground on muted (inactive tab, tab list)", r("muted-foreground"), r("muted"), text),
    pair("text: foreground on muted (ghost/outline hover)", r("foreground"), r("muted"), text),
    pair("text: muted-foreground on muted/50 (dialog footer)", r("muted-foreground"), dialogFooter, text),
    pair("text: popover-foreground on popover (dialog)", r("popover-foreground"), r("popover"), text),
    pair("text: secondary-foreground on secondary", r("secondary-foreground"), r("secondary"), text),
    pair("text: secondary-foreground on secondary hover", r("secondary-foreground"), secondaryHover, text),
    pair("text: primary-foreground on primary", r("primary-foreground"), r("primary"), text),
    pair("text: primary-foreground on primary/80 (hover)", r("primary-foreground"), alphaOver(r("primary"), bg, 0.8), text),
    pair("text: accent-foreground on accent (menu highlight)", r("accent-foreground"), r("accent"), text),
    pair("text: primary on background (link)", r("primary"), bg, text),
    pair("text: destructive on background (error message)", r("destructive"), bg, text),
    pair("text: tooltip (background on foreground)", bg, r("foreground"), text),
    pair("text: foreground on input/30 (outline button, active tab)", r("foreground"), alphaOver(r("input"), bg, 0.3), text),
    pair("text: foreground on input/50 (outline button hover)", r("foreground"), alphaOver(r("input"), bg, 0.5), text),
    pair("ui: input boundary", r("input"), bg, ui),
    pair("ui: switch off track", switchTrackOff, bg, ui),
    pair("ui: switch off thumb (foreground) on track", r("foreground"), switchTrackOff, ui),
    pair("ui: switch on track (primary)", r("primary"), bg, ui),
    pair("ui: switch on thumb (primary-foreground) on track", r("primary-foreground"), r("primary"), ui),
    pair("ui: slider track (scoped --muted)", resolve("muted", sliderScope), bg, ui),
    pair("ui: slider thumb (scoped --color-white = kelir) border ring", r("ring"), bg, ui),
    pair("ui: progress indicator on track", r("primary"), r("muted"), ui),
    pair("ui: tab line indicator (foreground) on background", r("foreground"), bg, ui),
    pair("ui: focus outline on background", r("ring"), bg, ui),
    pair("ui: focus outline on muted surface (tab list)", r("ring"), r("muted"), ui),
    pair("ui: focus outline on dialog footer", r("ring"), dialogFooter, ui),
  ];
}

const gamePairs = (): Pair[] => {
  const p = (name: string) => resolve(name, ROOT);
  return [
    { label: "game: sukma meter", fg: p("sukma"), bg: p("malam"), min: ui },
    { label: "game: oil / lamp glyph", fg: p("blencong"), bg: p("malam"), min: ui },
    { label: "game: danger icon", fg: p("bahaya-muda"), bg: p("malam"), min: ui },
    { label: "game: kelir text on bahaya danger fill", fg: p("kelir"), bg: p("bahaya"), min: text },
    { label: "game: prada heading on malam", fg: p("prada"), bg: p("malam"), min: text },
  ];
};

describe("design tokens in globals.css", () => {
  it("declares every primitive from design-system.md as #RRGGBB in :root", () => {
    for (const name of PRIMITIVES) expect(ROOT[0][name], `--${name}`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("keeps the solid focus outline as a top-level rule (unlayered, so it beats outline-none)", () => {
    const at = css.search(/(^|\})\s*:focus-visible\s*\{/m);
    expect(at, "top-level :focus-visible rule").toBeGreaterThanOrEqual(0);
    const before = css.slice(0, at + 1);
    const depth = (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    expect(depth, "nesting depth of the :focus-visible rule").toBe(0);
    expect(css.slice(at)).toMatch(/^\}?\s*:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\)/);
  });

  const all = [
    ...surfacePairs("dark", ROOT, SLIDER),
    ...surfacePairs("kelir", KELIR, KELIR_SLIDER),
    ...gamePairs(),
  ];
  it.each(all.map((p) => [p.label, p] as const))("%s meets WCAG AA", (_label, p) => {
    expect(contrastRatio(p.fg, p.bg)).toBeGreaterThanOrEqual(p.min);
  });
});
