---
inclusion: fileMatch
fileMatchPattern: ["src/game/**/*.tsx", "src/game/scene/**/*", "src/game/entities/**/*"]
---

# React Three Fiber rules

## Structure
- One `<Canvas>` in `src/game/scene/GameCanvas.tsx`. Inside it, `<Suspense fallback={null}>` wraps the scene. The gunungan loading screen is a DOM overlay **outside** the Canvas, driven by drei `useProgress` plus a scene-ready flag (set after `gl.compile` and the first frame), so it can swing out over the live scene.
- `GameLoop.tsx` owns the fixed-timestep accumulator and is the **only** component that calls pure systems (via `stepWorld`) and writes results to the store. Exception: `emitCue()` writes captions.
- Entities read state with refs or `useGameStore.getState()` inside `useFrame`; they never `setState` per frame.
- Convert 2D floor-plan coordinates only with `toWorld()` (2D `y` → three.js `z`).

## Lighting and shadows
- `<Canvas shadows>` with one shadow-casting `pointLight` attached to the blencong. `shadow-mapSize` 512 on "low" quality, 1024 on "high". Its `distance` equals `SHADOW_RANGE[lamp]`, so visible falloff matches the logic.
- A point-light shadow renders every caster six times and `renderer.info` counts those passes. Only merged walls, instanced pillars, merged large furniture and the invisible player-body proxy cast shadows (≤ 12 shadow-casting draw calls). Floors, roof and the kelir do not.
- Every visible shadow caster must also be an occluder in `floorPlan.ts`, and the reverse.
- Ambient light near zero. No directional moonlight (without shadows it would light windowless rooms). Readability comes from a per-area ambient tint (`areaAmbient` in `floorPlan.ts`) and additive moon-shaft planes at openings.
- Flame flicker = smooth noise on intensity and position, scaled by oil level and lamp state, at ≤ 3 Hz with a brightness swing under 10% (never a flash under WCAG 2.3.1).

## Kala rendering (fake shadow, no real AI-driven mesh)
- Kala's *logical* position comes from the pure `kala` system on the 2D nav graph.
- Visual 1: a silhouette **decal** on the lamp-facing (lit) side of the occluder that hides Kala, where the lamp→Kala ray crosses it, scaled with distance. It reads as a shadow with nothing casting it.
- Visual 2: when Kala is within 3 m and in shadow, a dark soft-edged figure that fades over 200 ms and is hidden whenever its interpolated position is lit. A shadow-map-aware fade shader is a stretch goal.
- Kala's figure is never rendered at a lit position; only its cast silhouette may appear on lit surfaces.

## Performance
- Build walls/floors procedurally from `floorPlan.ts`; merge static geometry where possible.
- Use `<Instances>` for repeated props.
- `useGLTF.preload` for any models; `dispose` on unmount.
- Postprocessing: keep to Vignette + Noise + ChromaticAberration (+ Bloom on the flame, high quality only). All strengths come from one `distortion` value derived from Sukma; in reduced-motion mode keep only a static vignette (no grain, no aberration).
- Use `<PerformanceMonitor>` from drei to drop shadow map size and DPR when fps falls.

## Controls
- drei `PointerLockControls`, locked on the game canvas by the "Click to enter the performance" click; movement via `@react-three/rapier` kinematic character controller at 2.5 m/s.
- Interaction: a single forward raycast each frame against an `interactables` layer; show the prompt through the store.
- Keys come from `useSettingsStore` (remappable, stored as `KeyboardEvent.code`). Defaults: WASD move, E interact, F lamp cycle (high → low → off), J journal, Space skip cutscene. Esc always pauses and is not remappable.
