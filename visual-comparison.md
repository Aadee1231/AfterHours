# Talley — six-camera visual comparison

This report accompanies the photo-informed architecture revision, not the earlier Talley gameplay release. All 38 original photographs were inspected individually. Source photos are private development references and are deliberately not embedded in this repository, public PR media or web assets. The user can compare the filenames below against their original package. Private side-by-side evidence is delivered separately through the session, not deployed.

## Camera checkpoints

Final furnishing/lighting screenshots and physical regression results are pending the current browser verification. Earlier Gate A captures established the signature shell and sampled all four stair animations, but do not verify final furnishing or the complete route.

| Checkpoint | Private reference filenames | Reconstructed features | Remaining simplification |
| --- | --- | --- | --- |
| A — signature atrium | IMG_1042.JPG, IMG_1043.JPG, IMG_1046.JPG | Two individually slatted suspended timber screens; three offset glass-railed balcony tiers; dark skylight lattice; round columns | Compact footprint; simplified screen suspension and roof structure; background overlook is not playable |
| B — white switchback | IMG_1047.JPG, IMG_1055.JPG | Opposing white flights, cross-landings, transparent guards and metal rails; camera follows the same polyline ascending and descending | Two compact U-return connections, not a measured reproduction of the actual stair network |
| C — lobby | IMG_1041.JPG, IMG_1045.JPG, IMG_1049.JPG | Rounded red C seating, gray flecked terrazzo, dark bands, red/white information counter and glazed entrance | Simplified storefront depth, reflected light and glossy finish; no expensive real-time reflections |
| D — Floor 2 dining | IMG_1034.JPG, IMG_1035.JPG, IMG_1037.JPG | Six wood/upholstered booths plus four table groups, counters, queue rail, dark soffit, round fixtures and café glazing | One authored dining cluster, fewer vendors and ceiling folds; furniture is modular low-poly |
| E — Floor 3 ballroom | IMG_1071.JPG, IMG_1056.JPG, IMG_1070.JPG | Red architectural volume and paneled seams, silver lettering, wood doors, gray/red corridor and theatre signage | Corridor remains compact/orthogonal rather than the exact photographed curvature |
| F — Floor 4 overlook | IMG_1061.JPG, IMG_1062.JPG, IMG_1060.JPG | Gray/red carpet, glass rail and study-room fronts, numbered columns, red/black/turquoise furniture and small tables | Fewer enclosed rooms and chairs; distant public spaces are shallow authored facades |

## Verification boundaries

- Gate A: actual browser camera fixtures verified the shell in both reference and story lighting. All 32 sampled cameras for four stair directions matched the shared path without observed slab/guard clipping. These were isolated fixtures, not a physical story playthrough.
- Automated checks on the current architecture/furnishing code: 26 tests, typecheck, lint and production build passed; production dependency audit reported zero vulnerabilities. The pre-existing large Three.js bundle warning remains.
- Hardware-laptop FPS, blind-player pacing and real speaker mix have not been measured. Do not generalize SwiftShader software-renderer cadence to hardware acceleration.
- Nothing is merged or deployed by this report.
