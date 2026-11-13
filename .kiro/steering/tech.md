---
inclusion: always
---

# Tech stack and rules

## Stack (fixed — do not swap libraries without asking)
- **Next.js** (latest stable, App Router), **TypeScript** in `strict` mode
- **React Three Fiber** (`@react-three/fiber`) + **drei** (`@react-three/drei`) for the 3D scene
- **@react-three/postprocessing** for screen effects
- **@react-three/rapier** for player collision (kinematic character controller)
- **shadcn/ui** + **Tailwind CSS** for all 2D UI (menus, HUD, settings, journal, dialogs)
- **Zustand** for game and settings state
- **Web Audio API** for procedural gamelan and sound effects (no audio library unless asked)
- **Vitest** for unit tests, **fast-check** for property-based tests
- Package manager: `npm`. Deploy target: **Vercel**.

## Hard rules
1. **Client-only 3D.** Anything that touches `three`, R3F, `window`, Web Audio or pointer lock lives in a `"use client"` component. Load the game canvas with `next/dynamic` and `{ ssr: false }` *from inside a client component*.
2. **Game logic is pure TypeScript.** Systems in `src/game/systems/` take state + inputs and return new state. No React, no three.js imports there. This keeps them testable and lets property-based tests cover them.
3. **Logic runs on a 2D floor plan.** Walls are 2D line segments; occlusion, shadow zones and Kala's pathing are computed in 2D. The 3D scene is the visual layer built *from* the same floor-plan data.
4. **No React state updates inside `useFrame`.** Use refs, or `useGameStore.getState()` / transient subscriptions. Update React-visible store values at most ~10×/second (HUD), never every frame.
5. **Fixed timestep.** Systems tick at 60 Hz via an accumulator in a single `GameLoop` component, independent of frame rate.
6. **Assets must be original, CC0, or procedurally generated.** No copyrighted music, recordings of real performances, scanned puppets, or fonts without an open licence. Log every asset in `ASSETS.md` (file, source, licence).
7. **Browser storage** (save checkpoint, settings) is wrapped in `try/catch`; the game must work when storage is unavailable.
8. **No secrets, no backend, no analytics** in the MVP.

## Performance budget (mid-range laptop, desktop Chrome/Firefox/Safari)
- Target **60 fps**; never below 30 fps on integrated graphics at 1080p
- ≤ **120 draw calls**, ≤ **300k triangles** on screen
- Exactly **one shadow-casting light**: the blencong (point light, shadow map ≤ 1024). All other lights cast no shadows.
- Textures ≤ 1024 px (2048 only for the kelir cloth); prefer KTX2/Basis or WebP
- Initial download ≤ **15 MB**; lazy-load cutscene and audio assets after the title screen
- Use instancing for repeated props (pillars, roof beams, floor tiles)
- Dispose geometries/materials/textures when unmounting

## Testing
- Every pure system in `src/game/systems/` has a `*.test.ts` file next to it.
- Use **fast-check** property tests for invariants (value ranges, monotonic drains, state-machine rules, save/load round-trips). Name them `*.pbt.test.ts`.
- Run: `npx vitest run`. A single file: `npx vitest related --run <file>`.
- Type-check: `npx tsc --noEmit`. Lint: `npm run lint`.

## Compatibility
- Requires WebGL2. If unavailable, show a styled fallback page (still on-theme) instead of crashing.
- Pointer lock and audio need a user gesture: the title screen's "Begin" click unlocks both.
- Desktop only for MVP; detect touch-only devices and show the "best on desktop" screen.
