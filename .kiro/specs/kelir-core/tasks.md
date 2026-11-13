# Implementation Plan

Deadline: Fri 4 Dec 2026, 14:00 PT. Target submission: **Thu 3 Dec**. 4 Dec is buffer only.

Milestones: A Foundations (13–15 Nov) · B Playable grey box (16–21 Nov) · C Story (22–27 Nov) · D Costume (28 Nov – 1 Dec) · E Ship (2–3 Dec).

Cut list if behind, in this order (none touch the accessibility commitments): (1) Bloom and chromatic aberration → vignette and noise only; (2) grandfather notes 6 → 4; (3) simpler gunungan (rotation + fade); (4) furniture occluders → pillars only.

## Milestone A — Foundations (Fri 13 – Sun 15 Nov)

- [x] 1. Scaffold the project
  - Create a Next.js app (App Router, TypeScript strict, ESLint, Tailwind, `src/` dir, `@/` alias) with current stable versions pinned
  - Install `three @react-three/fiber @react-three/drei @react-three/postprocessing @react-three/rapier zustand` (+ `@types/three`)
  - Install dev deps `vitest fast-check @vitest/coverage-v8`; add `test`, `test:watch` and `typecheck` npm scripts; Vitest config with the `@/` alias
  - Initialise shadcn/ui with `components.json` aliases pointing to `src/ui/components/ui` and `src/lib/utils`
  - Create the folder layout from `structure.md`; add `LICENSE` (MIT), `README.md` skeleton; keep `ASSETS.md`, `DEVLOG.md`
  - ESLint guard: `src/game/systems/**` cannot import React, three, R3F, `src/ui` or `src/stores`
  - `git init`; confirm `.gitignore` does NOT contain `.kiro`
  - `npm run build`, `npm run lint`, `npm run typecheck` and `npx vitest run` pass
  - _Requirements: 13.3_

- [ ] 2. Publish: public GitHub repo and first Vercel deploy (needs your accounts)
  - Push the repo; confirm `LICENSE` shows in the GitHub "About" panel and `.kiro/` is in the repo
  - Link the repo to Vercel; every push to `main` deploys
  - _Requirements: 13.3_

- [x] 3. Colour tokens and fonts
  - Define colour tokens and the shadcn variable mapping in `globals.css` (including `--soga-muda`, `--bahaya-muda` and the ring-on-kelir rule); load Cormorant Garamond, Inter and Noto Sans Javanese via `next/font/google`; measure every token pairing in use
  - _Requirements: 12.4, 12.5_

