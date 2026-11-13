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
| `--kelir-redup` (dimmed cloth) | `#C2BAA8` | secondary text (`--muted-foreground`): 10.23:1 on malam, 4.65:1 on soga |
| `--blencong` (lamp) | `#F2A541` | primary actions, focus ring, oil |
| `--prada` (gold leaf) | `#C9A24A` | headings, ornaments, selected state |
| `--soga` (batik brown) | `#6B3E26` | secondary surfaces, decorative borders and separators (2.20:1 on malam, so never the only boundary of a control) |
| `--soga-muda` (light soga) | `#9C6B52` | control boundaries: input outlines, switch and slider tracks (4.36:1 on malam; 3.18:1 at the switch's 80% opacity) |
| `--sukma` (soul) | `#5FB3A6` | Sukma meter (cool hue, distinct from amber for colour-blind users) |
| `--bahaya` (danger) | `#8E1B1B` | danger fills under `--kelir` text (7.09:1) — always paired with an icon/pattern/text |
| `--bahaya-muda` (light danger) | `#CD5850` | danger text and icons on `--malam` (4.80:1); `--bahaya` itself is only 2.18:1 there |

Map shadcn variables to these: `--background`/`--card`/`--popover → --malam`, `--foreground → --kelir`, `--primary → --blencong`, `--secondary`/`--muted → --soga`, `--muted-foreground → --kelir-redup`, `--accent → --prada`, `--border → --soga`, `--input → --soga-muda`, `--destructive → --bahaya-muda` (shadcn draws it as text and outlines on dark), `--ring → --blencong`. Theme shadcn through tokens; do not override component styles ad hoc. Slider tracks get `--muted → --soga-muda` through a scoped token in `globals.css`.

The app is dark-only: `<html class="dark">` is always set and there is no light theme.

Lit `--kelir` surfaces (e.g. `KelirPanel`) set `data-surface="kelir"`, which swaps the role tokens: text `--malam`, secondary text `--soga`, primary actions become silhouettes (`--malam` fill, `--kelir` label; this also covers links and the checked switch), danger text `--bahaya`, control boundaries `--soga`, focus ring `--malam` (15.48:1; `--blencong` is only 1.61:1 on kelir). Dialogs and tooltips portal to `<body>`, so they always use the dark tokens.

Do not use shadcn `Button variant="destructive"` (its 20% tint drops text to 3.93:1); a danger action is `bg-bahaya text-kelir`. Do not use `Button size="sm"` (hard-coded 12.8px text).

Contrast: body text ≥ 4.5:1, large text and UI glyphs ≥ 3:1. `src/lib/a11y.test.ts` re-measures every token pairing the components render; add a row there for every new pairing. Check HUD text at maximum oil dimming and Sukma distortion. Captions always sit on a backing plate.

## Typography (all SIL Open Font Licence, via `next/font/google`, self-hosted at build time)
- Display: **Cormorant Garamond** (600/700) — titles, act names. Utility: `font-heading`
- Body / UI: **Inter** — everything functional, min 16px, HUD labels min 14px. Utility: `font-sans` (default)
- Ornament: **Noto Sans Javanese** — decorative aksara Jawa only, **always** with an English translation next to or under it (`aria-hidden` on the ornament, translation readable). Utility: `font-aksara`
- Size floors are enforced in `globals.css` by remapping Tailwind's two smallest steps: `text-xs` = 14px (HUD labels), `text-sm` = 16px (functional UI, which is what shadcn components use). Tooltips are scoped up to 16px

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
- Every interactive element is keyboard-reachable with a visible focus indicator. `globals.css` draws it globally: a solid 2px `--ring` outline offset 3px on `:focus-visible` (`--blencong` on dark, `--malam` on lit `--kelir`), unlayered so it beats the components' `outline-none`. Never remove or restyle it per component; `ShadowButton` inherits it
- Component rules that keep state from resting on colour alone:
  - `Tabs`: always `TabsList variant="line"`, so the active tab carries an underline (the default variant differs only by colour, 1.24:1). Check that 16px labels fit the trigger height
  - `Progress`: always render `ProgressValue` (the percentage as text); the track is decorative `--soga`
  - Invalid fields: always pair `aria-invalid` with visible error text linked by `aria-describedby`; the 50% destructive border is decorative (1.99:1)
- Generated components are themed through scoped tokens in `globals.css`, never by editing their classes: slider track (`--muted`), slider thumb (`--color-white` → `--kelir`), tooltip text size
- HUD is mostly **diegetic**: oil is shown on the lamp itself; Sukma is a ring around the reticle with a text value available to screen readers and in a "show numbers" setting

## Never
- Pure red-on-black text, neon colours, generic Halloween pumpkins/bats
- Cultural symbols as random decoration — every Javanese element is labelled and used correctly (see `#lore`)
- Meaning carried by colour alone
