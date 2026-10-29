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

To be filled with actual capture metadata, performance and self-review after browser validation. Reference photos/comparison boards remain private and outside source/public/build assets.
