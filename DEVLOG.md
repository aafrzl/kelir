# DEVLOG — how Kiro built KELIR

Running log for the Kiroween 2026 "How Kiro was used" write-up. New entries are appended automatically by the `devlog-after-task` hook after each spec task.

## 2026-11-13 — Project setup
- What was built: `.kiro/` configuration — 7 steering docs (always / fileMatch / auto / manual inclusion), the `kelir-core` spec (requirements → design → tasks), 8 hooks, 2 custom agents (builder + read-only reviewer sub-agent).
- Kiro features used: steering inclusion modes, spec-driven development, hooks (SessionStart, PostFileSave, PostFileCreate, PreToolUse, PostTaskExec, Stop), custom agents with scoped permissions, sub-agent review.

## 2026-11-13 — Spec review before any code
- What was built: no code. A critical review of `requirements.md`, `design.md` and `tasks.md` against the steering docs, then approved edits to the spec and to `r3f-scene.md`, `design-system.md` and `lore.md`.
- Kiro features used: spec-driven development (requirements → design → tasks), all steering files including the `lore` auto-inclusion, web search for lore verification.
- What Kiro caught or decided:
  - Core mechanic: with the only light in the player's hand, Kala could almost never reach the player, and catches would happen through walls. Fix: the player's body and the pillars/furniture are now 2D occluders, and a catch needs line of sight.
  - A 10 Hz shadow set with 60 Hz Kala ticks let a lamp flick teleport Kala. Fix: classify every tick.
  - Kala's wall decal would land in its own shadow and be invisible. Fix: it falls on the lit face of the occluder.
  - Oil could soft-lock a run. Fix: 8 jars plus a refillable pawon source, and taken jars are saved in the checkpoint.
  - A point-light shadow renders six passes, which eats the 120 draw-call budget. Fix: ≤ 12 shadow-casting calls.
  - Measured contrast failures: soga border 2.20:1 and bahaya text 2.18:1 on malam, blencong focus ring 1.61:1 on kelir. Fix: added `--soga-muda` and `--bahaya-muda`, and a malam ring on kelir panels.
  - Lore: Dewi Uma tellings vary (never imply coercion); Kandhabuwana is Wisnu in disguise (never write out the Rajah Kalacakra text).
  - tasks.md reordered into five dated milestones, with submission on Thu 3 Dec.
- Time saved vs. doing it by hand (rough): ~1 day of design rework avoided by catching the Kala reach problem before any code existed.

## 2026-11-13 — Task 1: Scaffold the project
- What was built:
  - Next.js 16.4.6 App Router app (TypeScript strict, Tailwind 4, `src/`, `@/`) with the R3F stack, Zustand, Vitest 5 and fast-check, all at exact versions.
  - shadcn/ui (Base UI, base-nova) with components in `src/ui/components/ui`; folder layout from `structure.md`; MIT `LICENSE`; README skeleton; `git init`.
  - ESLint rule that blocks React, three, R3F, UI and store imports in `src/game/systems/**`.
- Kiro features used: spec task 1; `tech.md` and `structure.md` steering; the `shadcn` skill; the `ui-design-and-a11y-guard` hook (fired on every `src/app` save); the `kelir-reviewer` sub-agent (two rounds).
- What Kiro caught or decided:
  - Vitest 5 needs `@types/node` 22 or newer, so it was bumped to 24 instead of forcing the install.
  - shadcn's injected Geist font was swapped for Inter, which is already logged in `ASSETS.md`.
  - The reviewer caught that Next's generated `LayoutProps` breaks `tsc --noEmit` on a clean clone, that the import guard missed `.tsx` files, and that some versions were unpinned. All three were fixed and re-verified on a clean export of the git index.
  - `shadcn` moved to devDependencies, so production audit is 0.
  - ESLint 9 and TypeScript 5.9 kept on purpose; they match `eslint-config-next` 16.4.6.
- Time saved vs. doing it by hand (rough): ~1.5 hours.

## 2026-11-13 — Task 3: Colour tokens and fonts
- What was built:
  - Dark-only token system in `globals.css`: 10 hex primitives mapped onto the shadcn roles, scoped overrides for the slider, tooltip and lit `[data-surface="kelir"]` panels, and one global solid focus outline.
  - Inter, Cormorant Garamond (600/700) and Noto Sans Javanese, self-hosted through `next/font`. Only Inter and Cormorant are preloaded.
  - `src/lib/a11y.ts` (WCAG contrast, alpha compositing, OKLab/OKLCH mixing) and a 68-test suite. It parses the primitives *and* the role mappings from the CSS and measures every pairing the base-nova components render, on dark and on kelir surfaces.
- Kiro features used: spec task 3; `design-system.md` steering (file-match on CSS/app files); skills `better-colors`, `better-typography`, `better-accessibility`, `shadcn` (dry-run `add --view` to read what each component actually renders); the `ui-design-and-a11y-guard` hook on each save; `kelir-reviewer` sub-agent (two rounds).
- What Kiro caught or decided:
  - Reading the real component classes exposed three mapping problems the design doc couldn't see:
    - The Switch's 80% off track failed at the old `--soga-muda` (2.50:1), so it went to `#9C6B52` (3.18:1).
    - shadcn draws `--destructive` as text, so it maps to `--bahaya-muda`.
    - There was no muted-text token, so `--kelir-redup` was added.
  - The reviewer caught:
    - The kelir scope still used blencong for primary and links (1.61:1).
    - Default Tabs mark the active tab by colour only (1.24:1); `variant="line"` is now required.
    - shadcn's 50% focus glow fails on filled controls and the dialog footer (2.90:1). Fixed with an unlayered 2px outline, confirmed outside every `@layer` in the compiled CSS.
  - The 16px floor is enforced through Tailwind's text scale, so generated components never need editing.
  - A mutation check proves the focus-rule test fails if the rule moves into a layer.