- [ ] 4. Pure systems (tests first: unit + `*.pbt.test.ts` for every invariant in `design.md`)
  - [x] 4.1 `geometry.ts`: `segmentsIntersect`, `isOccluded`, `distance`, `lampPosition`, `bodyOccluder`, `toWorld`
    - _Requirements: 5.1, 5.7_
  - [x] 4.2 `oil.ts`: drain, cycle, jars, oil-low crossing, pawon source cooldown
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8, 4.9, 4.10_
  - [ ] 4.3 `sukma.ts`: `tickSukma`, `distortionFrom`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_
  - [ ] 4.4 `shadowZones.ts`: `activeOccluders`, `classify`; benchmark (< 0.5 ms for 80 nodes × 250 segments)
    - _Requirements: 5.1, 5.2, 5.12_
  - [ ] 4.5 `kala.ts`: dormant/active/frozen/hidden, BFS on the shadow subgraph, relocate/hide, angry speed, catch with line-of-sight, path distance, restore respawn
    - _Requirements: 5.3, 5.4, 5.5, 5.7, 5.9, 5.10, 11.8_
  - [ ] 4.6 `progression.ts`: pick up (hands full, Semar gate), place, door, gunungan, outcomes, story order
    - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7, 9.5_
  - [ ] 4.7 `src/lib/storage.ts` (guarded localStorage, in-memory fallback) and `save.ts` with a round-trip property test
    - _Requirements: 11.4, 11.5, 11.6_
  - [ ] 4.8 `step.ts`: `stepWorld` in the tick order from `design.md`, with whole-world property tests (Kala in this tick's shadow set; lamp toggling never teleports Kala)
    - _Requirements: 5.12, 8.4, 9.1_

- [ ] 5. Floor plan and 2D dev page
  - [ ] 5.1 Author `floorPlan.ts`: walls, pillar and furniture occluders, senthong tengah door, ~80 nav nodes + edges, puppets, 8 oil jars, pawon source, 4–6 notes, kelir, spawn, area ambient; data tests (graph connected, areas correct, oil economy, wall endpoints that meet are bit-identical, no nav node within 0.1 m of an occluder or the door)
    - _Requirements: 4.10, 7.1, 7.5_
  - [ ] 5.2 Dev-only `/dev/plan` page: top-down canvas driving `stepWorld` with keyboard movement and lamp key; draws walls, occluders, shadow nodes, Kala and path distance; 404 in production. Use it to tune Kala before 3D exists
    - _Requirements: 5.1, 5.3, 5.7_

## Milestone B — Playable grey box (Mon 16 – Sat 21 Nov)

- [ ] 6. Stores and GameLoop
  - `useSettingsStore` with persistence via `storage.ts`, default bindings (`KeyboardEvent.code`) and the `prefers-reduced-motion` default
  - `useGameStore` per the design
  - `GameLoop` calling `stepWorld` at a fixed 60 Hz (max 5 ticks per frame, pause on tab hidden); HUD-facing values throttled to 10 Hz
  - _Requirements: 3.7, 8.4, 9.1, 12.2, 12.3_

- [ ] 7. 3D house from the floor plan
  - Merged walls, instanced saka pillars, merged furniture, floors, roof silhouette and doorways from `floorPlan.ts` via `toWorld`
  - Per-area ambient tint and additive moon-shaft planes at openings (no directional light)
  - Rapier colliders for walls, pillars and furniture
  - Dev overlay drawing nav nodes, walls and the live shadow set
  - Placeholder loading overlay outside the Canvas: `useProgress` + `SceneReady` (shader precompile) + "Click to enter the performance"
  - _Requirements: 1.6, 2.1, 3.2, 13.2_

- [ ] 8. Player controller, interaction and pause
  - Pointer lock on the canvas; Rapier kinematic character controller at 2.5 m/s; remappable keys, sensitivity and invert Y from settings
  - Forward raycast against interactables (≤ 2 m) → store prompt → `InteractPrompt` HUD
  - `PauseMenu` (Resume, Settings, Journal, Quit to title) on pointer-lock loss while `playing`; Esc fixed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 9. Blencong and oil HUD
  - The single shadow-casting point light at `lampPosition()`, `distance = SHADOW_RANGE`; flame mesh; smooth flicker (≤ 3 Hz, < 10% swing) tied to oil and state
  - Invisible player-body shadow proxy matching `bodyOccluder()`
  - Oil jar and pawon source interactions
  - `OilGauge` on the lamp, text in "show numbers" mode, meter with threshold announcements, reduced-motion static cue
  - _Requirements: 4.6, 4.7, 4.10, 5.1, 10.6, 13.2_

- [ ] 10. `SukmaMeter`: reticle ring, shape change below 30, text and accessible value
  - _Requirements: 6.4, 12.5_

- [ ] 11. Kala in the world
  - [ ] 11.1 Visuals: silhouette decal on the lamp-facing side of the occluder hiding Kala; near figure (dark, soft-edged, 200 ms fade, hidden when its position is lit). Stretch: shadow-map-aware fade shader
    - _Requirements: 5.8_
  - [ ] 11.2 Minimal audio engine: `AudioContext`, master/music/effects/voice buses wired to settings, `emitCue()` with captions, `Subtitles` HUD on a backing plate; cempala knocks + knock glyph; "Kala near" cue; jump-scare-off limiter
    - _Requirements: 5.6, 5.11, 10.2, 10.3, 10.4, 10.5, 12.4_
  - [ ] 11.3 `KalaEdge` HUD silhouette while Kala is within 3 m path distance
    - _Requirements: 5.11_

- [ ] 12. Performance checkpoint
  - Scripted walk through all six areas with quality low and high; record fps, draw calls (shadow passes included), shadow-casting calls and triangles in `DEVLOG.md`; fix anything over budget before Milestone C
  - _Requirements: 13.1, 13.2, 13.5_

## Milestone C — Story (Sun 22 – Fri 27 Nov)

- [ ] 13. Puppet art: 5 original SVG puppet silhouettes + gunungan, inspired by wayang conventions, not copied (log in `ASSETS.md`; `// LORE-CHECK` where unsure)
  - _Requirements: 8.1_

- [ ] 14. Puppets and progression in the world
  - Puppet pickups (SVG silhouette planes), hidden until Semar is placed; carrying indicator; "hands full" prompt
  - Kelir placement interaction + checkpoint save; senthong tengah door unlock after the 4th cutscene (cue + caption + journal entry); gunungan finale → "dawn"
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7_

- [ ] 15. Shadow-play cutscenes
  - [ ] 15.1 Cutscene player: data-driven scripts, SVG layer over the kelir, subtitles, skip (Space), systems paused, gunungan transition in/out
    - _Requirements: 2.3, 8.1, 8.3, 8.4_
  - [ ] 15.2 Write the 5 act scripts (20–45 s each; acts 2–4 stand alone in any order) following `lore.md`; mark uncertain lines `// LORE-CHECK`; script-duration unit test
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 16. Lontar journal
  - `LontarJournal` (shadcn Dialog): grandfather's notes, act summaries in story order, "rules of light"; keyboard + screen-reader support; glossed Javanese terms with a gloss data test
  - Place 4–6 grandfather notes in the world as interactables
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 17. Tutorial in the pendopo and pringgitan: hints naming the bound keys, lamp-off Sukma hint, "rules of light" on Semar pickup, each hint once per save
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 18. Gamelan: procedural slendro-like ambience on the music bus that slows and detunes with `distortion`
  - _Requirements: 6.5, 10.1_

## Milestone D — Costume (Sat 28 Nov – Tue 1 Dec)

- [ ] 19. UI primitives: `KelirPanel` (backlit cloth surface, flame-driven brightness via a CSS variable), `ShadowButton` (silhouette button, puppet-stick hover motion, reduced-motion fade), `GununganTransition` (replaces the placeholder overlay)
  - `KelirPanel` sets `data-surface="kelir"`; pick a selected-state treatment for kelir surfaces (`--prada` is only ~1.9:1 on kelir) and add its test row
  - _Requirements: 1.5, 2.1, 2.2, 2.4_

- [ ] 20. Title screen and device gates
  - `src/lib/device.ts` (WebGL2 and touch-only detection); fallback page and "best on desktop" screen
  - Title screen (Begin / Continue / Settings / Credits), content warning, credits screen; "Begin" resumes the AudioContext, then routes to `/play`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8_

- [ ] 21. `SettingsMenu` (shadcn Tabs/Slider/Switch): controls (remap with conflict swap/cancel, sensitivity, invert Y), audio (4 volumes, captions), accessibility (jump scares, reduced motion, show numbers), graphics (quality)
  - _Requirements: 12.1, 12.6, 10.3, 10.4_

- [ ] 22. Distortion pipeline
  - `PostFX` (Vignette, Noise, ChromaticAberration, flame Bloom on high) driven by `distortion`
  - HUD CSS variables (`--hud-sukma`, `--hud-oil`, `--hud-distortion`; `--sukma` is already the colour token) for ink-bleed and backlight effects, with the contrast floor held at maximum strength
  - `flashGate.ts` (pure, with a property test); reduced motion: static vignette + text only
  - _Requirements: 6.5, 6.6, 10.6, 12.4_

- [ ] 23. Outcomes
  - Caught sequence (jump scares on / off variants)
  - `EndScreen` variants: torn kelir (caught / soul lost) and dawn (victory + credits)
  - "Retry from checkpoint" and "Continue" restore (oil ≥ 60, Sukma 100, Kala respawned ≥ 10 m away; no checkpoint → fresh run)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8_

- [ ] 24. Performance and hardening
  - drei `PerformanceMonitor` → one-way step-down to the low preset; quality presets
  - Lazy-load cutscene and audio code after the title screen; verify initial download ≤ 15 MB in a production build
  - Error states from the design's error-handling table (asset retry, context lost, audio blocked)
  - _Requirements: 13.1, 13.3, 13.4, 13.6_

- [ ] 25. Balance and playtest
  - Two full runs end to end (target 15–25 min); tune `constants.ts`; every caption fires; keyboard-only menus; one full run with reduced motion and jump scares off
  - _Requirements: 4.10, 10.2, 12.4_

## Milestone E — Ship (Wed 2 – Thu 3 Dec)

- [ ] 26. Ship
  - Run `#submission-checklist` and fix every failing item
  - Finish `README.md` (what it is, how to play, how to run, how Kiro was used), complete `ASSETS.md`
  - Production deploy on Vercel; test in a fresh browser profile
  - _Requirements: 1.1, 13.3_

- [ ] 27. Demo video (under 3:00, English) and Devpost write-up from `DEVLOG.md`; submit by Thu 3 Dec
  - _Requirements: none (submission)_
