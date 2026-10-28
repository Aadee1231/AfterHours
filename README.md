# AFTER HOURS

**02:13 AM. D. H. Hill. Floor 7.** A compact first-person psychological horror game built with Vite, React, TypeScript, Three.js, React Three Fiber, and Drei.

You fell asleep studying. The elevators are dead. Find four numbered records and use their digits to unlock the north emergency stairwell. **While your phone is open, the figure approaches. Put it away and it freezes.** You can walk with it open—but short glances are safer. The figure uses the actual walkable aisles, not teleportation, and can catch you. Don't walk into it even when it is frozen.

An unofficial fan project with a fictional layout, no university affiliation, and no official logos. The architectural reference is [D. H. Hill Bookstacks Floor 7](https://www.lib.ncsu.edu/spaces/bookstacks-floor-7), not its actual floor plan.

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
| E | Read a nearby record with phone open / use stairwell keypad |
| Q | Open or close phone (can remain open while walking) |
| Tab | Switch NOTES / MAP on the phone |
| Left / right arrows | Browse collected records |
| F | Toggle the phone flashlight |
| Esc | Pause / release mouse; close keypad when open |
| H | Toggle capture mode (hides objective, timer, control bar, and narrative captions) |
| Number keys / Enter / Backspace | Operate the keypad (mouse buttons also work) |

Volume and mute are available from title / pause; one-click fullscreen is at the lower right of those screens. How to Survive is available on the title, intro, and pause screens. `Esc` or changing tabs pauses time, movement, the entity, and ambience. Resume always requires a click so pointer lock remains under user control. Closing the keypad offers a click-to-look overlay.

## Objective / pacing

Four records occupy separate zones: the starting reading desk, west study carrels, central returns trolley, and elevator lobby. Their approximate positions appear on the phone map; the entity does not. Read each using **Q**, then **E** when its proximity prompt appears. Every record saves its digit and code position in NOTES. All four records must be found, even if you already know the code. The keypad summarizes collected digits in order. A wrong entry does not soft-lock the game.

The intended first-play experience is approximately 5–8 minutes, depending on exploration and phone use; this is a design target, not a forced minimum or a measured guarantee. Familiar players can finish faster. Running, freezing the figure, and routing around it make the game winnable without requiring precision reflexes.

## Build / checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Preview the production output with `npm run preview`. The generated `dist/` folder is fully static. Tests cover wall and shelf collision, deterministic collision fuzzing, connected paths to every objective, entity freeze / chase / catch, pause, records, missing and invalid codes, win, full reset, and authored scare cooldowns. UI-driven verification is reported separately; these unit tests do not prove pointer lock or rendered appearance.

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

Rendering uses instanced books, reused book geometry/materials, adaptive resolution (DPR capped at 1.5 and a 900k pixel budget), distance fog, and no expensive shadow maps. Software GPUs start at a lower pixel budget; sustained slow frames reduce 3D resolution without blurring the HTML phone or HUD. Simulation substeps preserve movement and elapsed time at low render rates, with a one-second maximum stall catch-up. Hardware acceleration is still recommended. Capture mode preserves the phone and threat indicator so a vertical crop can clearly show the mechanic. Native portrait touch play is not implemented: small touch devices receive a desktop-play notice instead.

## Content and limitations

- Flashing fluorescents, sudden synthesized sounds, and a stalking silhouette. No gore. Not suitable for photosensitive players.
- Desktop first: no touch controls, gamepad support, or mobile-performance guarantee. On smaller touch screens the title explains the requirement.
- First-person pointer lock is intentionally required; embedded/enterprise browsers can block it. Use a standalone desktop tab if your host denies pointer lock/fullscreen.
- Attempts, best time, volume, and mute use version-namespaced local storage. Private browsing can disable saving; play still works.
- No copyrighted soundtrack, imported 3D models, official logos, telemetry, or external assets. Authored scares use one-shot flags and cooldowns, reset on every retry.

## Source license

Original project source and generated art/audio are MIT licensed; see LICENSE. The referenced library's name belongs to its respective owner; no endorsement is implied.