- Time saved vs. doing it by hand (rough): ~3 hours. Measuring roughly 60 pairings by hand is where contrast bugs usually slip through.

## 2026-11-13 — Task 4.1: 2D geometry
- What was built:
  - `src/game/systems/geometry.ts` (pure): segment intersection, line-of-sight occlusion, `distanceToSegment`, `toWorld`, the lamp's position and the player's body occluder. Plus shared `types.ts` and `constants.ts`.
  - 28 unit tests and 11 fast-check properties, written before the code.
- Kiro features used: spec sub-task 4.1; `tech.md`/`structure.md` steering (pure systems, PBT naming); the ESLint import guard from task 1; the `test-related-on-save` hook on every systems save; `kelir-reviewer` sub-agent (two rounds, including an independent brute-force check of the ray maths).
- What Kiro caught or decided:
  - A lamp held 0.4 m ahead would light the next room when the player stands near a wall. `lampPosition` now keeps 0.1 m of clearance from every wall at right angles, using a ray-into-capsule test.
  - The reviewer showed the first version only checked along the ray, so a grazed wall could still put the light inside its thickness. It also found that three.js's default 0.5 m shadow near-plane would drop the body's shadow. design.md and r3f-scene.md now require a thin-slab body proxy, `shadow-camera-near ≈ 0.02` and walls under 0.2 m thick.
  - The first pull-back properties hit the interesting case only 4.8 times per 1,000 runs. A targeted generator (walls crossing, grazing or cornering 1–60 cm ahead) now reaches it in 94% of samples.
  - A touch counts as occluded, so light and catches never leak through wall joints or pillar corners.
  - Mutation runs (12 deliberate bugs across two rounds) were each caught by at least one test.
  - A failing property once ran for over 5 minutes while fast-check shrank it. Run counts were tuned so the file takes about 0.65 s per save.
- Time saved vs. doing it by hand (rough): ~3 hours. The capsule edge case would likely have surfaced only as a lighting bug in task 9.

## 2026-11-13 — Game-dev agent skills installed
- What was added: 31 workspace skills in `.kiro/skills/` from [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) at commit `c6ca6c4` (Apache-2.0; LICENSE and NOTICE copied alongside):
  - web engines (6): three.js scene setup, materials/lighting and glTF loading; Phaser core and arcade physics; PixiJS
  - disciplines (15): game AI, behaviour trees, audio design, camera, game feel, game UI/UX, input, level design, performance, physics tuning, procedural generation, save systems, shaders, dialogue, asset creation
  - genres (9): card game, FPS, platformer, puzzle, roguelike, RPG, survival-crafting, tower defense, visual novel
  - workflow: game-docs
- Kiro features used: workspace skills (`.kiro/skills/`, progressive disclosure); custom agent `kelir-builder` given `skill://` resources so it loads workspace and global skills.
- What Kiro caught or decided:
  - Before copying, reviewed every file: no prompt-injection phrasing, no network calls or shell execution in the five bundled Python helpers, links only to engine docs.
  - Installed by copy from the reviewed clone instead of `npx skills add`, so the repo holds exactly the reviewed commit.
  - Checked for name clashes with global skills (none).

## 2026-11-13 — Task 4.2: Oil (the blencong's fuel)
- What was built:
  - `src/game/systems/oil.ts` (pure): drain per flame, the high → low → off lamp cycle with no lighting on an empty tank, jars (`collectJar`, idempotent and remembered for the checkpoint), the "oil low" crossing flag, and the refillable pawon source with a 90 s cooldown.
  - `LampState` moved to the shared `types.ts`; constants in `constants.ts`.
  - 32 unit tests and 7 fast-check properties, including a 200-action play simulation, written before the code.
- Kiro features used: spec sub-task 4.2; `tech.md`/`structure.md` steering; the new workspace skills (`survival-crafting` for needs/refill pacing); `test-related-on-save` hook; `kelir-reviewer` sub-agent (four rounds).
- What Kiro caught or decided:
  - **Design fix:** design.md stored the pawon source as an absolute "ready at" time, but the checkpoint doesn't save the game clock, so a restore would break it. It's now a countdown of seconds left; design.md, the checkpoint and the store were updated, and `tickOilSource` added to the tick order.
  - **Generators that tested almost nothing:**
    - The reviewer measured, and Kiro reproduced, that fast-check 4 caps arrays at 10 items without `size: "max"`.
    - `fc.double` put 91% of time steps under 1e-9 s, so no run ever reused the source.
    - The same flaw meant 92% of geometry coordinates were within 1 mm of the origin.
    - Generators now use whole 60 Hz ticks and a mm grid. Each property asserts a minimum share of runs that reach the rare case (measured 53–79% against a 30% guard). The rule is written into `tech.md`.
  - **A real bug the better generators exposed in 4.1's geometry:** a player exactly 10 cm from a wall had the lamp placed behind it (capsule entry rounded to −5e-18). The first fix then over-corrected tangent cases, and the reviewer caught that too. Both are fixed with regression tests and two new properties ("full reach whenever the path is clear", "a pulled-back lamp sits exactly on a clearance boundary").
  - Mutation checks: 11 deliberate oil bugs and 5 geometry bugs are each caught; the property files alone catch the ones that the unit tests used to catch on their own.
  - The suite passed 15 of 15 consecutive runs (150 tests).
- Time saved vs. doing it by hand (rough): ~4 hours. The lamp-behind-wall bug would have shown up as random light leaks in task 9, which are hard to reproduce.
