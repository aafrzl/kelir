---
inclusion: always
---

# Product: KELIR — The Last Shadow Play

## One-liner
A browser-based first-person horror game where light is your only weapon, and the thing hunting you lives in the shadows it casts. Rooted in Javanese wayang kulit (shadow puppet theatre), built for an international audience.

## Context
- Built for the Kiroween 2026 hackathon, **Costume Contest** category: judges reward a polished, unforgettable spooky UI where every horror effect *supports a function*, not just decoration.
- Judging criteria (equal weight): Potential Impact, Technological Implementation (depth of Kiro usage), Design, Innovation, Presentation.
- Deadline: Friday 4 Dec 2026, 14:00 Pacific Time. Scope everything to fit ~3 weeks of solo work.

## Story (short)
The player is the grandchild of Ki Harjo Wicitro (fictional), a respected dalang (puppet master) in the fictional village of Karangsepi, Central Java. In 1996 he led a *ruwatan* (protective ritual performance) telling the story of **Batara Kala**, the devourer. The performance was never finished. He hid the puppets around the family *joglo* house, and Kala has lived in its shadows ever since. After his death, the player returns for one night and must complete the interrupted performance before dawn.

Full lore, characters and cultural rules: see `#lore` (auto-included when writing story content).

## Target players
- Primary: international players (16+) who enjoy short, atmospheric horror (Itch.io / browser game audience, horror YouTubers and streamers).
- Secondary: Indonesian and Southeast Asian players who rarely see their own folklore in polished games.
- Session length: 15–25 minutes for a full run. No install, no account.

## Core loop: light vs. dark
1. Explore the joglo house carrying a **blencong** (oil lamp).
2. Light lets you see, but it casts shadows — and **Kala can only move inside shadows**.
3. Turning the lamp off freezes Kala (no light, no shadow), but darkness drains your **Sukma** (soul).
4. Find the 5 hidden wayang puppets, place each on the **kelir** (screen) in the pendopo to play one act of the story.
5. After the 5th act, perform *tancep kayon* (planting the gunungan) to end the performance and survive until dawn.

Lamp has three states, each a deliberate trade-off:
| State | Player sees | Kala's reach | Oil use |
|---|---|---|---|
| High flame | Far | Large shadow range | Full |
| Low flame | Near | Small shadow range | Half |
| Off | Nothing | Frozen | None, but Sukma drains |

## Win / lose
- **Win:** complete the 5 acts and plant the gunungan. Dawn breaks.
- **Lose:** Sukma reaches 0 ("your soul slips into the dark"), or Kala reaches the player. Restart from the last checkpoint (last placed puppet).

## Scope (MVP — must ship)
- Title screen, settings, loading screen (gunungan transition)
- One house: 6 areas (pendopo, pringgitan, dalem, senthong ×3, gandok, pawon)
- Blencong lamp with oil + refills, Sukma system, Kala shadow-entity
- 5 puppets, 5 shadow-play cutscenes, journal (lontar manuscript)
- Procedural/original audio with full English subtitles
- Win and lose screens, checkpoint

## Out of scope (do not build unless MVP is finished)
- Multiplayer, accounts, leaderboards, backend
- Mobile touch controls (show a "best on desktop" screen instead)
- More than one level, inventory beyond puppets and oil

## Accessibility commitments (non-negotiable)
- Jump-scare toggle (when off: no sudden loud audio, no full-screen flash; danger still communicated)
- Subtitles and captions for every gameplay-relevant sound, on by default
- Reduced-motion mode (honors `prefers-reduced-motion`, plus a manual toggle): replaces shake/distortion with fades
- Remappable keys, mouse sensitivity, invert Y
- No meaning carried by colour alone (Sukma and danger also use shape, pattern, and text)
- Separate volume sliders: master, music (gamelan), effects, voice

## Positioning for the pitch
"Horror everyone can play, straight in the browser — and a 1,000-year-old shadow theatre tradition (UNESCO-recognised) brought to a new audience."
