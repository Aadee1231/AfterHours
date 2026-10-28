# AFTER HOURS

**02:13 AM. D. H. Hill. Floor 7.** A compact first-person psychological horror game built with Vite, React, TypeScript, Three.js, React Three Fiber, and Drei.

Version 2 expands the existing game into three connected zones and three acts: North Tower study carrels, central M–PR bookstacks, and the South Tower maintenance/exit corridor. Check your laptop, investigate a looping stairwell, solve the catalogue and circuit puzzles, recover an erased room number, and interpret four narrative records to escape.

**While your phone is open, the figure approaches. Put it away and it freezes.** You can walk with it open—but short glances are safer. Normal pursuit follows collision-aware aisle paths; authored chapter transitions may reposition the figure at a distance. Don't walk into it even when it is frozen. The opening lesson includes a grace period before contact can kill.

An unofficial fan project with a fictional layout, no university affiliation, and no official logos. The architectural references are [D. H. Hill Bookstacks Floor 7](https://www.lib.ncsu.edu/spaces/bookstacks-floor-7) and [D. H. Hill](https://www.lib.ncsu.edu/hill), not actual floor plans.

## Run locally

Requires Node.js **22.12+** (or Node 24 LTS), npm, and a desktop browser with WebGL / hardware acceleration.

1. Open a terminal in the repository folder.
2. Install dependencies:
   ```sh
   npm ci
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
4. Open `http://localhost:5173` in Chrome, Edge, or Firefox. Click **Enter the library**, then **Wake up**. The click unlocks synthesized audio and captures the mouse. Press **Esc** to release it.

No environment variables, backend, accounts, network assets, AI services, or API keys are required. All geometry, signs, books, textures, and audio are generated locally.

## Controls

| Input | Action |
| --- | --- |
| WASD | Walk |
| Mouse | Look |
| Shift | Sprint |
| E | Interact / read a nearby record with phone open |
| Q | Open or close phone / close puzzle panel |
| Tab | Switch NOTES / MAP / OBJECTIVES on the phone |
| X | Toggle phone mouse controls / return to looking around |
| Left / right arrows | Browse collected records |
| F | Toggle the phone flashlight |
| ? | Show or hide the contextual objective hint |
| Esc | Pause / release mouse; close keypad when open |
| H | Toggle capture mode (hides objective, timer, control bar, and narrative captions) |
| Number keys / Enter / Backspace | Operate the keypad (mouse buttons also work) |

Volume, mute, reduced flashing, and Story/Standard difficulty are available from title / pause; one-click fullscreen is at the lower right of those screens. How to Survive is available on the title, intro, and pause screens. `Esc` or changing tabs pauses time, movement, the entity, and ambience. Resume requires a click so pointer lock remains under user control. Open puzzle panels keep the phone and threat active: closing one attempts to recapture the mouse, with a click-to-look fallback. Use **X** to click phone controls without pausing pursuit; **Tab**, **F**, and the arrow keys also operate the phone while looking around.

## Objective / pacing

The objective log introduces the laptop, North Tower stairs, and first checkout receipt. Later objectives lead through a catalogue matching puzzle, a posted circuit restart order, a nameplate readable only with sustained phone light, and a room archive. Four saved records provide the hour, call-number digit, restored-circuit count, and room-number digit. Interpret them in Roman-numeral order. Return to the original stairwell to break the loop before using the final South Tower access panel.

The phone maps discovered zones and the current objective, never the entity. Its notes show only records actually read. The keypad shows SAVED/MISSING status, not solution digits. All four records and the required progression must be completed even if you guess the code. Wrong choices and incorrect codes are recoverable. Each run randomizes selected record positions, call number, circuit count, room number, and breaker button order from predefined valid possibilities.

The V2 first-play design target is 12–18 minutes, depending on exploration, reading, and phone use; this is not a forced minimum or a measured guarantee. Familiar players can finish faster. Story mode reduces pursuit speed and extends opening grace; Standard is the default. Neither difficulty changes the code logic or objective route.

An assisted browser playthrough using actual movement and UI interactions escaped in **08:41**, after an earlier death and randomized retry. All three zones, puzzles and four records were completed without gameplay-state injection. Separate focused regressions checked keypad keyboard submission, pause/resume, restart, phone controls and the production build. Blind first-play timing is still unverified; the game is not padded with forced waiting to enforce a minimum duration.

## Build / checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Preview the production output with `npm run preview`. The generated `dist/` folder is fully static. Tests cover 10,000 collision vectors, connectivity to every anchor and randomized record position, 1,000 seeded runs, onboarding, catalogue/breaker/light/archive puzzles, record priority at shared anchors, stair loops, missing/wrong/correct codes, entity freeze/chase/grace/catch, pause, full reset, volume persistence, and low-frame-rate simulation. UI-driven verification is reported separately; unit tests do not prove pointer lock, rendered appearance, audible output, or playtime.

## Deploy to Vercel

No secrets or paid services are needed. A Vercel account with permission to create a project is required.

1. Push this source to a GitHub repository you own.
2. In [Vercel New Project](https://vercel.com/new), import that repository.
3. Select **Vite**. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci`. Node.js: **22.x** or **24.x**. Leave environment variables empty.
4. Click **Deploy**. Vercel provides an HTTPS `*.vercel.app` URL. Pointer lock and Web Audio start only after clicking Wake up.

Or, from this directory with an authenticated Vercel CLI:

```sh
npx vercel login
npx vercel --prod
```

The included `vercel.json` supplies the framework, build output, safe response headers, and immutable asset caching. A private Devin preview is **not** a public deployment. Do not claim a production URL until Vercel reports the deployment ready.

## Architecture

- `src/game/world.ts`: fictional layout, collider source of truth, clue data, grid routing, line-of-sight, swept movement.
- `src/game/store.ts`: centralized state machine, run resets, proximity, threat, authored one-shot scares, local persistence.
- `src/game/Scene.tsx`: real pointer lock, first-person camera, movement, flashlight, faceless figure.
- `src/game/Library.tsx`: instanced book spines and bands, modular architecture, furniture, windows, emergency exit.
- `src/game/textures.ts`: deterministic procedural surface/sign textures; no downloaded fonts.
- `src/game/audio.ts`: gesture-unlocked original Web Audio sound design, pause ambience, volume/mute.
- `src/components/`: believable phone and physical-keypad overlay.

Rendering uses per-shelf frustum-culled book batches, low-cost book materials, shared geometry/materials, a two-point-light pool, adaptive resolution (DPR capped at 1.5 and a 1.8M hardware pixel budget), distance fog, and no expensive shadow maps or multisample antialiasing. Memoized scene boundaries prevent HUD updates from rebuilding the whole scene. Software GPUs start at a lower pixel budget; sustained slow frames reduce 3D resolution without blurring the HTML phone or HUD. Simulation substeps preserve movement and elapsed time at low render rates, with a one-second maximum stall catch-up. Hardware acceleration is strongly recommended. Capture mode preserves the phone and threat indicator. Native portrait touch play is not implemented: small touch devices receive a desktop-play notice instead.

## Content and limitations

- Flashing fluorescents, sudden synthesized sounds, and a stalking silhouette. No gore. Reduced flashing removes repeated fluorescent modulation and UI pulses, but is not a medical-safety guarantee.
- Desktop first: no touch controls, gamepad support, or mobile-performance guarantee. On smaller touch screens the title explains the requirement.
- First-person pointer lock is intentionally required; embedded/enterprise browsers can block it. Use a standalone desktop tab if your host denies pointer lock/fullscreen.
- The test VM's SwiftShader software renderer measured about 21 FPS at the starting desk and 7 FPS facing the stacks, with visibly reduced 3D resolution. Hardware-GPU performance remains unverified. Production smoke captured no runtime/network errors; upstream Three.js Clock deprecation and software-driver warnings remain.
- Web Audio generated nonzero output during testing, but speaker audibility, proximity-audio tuning, hidden-tab behavior and the death-lunge presentation need hardware playtesting.
- Attempts, best time, volume, and mute use version-namespaced local storage. Private browsing can disable saving; play still works.
- No copyrighted soundtrack, imported 3D models, official logos, telemetry, or external assets. Authored scares use one-shot flags and cooldowns, reset on every retry.

## Source license

Original project source and generated art/audio are MIT licensed; see LICENSE. The referenced library's name belongs to its respective owner; no endorsement is implied.
