---
inclusion: fileMatch
fileMatchPattern: ["src/ui/**/*", "src/app/**/*", "**/*.css", "components.json"]
---

# Design system: "the lit screen"

The whole UI behaves like a **wayang kelir**: a cloth screen lit from behind by a single oil lamp, with puppets cast as silhouettes. Every spooky effect must map to a gameplay function. If an effect has no function, cut it.

## Colour tokens (define once in `globals.css`, consume via Tailwind/shadcn variables)
| Token | Hex | Use |
|---|---|---|
| `--malam` (night) | `#0B0A0D` | page background, deepest shadow |
| `--kelir` (cloth) | `#EDE3CC` | lit panels, readable text on dark |
| `--blencong` (lamp) | `#F2A541` | primary actions, focus ring, oil |
| `--prada` (gold leaf) | `#C9A24A` | headings, ornaments, selected state |
| `--soga` (batik brown) | `#6B3E26` | secondary surfaces, decorative borders and separators (2.20:1 on malam, so never the only boundary of a control) |
| `--soga-muda` (light soga) | `#885840` | control boundaries: input outlines, switch and slider tracks (3.31:1 on malam, passes WCAG 1.4.11) |
| `--sukma` (soul) | `#5FB3A6` | Sukma meter (cool hue, distinct from amber for colour-blind users) |
| `--bahaya` (danger) | `#8E1B1B` | danger fills under `--kelir` text (7.09:1) — always paired with an icon/pattern/text |
| `--bahaya-muda` (light danger) | `#CD5850` | danger text and icons on `--malam` (4.80:1); `--bahaya` itself is only 2.18:1 there |

Map shadcn variables to these: `--background → --malam`, `--foreground → --kelir`, `--primary → --blencong`, `--accent → --prada`, `--border → --soga`, `--input → --soga-muda`, `--destructive → --bahaya`, `--ring → --blencong`. Theme shadcn through tokens; do not override component styles ad hoc.

Focus ring on lit `--kelir` surfaces (e.g. `KelirPanel`): use `--malam` (15.48:1), not `--blencong` (1.61:1 on kelir, fails 3:1).

Contrast: body text ≥ 4.5:1, large text and UI glyphs ≥ 3:1. Check every new token pairing, and check HUD text at maximum oil dimming and Sukma distortion. Captions always sit on a backing plate.

## Typography (all SIL Open Font Licence, via `next/font/google`)
- Display: **Cormorant Garamond** (600/700) — titles, act names
- Body / UI: **Inter** — everything functional, min 16px, HUD labels min 14px
- Ornament: **Noto Sans Javanese** — decorative aksara Jawa only, **always** with an English translation next to or under it (`aria-hidden` on the ornament, translation readable)

## Motion
- UI elements move like puppets on a stick: slight rotation around a bottom pivot + slide, `ease-out`, 180–320 ms
- Screen changes use the **gunungan transition** (the gunungan swings in, fills the screen, swings out) — this mirrors how a real performance marks scene changes
- Reduced motion (`prefers-reduced-motion` OR the setting): replace every movement with a 150 ms opacity fade; no shake, no distortion, no flicker
- Flashing: never more than 3 flashes per second anywhere, whatever the settings (WCAG 2.3.1). Panel flicker stays under a 10% brightness swing; the knock glyph pulses, it does not flash

## Effect → function map (the core of the Costume Contest pitch)
| Effect | Function it communicates |
|---|---|
| Panels lit from behind, flickering with the flame | Oil level: flicker speeds up and light dims as oil drops |
| Text "ink bleed" / blur on HUD | Sukma is low; strength scales with (1 − sukma) |
| Silhouette of Kala sliding across a UI panel edge | Kala is within 3 m path distance, in a shadow that touches you (often your own) |
| Cempala knocking (audio + on-screen knock glyph) | Proximity warning; tempo = distance |
| Gunungan swing | Loading / scene transition / act change |
| Torn kelir cloth | Game over screen |
| Dawn light washing the screen warm-white | Victory |

## Components
- Use shadcn primitives: `Dialog` (journal, pause), `Slider` (volumes, sensitivity), `Switch` (toggles), `Tabs` (settings sections), `Progress` (loading), `Tooltip`, `Button`
- Custom compositions live in `src/ui/**` and wrap shadcn primitives — e.g. `KelirPanel` (backlit cloth surface), `ShadowButton` (silhouette button that "steps toward the lamp" on hover/focus)
- Every interactive element is keyboard-reachable with a visible focus ring: `--blencong` on dark surfaces, `--malam` on lit `--kelir` surfaces
- HUD is mostly **diegetic**: oil is shown on the lamp itself; Sukma is a ring around the reticle with a text value available to screen readers and in a "show numbers" setting

## Never
- Pure red-on-black text, neon colours, generic Halloween pumpkins/bats
- Cultural symbols as random decoration — every Javanese element is labelled and used correctly (see `#lore`)
- Meaning carried by colour alone
