# Requirements Document

## Introduction

KELIR is a browser-based first-person horror game rooted in Javanese wayang kulit. The player explores a joglo house at night carrying a blencong (oil lamp), collects five wayang puppets, and places them on the kelir (screen) to complete an interrupted ruwatan performance. Batara Kala can only move inside shadows cast by the player's light; darkness keeps Kala frozen but drains the player's Sukma (soul).

This spec covers the MVP vertical slice for the Kiroween 2026 hackathon (Costume Contest category). Product context, stack and design rules live in the steering files (`product.md`, `tech.md`, `structure.md`, `design-system.md`, `lore.md`).

All numeric values below (rates, ranges, counts, thresholds) are starting tuning values. They live in `constants.ts` files and tests reference the constants, so the balance pass (tasks.md) can change them without rewriting criteria.

## Glossary

- **Blencong**: the player's oil lamp. States: `high`, `low`, `off`. Held 0.4 m in front of the player.
- **Oil**: lamp fuel, 0–100.
- **Sukma**: the player's soul meter, 0–100.
- **Kala**: the shadow entity hunting the player.
- **Occluder**: a 2D line segment that blocks the lamp's light: walls, the closed senthong tengah door, pillars, large furniture, and the player's own body. The kelir cloth is not an occluder (it is translucent).
- **Nav node**: a point on the 2D floor plan that Kala can stand on.
- **Shadow node**: a nav node that is hidden from the lamp by an occluder and lies within the current shadow range.
- **Path distance**: shortest distance along nav edges, ignoring light.
- **Kelir**: the screen in the pendopo where puppets are placed.
- **Checkpoint**: saved state captured each time a puppet is placed.
- **Phase**: the game's current mode: `title`, `loading`, `playing`, `paused`, `cutscene`, `journal` or `ended`.

## Requirements

### Requirement 1: Title screen and session start

**User Story:** As a player, I want an atmospheric title screen that starts the game with one click, so that I'm immersed from the first second and the browser grants audio and pointer lock.

#### Acceptance Criteria

1. WHEN the player opens the site THE SYSTEM SHALL display the title screen styled as a lit kelir with the game title, a "Begin" action, "Continue" (only if a checkpoint exists), "Settings" and "Credits".
2. WHEN the player activates "Begin" or "Continue" THE SYSTEM SHALL resume the Web Audio context within that same user gesture.
3. IF the device has no WebGL2 support THEN THE SYSTEM SHALL show an on-theme fallback page explaining the requirement instead of loading the game.
4. IF the device is touch-only (`(pointer: coarse)` matches and `(any-pointer: fine)` does not) THEN THE SYSTEM SHALL show an on-theme "best on desktop" screen with an option to continue anyway.
5. THE SYSTEM SHALL make every title-screen action reachable and operable by keyboard with a visible focus indicator.
6. WHEN the game scene has finished loading THE SYSTEM SHALL show a "Click to enter the performance" prompt and request pointer lock on the game canvas when the player clicks; THE SYSTEM SHALL use the same prompt to re-enter after pointer lock is lost.
7. WHEN the player opens "Credits" THE SYSTEM SHALL list the authors, every asset with its source and licence, and a statement that KELIR is inspired by Javanese wayang kulit and ruwatan traditions and does not depict a real ritual.
8. WHEN the player activates "Begin" for the first time in a session THE SYSTEM SHALL show a content warning (horror themes, sudden sounds, flickering light) with the jump-scare and reduced-motion toggles on the same screen, before loading starts.

### Requirement 2: Loading and gunungan transition

**User Story:** As a player, I want loading and scene changes to feel like part of the performance, so that waiting never breaks the mood.

#### Acceptance Criteria

1. WHILE the game scene is loading THE SYSTEM SHALL display the gunungan transition with a 0–100% progress indicator that combines asset-loader progress with a final "scene ready" step (shaders compiled and the first frame rendered), and that never decreases.
2. WHEN loading completes THE SYSTEM SHALL swing the gunungan out over the rendered scene to reveal it.
3. WHEN an act cutscene starts or ends THE SYSTEM SHALL use the gunungan transition.
4. WHERE reduced motion is enabled THE SYSTEM SHALL replace the swing animation with a fade of 150 ms.

### Requirement 3: Movement, interaction and pause

**User Story:** As a player, I want responsive first-person movement and clear interaction prompts, so that I can explore the house without fighting the controls.

#### Acceptance Criteria

