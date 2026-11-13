---
inclusion: always
---

# Project structure and conventions

```
/
├── .kiro/                  # Kiro config — ALWAYS committed, never in .gitignore
├── public/
│   └── assets/
│       ├── models/         # .glb (optional; most geometry is procedural)
│       ├── textures/
│       ├── audio/          # only if not procedural
│       └── fonts/
├── src/
│   ├── app/                # Next.js routes only (thin)
│   │   ├── layout.tsx
│   │   ├── page.tsx        # title screen
│   │   ├── play/page.tsx   # mounts the game (client)
│   │   └── globals.css     # Tailwind + design tokens
│   ├── game/
│   │   ├── scene/          # R3F: Canvas wrapper, House, Lighting, PostFX, GameLoop
│   │   ├── entities/       # R3F: Player, Blencong, Kala, PuppetPickup, OilPickup, Kelir
│   │   ├── systems/        # PURE TS: oil, sukma, shadowZones, kala, progression, save
│   │   ├── audio/          # Web Audio: gamelan synth, cues, subtitle mapping
│   │   ├── cutscenes/      # shadow-play scripts + renderer
│   │   └── data/           # floorPlan.ts, puppets.ts, lore.ts (all text in English)
│   ├── ui/
│   │   ├── components/ui/  # shadcn/ui generated components (do not hand-edit styles; theme via tokens)
│   │   ├── hud/            # diegetic HUD: OilGauge, SukmaMeter, InteractPrompt, Subtitles
│   │   ├── menus/          # TitleScreen, SettingsMenu, PauseMenu, EndScreen
│   │   ├── journal/        # LontarJournal
│   │   └── transitions/    # GununganTransition
│   ├── stores/             # gameStore.ts, settingsStore.ts (Zustand)
│   └── lib/                # utils.ts (cn), a11y.ts, storage.ts, device.ts
├── ASSETS.md               # every asset: file, source, licence
├── DEVLOG.md               # running log of what Kiro did (for the hackathon write-up)
├── README.md
└── LICENSE                 # MIT (must show in GitHub "About")
```

Configure shadcn's `components.json` aliases so generated components land in `src/ui/components/ui` and `cn` comes from `src/lib/utils`.

## Naming
- React components: `PascalCase.tsx`, one component per file
- Systems and utilities: `camelCase.ts`; tests next to source: `oil.test.ts`, `oil.pbt.test.ts`
- Stores: `useGameStore`, `useSettingsStore`
- Constants: `SCREAMING_SNAKE_CASE` in a `constants.ts` next to the system that owns them
- Javanese terms stay in Javanese in code identifiers where they are game concepts (`blencong`, `sukma`, `kelir`, `gunungan`) and get a one-line English JSDoc comment

## Imports
- Use the `@/` alias for `src/`
- `src/game/systems/**` must not import from `react`, `three`, `@react-three/*`, `src/ui/**`, or `src/stores/**`
- UI reads state from stores; it never calls systems directly. The `GameLoop` is the only place that calls systems and writes results to the store.

## Code style
- Prefer small pure functions and explicit types for public APIs
- No `any`; use `unknown` and narrow
- Every user-facing string lives in `src/game/data/` (lore, puppets, subtitles) or the component that owns it — in English
