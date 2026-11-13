# KELIR — The Last Shadow Play

A first-person horror game that runs in the browser. Light is your only weapon, and the thing hunting you lives in the shadows that light casts. KELIR is inspired by Javanese *wayang kulit* (leather shadow puppet theatre) and the *ruwatan* (protective ritual performance); it does not depict a real ritual.

Built for the Kiroween 2026 hackathon, Costume Contest category.

> Status: in development. The game is not playable yet.

## How to play

_Coming with the first playable build._

## Run it locally

Requires Node.js 22 or newer and a desktop browser with WebGL2.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Unit and property-based tests (Vitest + fast-check), single run |
| `npm run test:watch` | Tests in watch mode |

## Stack

Next.js (App Router) · TypeScript (strict) · React Three Fiber + drei · @react-three/postprocessing · @react-three/rapier · shadcn/ui + Tailwind CSS · Zustand · Web Audio API · Vitest + fast-check. Deployed on Vercel.

## Project layout

Game rules are pure TypeScript in `src/game/systems/`, computed on a 2D floor plan. The 3D scene in `src/game/scene/` and `src/game/entities/` is drawn from the same data. See `.kiro/steering/structure.md` for the full layout.

## How Kiro was used

_Written from [`DEVLOG.md`](DEVLOG.md) before submission._ The `.kiro/` folder holds the steering docs, the `kelir-core` spec, hooks and custom agents.

## Assets and licence

Every asset, font and sound is original, CC0 or generated in code, and listed in [`ASSETS.md`](ASSETS.md). Code is released under the [MIT licence](LICENSE).