1. WHILE pointer lock is active THE SYSTEM SHALL move the player at 2.5 m/s with the configured movement keys and rotate the view with the mouse using the configured sensitivity and invert-Y setting.
2. THE SYSTEM SHALL prevent the player from passing through walls, pillars and furniture.
3. WHEN the centre of the view hits an interactable object within 2 m THE SYSTEM SHALL show an interaction prompt naming the object and the interact key.
4. WHEN the player presses the interact key while a prompt is shown THE SYSTEM SHALL perform that object's interaction.
5. WHEN pointer lock is lost WHILE the phase is `playing` THE SYSTEM SHALL pause the game and open the pause menu. Opening the journal, a cutscene or an end screen, which release pointer lock on purpose, SHALL NOT open the pause menu.
6. WHILE the pause menu is open THE SYSTEM SHALL offer "Resume", "Settings", "Journal" and "Quit to title", all operable by keyboard.
7. THE SYSTEM SHALL use these default bindings, stored as `KeyboardEvent.code` so they follow physical key positions on any layout: move W/A/S/D, interact E, lamp F, journal J, skip cutscene Space. Esc always pauses and is not remappable (the browser reserves it for leaving pointer lock).

### Requirement 4: Blencong (oil lamp)

**User Story:** As a player, I want to control my lamp's flame, so that I can trade visibility against safety and fuel.

#### Acceptance Criteria

1. WHEN the player presses the lamp key THE SYSTEM SHALL cycle the lamp state high → low → off → high.
2. WHILE the lamp is `high` THE SYSTEM SHALL drain oil at 1.0 unit per second; WHILE `low` at 0.5 units per second; WHILE `off` at 0.
3. THE SYSTEM SHALL keep oil within 0–100 at all times.
4. WHEN oil reaches 0 THE SYSTEM SHALL force the lamp to `off` and prevent turning it on until oil is above 0.
5. WHEN the player collects an oil jar THE SYSTEM SHALL add 40 oil, capped at 100, and remove the jar from the world.
6. THE SYSTEM SHALL communicate oil level through the lamp's flame size, flicker rate and backlit UI dimming; SHALL show the value as text WHILE "show numbers" is on; and SHALL expose it to assistive technology as a meter whose value is announced only when oil crosses 50, 25 and 10.
7. WHERE reduced motion is enabled THE SYSTEM SHALL communicate oil level through static brightness and the gauge's shape instead of flicker.
8. WHEN a run starts THE SYSTEM SHALL set oil to 100 and the lamp to `high`.
9. WHEN oil falls to 20 or below THE SYSTEM SHALL play the "oil low" cue once per downward crossing.
10. THE SYSTEM SHALL place 8 oil jars in the house and one refillable oil source in the pawon that adds 40 oil (capped at 100) and then needs 90 seconds of game time before it can be used again; WHILE it is cooling down its prompt SHALL say so.

### Requirement 5: Shadows and Kala

**User Story:** As a player, I want the creature to obey a clear rule about light and shadow, so that I can learn it, plan around it, and feel smart when I escape.

#### Acceptance Criteria

1. THE SYSTEM SHALL classify each nav node as a shadow node when the straight line from the lamp to the node intersects an occluder AND the node lies within the current shadow range. Because the lamp is held in front of the player, the player's body casts a shadow behind them.
2. THE SYSTEM SHALL set the shadow range to 14 m WHILE the lamp is `high`, 7 m WHILE `low`, and SHALL classify no node as a shadow node WHILE the lamp is `off`.
3. THE SYSTEM SHALL only move Kala along edges between shadow nodes.
4. WHILE the lamp is `off` THE SYSTEM SHALL keep Kala frozen in place.
5. WHILE the lamp is `high` or `low`, WHEN a nav node becomes lit while Kala occupies it, THE SYSTEM SHALL move Kala to the nearest connected shadow node, or hide Kala and respawn it at the shadow node with the greatest path distance from the player if none is connected.
6. WHILE Kala is within 10 m path distance of the player THE SYSTEM SHALL play cempala knocks whose interval shortens as distance decreases, with a matching on-screen knock glyph and caption.
7. WHEN Kala's position is within 1 m of the player AND no wall or closed door lies between them THE SYSTEM SHALL end the run with the "caught" outcome.
8. THE SYSTEM SHALL never place or render Kala's figure at a lit position. Kala's cast silhouette MAY appear on lit surfaces bordering the shadow it occupies ("a shadow with nothing casting it").
9. WHILE the player holds Batara Kala's puppet THE SYSTEM SHALL increase Kala's movement speed by 50%.
10. THE SYSTEM SHALL keep Kala dormant (absent, no knocks) until the player first picks up the Semar puppet.
11. WHILE Kala is within 3 m path distance of the player THE SYSTEM SHALL play the "Kala near" cue with a caption and show Kala's silhouette sliding along the edge of a HUD panel.
12. THE SYSTEM SHALL classify shadow nodes from the current lamp position and state on every logic tick, so Kala never moves or relocates based on an outdated shadow set.

### Requirement 6: Sukma (soul)

