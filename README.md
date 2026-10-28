# AFTER HOURS — Talley Student Union

**2:13 AM. The union is empty. You’re not alone.** A complete-route first-person psychological horror game in Vite, React, TypeScript, Three.js, React Three Fiber, and Zustand. The Talley edition reuses the Hill game's controller, phone, UI, audio engine, and state-machine architecture; it is not a new project.

**PHONE OPEN = IT APPROACHES. PHONE CLOSED = IT STOPS.** Short glances are safer. A frozen figure is still dangerous if you walk into it. The first balcony encounter cannot kill you; later chapters have safe arrivals, contact-duration catches, and a brief recovery window after closing the phone.

Unofficial fiction, no university affiliation or official logos. The compact layout, event names, lockdown, badge system and emergency controls are invented—not actual building plans or real safety guidance.

## Two preserved editions

- **Talley V3:** `devin/1793162932-talley-v3` — Floors 2–4, atrium, lounges, ballroom corridor and student organizations.
- **Hill V2:** [archive/hill-v2](https://github.com/Aadee1231/AfterHours/tree/archive/hill-v2), also tagged [hill-v2](https://github.com/Aadee1231/AfterHours/tree/hill-v2). The previous library game and its tests remain intact in Git. There is no in-game map selector.

Do not switch editions with unsaved work. Commit/stash your own changes first. Use separate clones if you want to keep both running. Neither edition is automatically merged or deployed by these instructions.

## Play locally

Requires **Node.js 22.12+ or Node 24 LTS**, npm, and a hardware-accelerated desktop browser with a keyboard and mouse. No backend, environment variables, API keys, accounts, downloaded assets, or paid services are needed.

From your existing AfterHours repository terminal, run these **one at a time**:

1. Fetch the published branches:
   ```sh
   git fetch origin
   ```
2. Switch to Talley (creates the local branch if needed):
   ```sh
   git switch devin/1793162932-talley-v3
   ```
3. Install the exact dependencies:
   ```sh
   npm ci
   ```
4. Start on a dedicated port, avoiding another site's localhost server:
   ```sh
   npm run dev -- --port 5187 --strictPort
   ```
5. Open **http://127.0.0.1:5187** on the same computer. Click **ENTER TALLEY**. The 24-second intro is skippable. Click the game to capture the mouse when prompted. The first objective is **Try the main entrance**.

If you have not cloned the project, first run `git clone https://github.com/Aadee1231/AfterHours.git`, then `cd AfterHours`, before the numbered steps. If your local Talley branch already exists after a later update, run `git pull --ff-only` after switching to it.

To revisit Hill, stop the server, run `git switch archive/hill-v2`, then repeat the dependency/start steps. A local branch will track the preserved remote branch; the `hill-v2` tag remains an additional immutable reference.

## Controls

| Input | Action |
| --- | --- |
| WASD / up-down arrows | Walk |
| Mouse | Look |
| Shift | Sprint |
| E | Interact with the nearby marked object / take a stair |
| Q | Open/close phone; close puzzle panel |
| Tab | Cycle phone Messages / Map / Objectives |
| X | Use phone mouse controls / return to looking |
| F | Phone flashlight on/off |
| ? | Toggle extra contextual guidance |
| Esc | Pause / release mouse; close puzzle panel first |
| H | Capture mode: hide nonessential HUD and captions |

Puzzle choices use labeled mouse buttons, not numeric keypad shortcuts. The phone is active during puzzle panels: the threat keeps moving. Close the panel/phone with Q or Esc to freeze it. X releases the cursor for phone controls without pausing danger. Closing a panel attempts mouse recapture; a click-to-look fallback appears if the browser denies it.

Title and pause menus include volume/mute, reduced flashing, Story/Standard difficulty, Low/High graphics, help, and fullscreen. Story mode slows pursuit and offers earlier hints. Standard is the default. Changing tabs or losing window focus pauses normal gameplay; resume by clicking. Volume, mute, reduced flashing, graphics, attempts and Talley best time use local storage. Saving is optional: restricted/private browsing does not block play.

## The route — no obscure code

1. **The Empty Atrium / Floor 2:** try the entrance, find the information desk, read the posted service order, restore backup power. Learn the phone rule with a safe balcony watcher. Chapter checkpoint saved.
2. **Someone’s Still Here / Floor 3:** ascend the visible east white stair. Phone light develops the faded ballroom event-board venue; short glances preserve exposure. Recover the matching event's override badge. Chapter checkpoint saved.
3. **The Last Announcement / Floor 4:** ascend the west white stair, scan the badge, arm the doors, and release the main entrance. Descend through Floor 3 to Floor 2 and use the original main doors for the escape cinematic.

One primary objective stays visible. After 50 seconds without progress, a subtle hint appears; after 95 seconds, guidance becomes explicit. Instructions and discovered information are saved in Messages. The map shows visited floors, landmarks and the player, never the entity. Visible 2.8-second stair animations show actual elevation changes and announce the destination; they are not silently swapped rooms. New-floor placements stay at least 15 metres away with at least 12 seconds' grace. Normal pursuit cannot change floors or cross the atrium void.

Death retries the last completed chapter with the same seeded event venue and switch arrangement; a new run creates a new seed. Checkpoints are in-memory for the current session, not disk saves. Restarting clears the entire route. Escape updates a separate Talley personal best. The first-player design target is **10–15 minutes**, not a measured guarantee or forced minimum; familiar players may finish faster. No long waits or repetitive tasks are added solely to pad duration.

## Build / checks

Run each separately:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

To preview the production output after building:

```sh
npm run preview -- --port 4187 --strictPort
```

Open http://127.0.0.1:4187 on that computer. `dist/` is fully static. Vite warns about the roughly 1.1 MB minified Three.js/rendering chunk (about 300 KB gzip); that warning is not a build failure.

Automated tests cover floor bounds, the upper-floor atrium void, every interaction anchor's connectivity, 30,000 swept collision vectors, 1,000 reproducible seeds, all switch permutations and event venues, intro/onboarding, puzzle recovery/gating, cumulative phone-light exposure, full round-trip progression, actual ending phase, phone freeze/chase across all floors, collision-aware pursuit, safe stair arrivals, grace/contact/death, both checkpoints, pause/reset, timed hints, Story speed, zero-volume persistence, solution hiding, and 1/5/15/30/60 FPS simulation. Unit tests are not evidence of pointer lock, visuals, hardware FPS, speaker output, or blind-player duration. UI verification is reported separately.

## Rendering and architecture

- `src/game/world.ts`: fictional floor elevations, anchors, authoritative collider arrays, seeded puzzles and per-floor routing.
- `src/game/store.ts`: intro / play / stairs / death / escape state machine, progression, checkpoint retry, hints, phone rule and persistence.
- `src/game/Scene.tsx`: actual pointer lock, movement, animated stairs, intro/exit cameras, humanoid animation, adaptive DPR and flashlight.
- `src/game/Library.tsx`: retained environment entry point, now Talley's shared atrium shell, white stairs, columns, glass balconies, skylight, red curved seating and dining.
- `src/game/UpperFloors.tsx`: only the current upper floor's lounge/ballroom or organization details, overhead event board and control station, sequential corridor-light fades.
- `src/game/primitives.tsx`: shared geometry/materials, instanced props and procedural signs.
- `src/game/audio.ts`: original procedural PA chimes/radio-like tones, atmosphere, spatial proximity, surface-aware footsteps and synthesized scare cues. Narrative PA text is captioned/saved; no recorded voice track.
- `src/components/`: phone, map, objective log, and live-threat puzzle panels.

Furniture/structure is instanced where useful; geometry and Lambert/basic materials are shared. The lightweight atrium remains visible while upper-floor detail is conditionally mounted. There are at most two pooled point lights (one on Low), a phone spotlight, no real-time shadows, no MSAA, and an adaptive pixel budget. SwiftShader uses a lower budget automatically. Low/High preserve readable HTML overlays independently of 3D resolution. Hardware acceleration is strongly recommended; **30+ FPS on a typical laptop is a target, not a verified claim**.

## Research / interpretation

Consulted before modeling:

- [NC State Talley maps](https://studentcenters.ncsu.edu/maps/talley/): public floor functions and wayfinding.
- [NC State Talley location](https://studentcenters.ncsu.edu/location/talley/): dining, meeting venues, student spaces and public architecture.
- [Precision Walls project](https://precisionwalls.com/project/talley-student-union/): specialty glass, skylight, columns and acoustic finishes.
- [Cooper Carry project](https://www.coopercarry.com/projects/talley-student-union-north-carolina-state-university/): reference supplied, but HTTP 403 prevented verification; not used to substantiate details.

The visual interpretation emphasizes the multi-story atrium, white stairs and columns, glass balcony rails, red curved couches, tall glazing, skylight, dining and campus-inspired signs. It is a compact authored interpretation, not a measured recreation. No reference photos are shipped as game assets.

## Vercel-ready, not automatically deployed

Import the GitHub repository in Vercel and select the Talley branch. Framework: **Vite**. Install: `npm ci`. Build: `npm run build`. Output: `dist`. Node: **22.x or 24.x**. No environment variables required. `vercel.json` supplies static output settings, security headers and immutable hashed-asset caching. Deployment requires your account/project authorization; no production deployment is made by building locally.

## Limitations / content

- Desktop keyboard/mouse only. No touch controls, gamepad support, fifth explorable floor, alternate endings, multiplayer, or backend.
- Flashing/fading lights, abrupt synthesized sounds and a stalking humanoid; no gore. Reduced flashing limits modulation, not a medical-safety guarantee.
- Embedded/enterprise browsers may deny pointer lock/fullscreen. Use a standalone hardware-accelerated desktop tab.
- Hardware-GPU performance, real-speaker mix/proximity tuning, and truly hidden-tab behavior require device testing. Software-renderer measurements must not be generalized to normal laptops.
- Browser evidence and timings must come from the actual Talley build; the archived Hill results do not verify Talley.
- No licensed soundtrack, downloaded models, external fonts, telemetry, AI services, official logos or real emergency-system instructions.

Original source and generated assets are MIT licensed; see LICENSE. University/building names remain their owners' property; no endorsement is implied.
