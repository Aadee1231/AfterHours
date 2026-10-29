# Gate A — atrium correction inventory

Scope: central atrium only. No new puzzles, story, UI redesign or dining/upper-room rebuild. Previous build is preserved at `0c2321e` and on the existing Talley/fidelity branches until this correction is reviewed.

## Before inventory

| Module | Existing transforms / mismatch | Correction |
| --- | --- | --- |
| `Library.tsx / Architecture` | Three rectangular ring slabs at y=5/10/15; 44m square shell, roof y=18 | Stepped, unequal atrium openings; layered slab edges, soffits and glazing set behind balconies |
| `Library.tsx / TimberScreens` | Two 9.6m-wide panels at (3.7,4.4,-3.8) and (-4.5,4.9,.6), nearly perpendicular | Two parallel, separated suspended assemblies beside one balcony; unequal drops, thin fins, rails, brackets and roof hangers |
| `Library.tsx / Flight`, `world.ts` | Disconnected small U-stairs at opposite corners | One east-side zigzag bank, broad flights and substantial landings; shared geometry/animation/collision/map data |
| `Library.tsx / Columns` | Four narrow cylinders at x=±11, z=±11.5 | Human-scale cylindrical supports beside the opening and stair landings |
| `Library.tsx / roofGrid` | Flat grid at y=18.07 | Deep primary steel members, secondary mullions, diagonal bracing, recessed dark glazing |
| `textures.ts / glass` | Painted invented skyline on all four walls | Dark reflective glazing, credible adjacent internal facades, no invented skyline |
| `GroundLandmarks` | Main doors visually blend into outer glass | Recessed framed door bay, transom, handles, entrance mat and mounted exit marker; same interaction point |

## Source review

Read the full V4 prompt, scene specification and reference index; examined all four owner comparison boards. Re-examined the full-resolution primary originals: IMG_1042 (hero), IMG_1043 (height), IMG_1047 (stacked stair silhouette), IMG_1055 (landing/underside), IMG_1063 (screen arrangement). The original 38-photo review remains the contextual reference.

Important correction: the primary photos show two screens sharing the same general facade plane, not a pair of perpendicular walls. Their visible bottom heights differ. The stair reads as a continuous stack of long alternating flights with flat ends, not a pair of isolated corner U-stairs. Camera estimates are artistic inferences, not a measured building survey.

## Review captures

First fixture review (`ff90326`) was rejected internally. Open screen fins and the connected stair stack improved, but broad floor undersides still flattened the background. Ray inspection identified the nonplayable overlook underside at y=14.68 and Floor 4 underside at y=9.68, not a vertical wall. Native SwiftShader samples were 22.29 FPS hero / 23.92 FPS stair (10 seconds, DPR .462, 473×354 buffer). This was not gameplay validation.

Correction: join the stair opening to the central void rather than leaving a slab strip across the stair silhouette; set the south edge back to z=9/13/16 across the three tiers; move the hero closer to the screens and view the stair from its opposite side. The hero is inferred from IMG_1042; camera estimates are not survey measurements. Final captures and verification below must supersede those preliminary fixtures. Reference photos/comparison boards remain private and outside source/public/build assets.

Second fixture review (`735682e`) exposed two remaining structural mistakes: a Floor 3 soffit covered the east-side stair camera because it stood outside the opening, and the relocated hero faced the west overhang instead of the reference composition. Those fixtures were rejected internally too.

The stair-side void is now x=20.8, exposing the entire bank from the east. Upper carpet/lamps stay on the remaining deck, and the displaced Floor 4 sofa moves to the west corridor rather than floating over the hole. Glazed fronts at z=11.5/15.4 recess behind the first two south balcony edges; their colliders leave 2m openings centered at x=0 and x=6. Coffered ceiling bays and downlight housings replace featureless soffits. Glass guards leave stair portals rather than spanning the walking path.

## Geometry and camera inventory

- Floor planes y=0/5/10; nonplayable overlook y=15; structural glazing y=18.55. Central void polygons in `world.ts` generate floor holes, void collision and phone-map geometry.
- Stair bank center x=14; each rising flight runs between z=-8 and z=8, with rise 5m, tread width 3.4m, 30 treads, solid underside and white side cheeks. Flat landing segments share `STAIR_PATHS` with forward/reverse camera transitions and the phone map. Two playable floor transitions plus one architectural upper continuation.
- Two parallel screens at z=8.4, center x=3.1/-4.3, width 5.1/5.5, bottom y=4.75/8.15, top y=17.05; open fins at .29m vertical spacing, support bars, brackets and roof hangers. Not solid wood panels.
- Cylindrical columns diameter 1.16m at x=-10.5/18, z=-12.5/13.5. Deep roof primaries (.7m), lower flanges, secondary members and braces. No invented skyline texture.
- Main entrance retains its original interaction at (0,20.5), with a recessed 5.6m-wide framed door bay, glazing, transom, handles and mat. No progression logic moved.