**User Story:** As a player, I want darkness to cost me something, so that hiding in the dark is a real decision and not a free escape.

#### Acceptance Criteria

1. WHILE the lamp is `off` THE SYSTEM SHALL drain Sukma at 4 units per second.
2. WHILE the lamp is `high` or `low` THE SYSTEM SHALL regenerate Sukma at 2 units per second.
3. THE SYSTEM SHALL keep Sukma within 0–100 at all times.
4. WHEN Sukma reaches 0 THE SYSTEM SHALL end the run with the "soul lost" outcome.
5. THE SYSTEM SHALL drive screen and UI distortion strength from Sukma (stronger as Sukma falls) and SHALL detune the gamelan accordingly.
6. WHERE reduced motion is enabled THE SYSTEM SHALL communicate low Sukma through a static vignette and text only, without motion-based distortion.
7. WHEN a run starts THE SYSTEM SHALL set Sukma to 100.

### Requirement 7: Puppets and progression

**User Story:** As a player, I want to find puppets and see the story advance on the kelir, so that I have a clear goal and a reason to explore every room.

#### Acceptance Criteria

1. THE SYSTEM SHALL place exactly five puppets: Semar (pringgitan), Batara Guru (dalem), Dewi Uma (gandok), Batara Kala (pawon), Dalang Kandhabuwana (senthong tengah).
2. WHEN the player picks up a puppet THE SYSTEM SHALL mark it as carried; THE SYSTEM SHALL allow carrying at most one puppet at a time. IF the player tries to pick up a puppet while carrying one THEN THE SYSTEM SHALL show a "hands full" prompt and leave both puppets where they are.
3. WHEN the player interacts with the kelir while carrying a puppet THE SYSTEM SHALL place it, play that puppet's act cutscene, and save a checkpoint.
4. THE SYSTEM SHALL never count the same puppet as placed twice.
5. WHEN the fourth puppet's act cutscene ends THE SYSTEM SHALL unlock the senthong tengah door and announce it through audio, caption and a journal entry.
6. WHEN all five puppets are placed THE SYSTEM SHALL enable the gunungan interaction on the kelir; WHEN the player performs it THE SYSTEM SHALL end the run with the "dawn" outcome.
7. THE SYSTEM SHALL make the other four puppets visible and collectable only after Semar has been placed. Batara Guru, Dewi Uma and Batara Kala MAY then be placed in any order; Kandhabuwana is placed last because its room unlocks after four.

### Requirement 8: Shadow-play cutscenes

**User Story:** As a player, I want each act told as a real shadow play on the kelir, so that the story is memorable and culturally grounded.

#### Acceptance Criteria

1. WHEN a cutscene plays THE SYSTEM SHALL render original puppet silhouettes moving behind the lit kelir, with narration as English subtitles.
2. THE SYSTEM SHALL keep each cutscene between 20 and 45 seconds.
3. WHEN the player presses the skip key (default Space) during a cutscene THE SYSTEM SHALL end it and record that the act was seen.
4. WHILE a cutscene plays THE SYSTEM SHALL pause oil drain, Sukma drain and Kala.
5. THE SYSTEM SHALL write the acts of Batara Guru, Dewi Uma and Batara Kala so that each makes sense in any order.

### Requirement 9: Lontar journal

**User Story:** As a player, I want to re-read what I've learned, so that I can follow the story and remember the rules.

#### Acceptance Criteria

1. WHEN the player presses the journal key THE SYSTEM SHALL open the lontar journal and pause the game.
2. THE SYSTEM SHALL list unlocked entries: grandfather's notes found in the world, a summary of each completed act, and a "rules of light" entry unlocked by the tutorial (Requirement 14).
3. THE SYSTEM SHALL show every Javanese term with its English meaning on first use within an entry.
4. THE SYSTEM SHALL make the journal fully operable by keyboard and readable by screen readers.
5. THE SYSTEM SHALL list completed acts in story order (Semar, Batara Guru, Dewi Uma, Batara Kala, Kandhabuwana), whatever order the puppets were placed in.

### Requirement 10: Audio and captions

**User Story:** As a player, I want sound to warn me and set the mood, and captions so I never miss a warning.

#### Acceptance Criteria

1. THE SYSTEM SHALL generate gamelan ambience procedurally with the Web Audio API or use only original/CC0 recordings logged in `ASSETS.md`.
2. WHEN any gameplay-relevant sound plays (knocks, Kala near, door unlock, oil low, oil refill, puppet pickup, caught) THE SYSTEM SHALL show a matching caption WHILE captions are enabled.
3. THE SYSTEM SHALL enable captions by default.
4. THE SYSTEM SHALL apply separate master, music, effects and voice volume settings. The voice bus carries Kala's whispers and any narration.
5. WHERE the jump-scare toggle is off THE SYSTEM SHALL limit any volume rise within 250 ms of a sound starting to +6 dB above the bus level just before it, and suppress full-screen flashes, while still showing danger captions.
6. THE SYSTEM SHALL never produce more than three flashes in any one-second period (WCAG 2.3.1), including flame flicker on backlit panels and the knock glyph, regardless of settings.

