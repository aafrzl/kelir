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