| Fixture | Photo inspiration | Position | Target | Vertical FOV |
| --- | --- | --- | --- | --- |
| Hero | IMG_1042 | (-7,1.67,-9) | (3.5,10.5,7) | 84° |
| Stair | IMG_1047 | (20,1.67,-6) | (14,7,1) | 90° |
| Landing | IMG_1055 | (9.5,6.67,-10) | (-.5,9,8.4) | 78° |

Both lighting modes use the same geometry and transforms. Reference lighting is a development-only inspection aid, not the shipped horror exposure. All camera fixtures are development-only. Diagnostic high-DPR stills must not be described as native gameplay resolution or performance.

## Final review — a7500bc runtime

Six development captures cover hero/stair/landing in reference and actual game lighting. All three diagnostic pairs match camera, FOV, DPR1, 1024×768 buffer and normalized mesh signatures. These are inspection stills, not native-resolution gameplay. Separate native captures and exact JSON metadata accompany the private owner review. Native landing quality differed between modes; use its matched DPR1 pair for geometry comparison. Fixture signatures are not full vertex-buffer hashes or complete game-state snapshots.

Private three-column boards compare IMG_1042/1047/1055 with the corresponding reference/game-lighting stills, without cropping or warping the originals. They are delivered only in the owner session, not committed or uploaded to the PR. The hero is approximately photo-inspired; the landing is contextual, not a close camera match.

### Physical production verification

A fresh Standard run began at the real title/full intro, Floor 2 (4,15), all major progression false and checkpoint0. Actual WASD/mouse/E/Q/phone UI inputs completed entrance → directory/notice → power → Floor3 board/badge → Floor4 release → both descents → original doors and visible victory. No position/progression injection. Entrance interaction took approximately44 seconds for an informed tester; unfamiliar-player navigation remains unverified. Victory displayed11:50 including deliberate deaths, retries and inspections, not blind-play pacing.

Earned checkpoint1/2 deaths and retries, wrong release order, nonrefreshing release grace deadline, phone-open approach/closed freeze, pointer-lock recovery, pause/resume/replay/restart and flashlight board exposure passed. Sampled Floor3 glazing blocked movement while doorways at x=0/6 and the stairs remained traversable; the sampled void boundary stopped movement. This is not exhaustive collision coverage. No captured production exceptions, failed requests or HTTP errors during the observed interval.

28 tests, TypeScript, ESLint, production build and diff check pass. The existing Three.js bundle-size warning remains.

### Native software rendering — ten-second samples

| View | FPS | p95 interval | Draw calls / triangles | DPR / drawing buffer |
| --- | --- | --- | --- | --- |
| Hero fixture | 25.56 | 50.1ms | 226 / 45,446 | .46219 / 473×354 |
| Stair fixture | 23.58 | 66.7ms | 226 / 45,406 | .46219 / 473×354 |
| Earned production Floor4 | 19.93 | 83.4ms | 232 / 44,372 | .45 / 576×378 |

ANGLE/SwiftShader software-low only. These samples remain below30FPS and do not establish hardware-GPU performance. The production view differs from the fixed cameras; it is not a controlled before/after optimization benchmark.

### Remaining visual differences / owner decision

- The major connected stair bank, unequal suspended screens, cylindrical columns and layered gallery openings now read together, but proportions, bay spacing and material response remain approximate, not a measured/photo-exact replica.
- Stair landings and endpoints remain partly cropped in the low-angle fixture; undersides still dominate more than in IMG_1047. The landing fixture differs substantially in orientation and facade placement from IMG_1055.
- Floor sheen, fine screen/rail hardware, glazing reflections and surrounding furnishing density remain simplified. Main-floor spacing is still more open than the photographs. No later-area rebuild was attempted.
- Floor3 phone-map stair labels are crowded, and the Floor4 down-stair sign partly overlaps EXIT RELEASE. Neither blocked the verified escape.
- Hardware GPU, hidden-tab behavior, speaker mix, blind-human onboarding and independently timed opening-lesson safety remain unverified.

Gate A is presented for owner visual review, not declared visually approved. No later environment gate, merge or deployment is authorized by these test results. Hill remains preserved on archive/hill-v2 and hill-v2.