### Requirement 11: Run outcomes and checkpoints

**User Story:** As a player, I want clear endings and a fair retry, so that failing feels like part of the horror and not a punishment.

#### Acceptance Criteria

1. WHEN the run ends with "caught" THE SYSTEM SHALL show the torn-kelir game-over screen with "Retry from checkpoint" and "Title screen".
2. WHEN the run ends with "soul lost" THE SYSTEM SHALL show the same screen with a different line of text.
3. WHEN the run ends with "dawn" THE SYSTEM SHALL show the dawn victory screen and credits.
4. WHEN the player chooses "Retry from checkpoint" or "Continue" THE SYSTEM SHALL restore the state saved at the last placed puppet with oil at least 60 and Sukma at 100. IF no checkpoint exists THEN "Retry" SHALL start a fresh run.
5. THE SYSTEM SHALL serialize and restore checkpoint state without loss (round-trip equality), including which oil jars were taken and which notes were found.
6. IF browser storage is unavailable THEN THE SYSTEM SHALL keep the checkpoint in memory for the current session and continue without error.
7. WHEN Kala catches the player THE SYSTEM SHALL play the caught sequence (Kala's silhouette fills the view with a loud strike) before the game-over screen. WHERE the jump-scare toggle is off, the sequence SHALL fade in over at least 1 second within the +6 dB limit.
8. WHEN a checkpoint is restored THE SYSTEM SHALL hide Kala and respawn it at a shadow node at least 10 m path distance from the player.

### Requirement 12: Settings and accessibility

**User Story:** As a player with different needs, I want to tune the game, so that I can enjoy the horror on my own terms.

#### Acceptance Criteria

1. THE SYSTEM SHALL provide settings for: key remapping, mouse sensitivity, invert Y, master/music/effects/voice volume, captions, jump-scare toggle, reduced motion, show numbers, graphics quality (low/high).
2. THE SYSTEM SHALL persist settings across sessions when storage is available.
3. WHEN no saved setting exists AND the OS reports `prefers-reduced-motion: reduce` THE SYSTEM SHALL enable reduced motion by default.
4. THE SYSTEM SHALL meet WCAG 2.2 AA contrast (4.5:1 text, 3:1 large text and UI component boundaries) for all menu and HUD text, including at maximum oil dimming and Sukma distortion. Captions SHALL sit on a backing plate and SHALL never be dimmed or distorted.
5. THE SYSTEM SHALL never communicate state through colour alone.
6. IF the player tries to bind a key already in use THEN THE SYSTEM SHALL show the conflict and let the player swap or cancel.

### Requirement 13: Performance

**User Story:** As a player on an ordinary laptop, I want the game to run smoothly, so that the tension isn't broken by stutter.

#### Acceptance Criteria

1. THE SYSTEM SHALL target 60 fps and stay above 30 fps on integrated graphics at 1080p with quality set to low, measured with the dev performance overlay on a scripted walk through all six areas.
2. THE SYSTEM SHALL use exactly one shadow-casting light.
3. THE SYSTEM SHALL keep the initial download at or below 15 MB.
4. WHEN measured fps stays below 40 for 3 seconds THE SYSTEM SHALL step quality down once (shadow map 512, device pixel ratio 1) and SHALL NOT step it back up during that session.
5. THE SYSTEM SHALL stay within 120 draw calls per frame as counted by `renderer.info`, shadow passes included, with at most 12 shadow-casting draw calls (a point-light shadow renders each caster six times).
6. THE SYSTEM SHALL define two quality presets: low = device pixel ratio 1, shadow map 512, no Bloom or chromatic aberration; high = device pixel ratio up to 1.5, shadow map 1024, all effects.

### Requirement 14: Tutorial

**User Story:** As a first-time player, I want the house to teach me the rules of light before Kala hunts me, so that my first death feels fair.

#### Acceptance Criteria

1. WHEN a fresh run starts THE SYSTEM SHALL show short contextual hints in the pendopo and pringgitan for moving, interacting and cycling the lamp through all three states.
2. WHEN the player first switches the lamp off THE SYSTEM SHALL show a hint explaining that darkness drains Sukma.
3. WHEN the player picks up Semar THE SYSTEM SHALL unlock the "rules of light" journal entry, which explains that Kala moves only inside the shadows the lamp casts, including the player's own, and freezes in darkness.
4. THE SYSTEM SHALL show each hint once per save (not again after Retry or Continue), and every hint SHALL name the currently bound key.
