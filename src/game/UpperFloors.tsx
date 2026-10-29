import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box, Instances, Sign, type Instance, type XYZ } from './primitives'
import { runtime, useGame } from './store'
import { ANCHORS, OBSTACLES, floorY, type Floor } from './world'

type UpperFloor = 3 | 4
const cream = '#e6e1cd', green = '#293e35', rust = '#984c39', gold = '#b6a06d', purple = '#655978'
const part = (at: XYZ, size: XYZ, color: string): Instance => ({ at, size, color })

/** Shallow closed-door facades on the existing outside walls, not new walls. */
function ClosedDoors({ at, rotation = [0, 0, 0], label, small, ballroom = false }: {
  at: XYZ; rotation?: XYZ; label: string; small: string; ballroom?: boolean
}) {
  const width = ballroom ? 6.4 : 2.5, height = ballroom ? 3.5 : 3.05
  const pieces = useMemo(() => [
    part([0, height / 2, -.055], [width + .18, height + .12, .09], '#c4c5bb'),
    ...[-1, 1].flatMap(side => [
      part([side * width / 4, height / 2, .005], [width / 2 - .06, height, .025], ballroom ? '#8c7558' : '#717980'),
      part([side * width / 4, 1.08, .035], [width / 2 - .3, .075, .035], '#c5c7bd'),
      part([side * width / 4, .22, .025], [width / 2 - .18, .32, .025], '#a7aaa4'),
    ]),
  ], [ballroom, width, height])
  return <group position={at} rotation={rotation}>
    <Instances items={pieces} />
    {!ballroom && <Sign text={label} small={small} at={[0, height + .48, .045]} size={[width + .3, .75]} bg="#343d49" fg={cream} />}
    <Sign text="CLOSED" at={[0, 2.12, .055]} size={[ballroom ? 1.6 : 1.1, .35]} bg={ballroom ? '#69543e' : '#535360'} fg={cream} />
  </group>
}

function Noticeboard({ at, rotation = [0, 0, 0], title, notice, cold = false }: {
  at: XYZ; rotation?: XYZ; title: string; notice: string; cold?: boolean
}) {
  const papers = useMemo(() => [-1, 0, 1].flatMap((x, i) => [
    part([x * .84, -.2, .075], [.66, .63, .014], i === 1 ? '#b7ae93' : cream),
    part([x * .84, .07, .09], [.4, .025, .014], cold ? purple : rust),
    ...[0, 1, 2].map(line => part([x * .84, -.08 - line * .1, .09], [.42 - line * .06, .015, .014], '#7b8174')),
  ]), [cold])
  return <group position={at} rotation={rotation}>
    <Box at={[0, 0, -.025]} size={[3.1, 1.85, .09]} color={cold ? '#666772' : '#947954'} />
    <Instances items={papers} />
    <Sign text={title} small={notice} at={[0, .52, .085]} size={[2.9, .68]} bg={cold ? '#414654' : green} fg={cream} />
  </group>
}

/** Every piece of walk-height furniture fits its matching world.ts obstacle. */
function Furniture({ floor }: { floor: UpperFloor }) {
  const pieces = useMemo(() => {
    const sofa = OBSTACLES[floor].find(o => o.kind === 'sofa')!
    const table = OBSTACLES[floor].find(o => o.kind === 'desk')!
    const side = Math.sign(sofa.x), fabric = floor === 3 ? '#b52f3e' : '#444b4d'
    const items: Instance[] = [
      part([sofa.x, .19, sofa.z], [sofa.w, .29, sofa.d], '#4c5049'),
      part([sofa.x + side * (sofa.w / 2 - .18), .68, sofa.z], [.36, .84, sofa.d], fabric),
      ...[-1, 0, 1].map(i => part([sofa.x - side * .15, .48, sofa.z + i * 1.48], [2.34, .38, 1.42], fabric)),
      ...[-1, 1].map(i => part([sofa.x, .65, sofa.z + i * (sofa.d / 2 - .15)], [sofa.w, .65, .3], fabric)),
      part([table.x, table.h - .06, table.z], [table.w, .12, table.d], floor === 3 ? '#a08b69' : '#b5b6ad'),
      ...[-1, 1].flatMap(x => [-1, 1].map(z => part(
        [table.x + x * (table.w / 2 - .23), (table.h - .12) / 2, table.z + z * (table.d / 2 - .23)],
        [.12, table.h - .12, .12], '#626c69',
      ))),
    ]
    if (floor === 3) {
      // No uncollided chairs; all small detail stays on the collider's tabletop.
      items.push(part([table.x - 1.2, table.h + .045, table.z], [1.2, .09, .72], '#465b4b'))
      items.push(part([table.x + .9, table.h + .14, table.z + .15], [.22, .28, .22], cream))
      items.push(part([table.x + 1.6, table.h + .025, table.z - .25], [.55, .05, .42], '#b99b6d'))
    } else for (const x of [-1.6, 1.6]) {
      items.push(part([table.x + x, table.h + .025, table.z + .3], [1.15, .05, .42], '#586268'))
      items.push(part([table.x + x, table.h + .18, table.z - .3], [.14, .36, .14], '#7a8384'))
      items.push(part([table.x + x, table.h + .52, table.z - .3], [1.18, .61, .12], '#424d54'))
      items.push(part([table.x + x, table.h + .52, table.z - .23], [1.05, .47, .02], '#59676c'))
    }
    return items
  }, [floor])
  return <Instances items={pieces} />
}

/** Millimetre-thin rugs; no duplicate slabs or surfaces across stair holes. */
function FloorFinishes({ floor }: { floor: UpperFloor }) {
  const items = useMemo(() => {
    const warm = floor === 3, base = warm ? '#656a6e' : '#626a70', accent = '#a72d3c'
    const result = [
      part([0, .009, -16.4], [39.5, .012, 4.6], base),
      part([0, .009, 16.3], [39.5, .012, 4.7], warm ? '#707476' : '#697176'),
      part([-19.45, .009, 0], [3, .012, 27], base),
      part([19.45, .009, 0], [3, .012, 27], base),
      part([0, .017, -18.55], [39.5, .008, .48], accent),
      part([0, .017, 18.5], [39.5, .008, .48], accent),
    ]
    for (const x of [-19.9, -19.5, -19.1, 19.1, 19.5, 19.9])
      result.push(part([x, .017, 0], [.045, .008, 25.5], accent))
    for (let x = -18; x <= 18; x += 3)
      result.push(part([x, .018, 16.3], [.12, .008, 4.2], warm ? '#9a3440' : '#89929a'))
    return result
  }, [floor])
  return <Instances items={items} />
}

function EventBoard() {
  const stage = useGame(s => s.boardRead ? 5 : Math.min(5, Math.floor(s.exposure)))
  const venue = useGame(s => s.run.venue)
  const lightOn = useGame(s => s.phone && s.flashlight)
  const { x, z } = ANCHORS.eventBoard
  // Only the event name and instructions develop first. The answer is never
  // exposed until five seconds of accumulated UV light (or boardRead).
  const body = stage >= 5 ? `NIGHT OWL → ${venue}` : [
    'UV EVENT INK · VENUE HIDDEN',
    'NIGHT OWL · INK DETECTED',
    'NIGHT OWL · EVENT VENUE',
    'NIGHT OWL · BADGE LOANS BY VENUE',
    'NIGHT OWL · VENUE ALMOST VISIBLE',
  ][stage]
  const progress = useMemo(() => Array.from({ length: 5 }, (_, i) => part(
    [-1.4 + i * .7, 2.25, .12], [.57, .055, .035], i < stage ? '#c0b9e2' : '#686d67',
  )), [stage])
  return <group position={[x, 0, z]}>
    {/* Suspended above head height: the interaction anchor and ring remain walkable. */}
    <Box at={[0, 3.1, -.07]} size={[5.1, 1.94, .2]} color={green} />
    <Instances items={[
      part([-2.12, 4.32, -.07], [.045, .53, .045], '#c4c2b3'),
      part([2.12, 4.32, -.07], [.045, .53, .045], '#c4c2b3'),
      part([0, 4.08, -.07], [5.2, .08, .24], gold),
    ]} />
    <Sign text="3 · NIGHT OWL EVENT BOARD" small="NORTH LOUNGE / BALLROOM EVENTS" at={[0, 3.67, .045]} size={[4.85, .57]} bg={green} fg={cream} />
    <Sign text={body} small={stage >= 5 ? 'BADGE LOANS ARE FILED BY EVENT VENUE' : lightOn ? `HOLD PHONE LIGHT ON BOARD · ${stage}/5 EXPOSED` : 'OPEN PHONE + FLASHLIGHT · SHORT GLANCES SAVE'} at={[0, 2.96, .055]} size={[4.85, .82]} bg={stage > 0 ? '#41434d' : '#3c493e'} fg={stage > 0 ? '#e4dcf3' : cream} />
    <Instances items={progress} />
    <Sign text="PHONE LIGHT → EVENT BOARD" at={[0, .03, 1.75]} rotation={[-Math.PI / 2, 0, 0]} size={[4.2, .72]} bg={green} fg={cream} />
  </group>
}

function BadgeLoans() {
  const badge = useGame(s => s.badge)
  const revealed = useGame(s => s.boardRead || s.exposure >= 5)
  const venue = useGame(s => s.run.venue)
  const venues = useGame(s => s.run.venues)
  const { z } = ANCHORS.badge
  const westStair = OBSTACLES[3].find(o => o.kind === 'stair' && o.x < 0)!
  return <group position={[westStair.x - westStair.w / 2 - .02, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
    {/* Cabinet lies inside the existing west-stair obstacle, facing its badge anchor. */}
    <Box at={[0, 1.23, -.19]} size={[1.8, 1.75, .36]} color="#707c6f" />
    <Sign text="OVERRIDE BADGE LOANS" small="MATCH THE NIGHT OWL EVENT VENUE" at={[0, 1.79, .005]} size={[1.72, .48]} bg={green} fg={cream} />
    <Sign text={venues.join('\n')} at={[0, 1.15, .005]} size={[1.65, .68]} bg="#545d50" fg={cream} />
    <Sign text={badge ? 'BADGE CHECKED OUT' : revealed ? `NIGHT OWL: ${venue}` : 'READ EVENT BOARD FIRST'} at={[0, .61, .005]} size={[1.65, .3]} bg={badge ? green : '#6d593d'} fg={cream} />
    <Box at={[.63, 2.18, -.04]} size={[.13, .13, .08]} color={badge ? '#9caf8e' : gold} emissive={badge ? '#9caf8e' : gold} intensity={.45} />
  </group>
}

function ReleaseStation() {
  const badge = useGame(s => s.badge)
  const authorized = useGame(s => s.authorized)
  const step = useGame(s => s.releaseStep)
  const { x, z } = ANCHORS.release
  const status = authorized ? 'MAIN ENTRANCE UNLOCKED' : badge ? ['SCAN OVERRIDE BADGE', 'ARM MAIN DOORS', 'RELEASE MAIN ENTRANCE'][Math.min(2, step)] : 'OVERRIDE BADGE REQUIRED'
  const hardware = useMemo(() => [
    part([-1.5, 4.22, -.2], [.055, 1.06, .055], '#a8afb4'),
    part([1.5, 4.22, -.2], [.055, 1.06, .055], '#a8afb4'),
    part([0, 2.9, -.2], [4.25, 1.28, .28], '#4c5960'),
    ...[0, 1, 2].map(i => part([-1.16 + i * 1.16, 2.39, -.035], [.88, .1, .045], authorized || i < step ? '#acc19f' : purple)),
    part([3.03, 3.55, -.2], [1.7, .84, .22], '#4c5960'),
  ], [step, authorized])
  return <group position={[x, 0, z]}>
    {/* Fictional suspended console, minimum clearance >2.2 m: no new collider. */}
    <Instances items={hardware} />
    <Sign text="EMERGENCY EXIT RELEASE" small="FICTIONAL TRAINING SYSTEM" at={[0, 3.78, -.035]} size={[4.5, .7]} bg="#4f455f" fg={cream} />
    <Sign text={status} small={authorized ? 'RETURN: FLOOR 4 → 3 → 2 · MAIN ATRIUM' : '1 SCAN BADGE  ·  2 ARM DOORS  ·  3 RELEASE'} at={[0, 2.97, -.045]} size={[3.95, .8]} bg={authorized ? green : '#343e46'} fg={cream} />
    <Sign text="02:13" small="BUILDING TIME" at={[3.03, 3.55, -.075]} size={[1.55, .7]} bg="#323e37" fg="#d4d6bd" />
    <Sign text="E · OPERATE OVERHEAD CONSOLE" at={[0, .03, 1.5]} rotation={[-Math.PI / 2, 0, 0]} size={[4.3, .72]} bg="#4e455e" fg={cream} />
    <Box at={[0, 2.29, -.05]} size={[3.6, .045, .06]} color={authorized ? '#9cb894' : '#c2b19a'} emissive={authorized ? '#9cb894' : '#c2b19a'} intensity={.5} />
  </group>
}

function StairWayfinding({ floor }: { floor: UpperFloor }) {
  const down = floor === 3 ? ANCHORS.down3 : ANCHORS.down4
  return <>
    <Sign text={`${floor} · DOWN TO ${floor - 1} ↓`} small={floor === 3 ? 'MAIN ATRIUM / EXIT' : 'LOUNGE → FLOOR 2 / EXIT'} at={[floor === 3 ? 21.8 : -21.8, 2.9, down.z - .8]} rotation={[0, floor === 3 ? -Math.PI / 2 : Math.PI / 2, 0]} size={[4.1, 1]} bg={floor === 3 ? green : '#494456'} fg={cream} />
    <Sign text={`↓ ${floor - 1} · STAIRS`} at={[down.x + (floor === 3 ? 2.4 : -2.4), .032, down.z - .7]} rotation={[-Math.PI / 2, 0, 0]} size={[2.5, .85]} bg={green} fg={cream} />
    {floor === 3 && <>
      <Sign text="3 · UP TO 4 ↑" small="STUDENT ORGANIZATIONS / EXIT RELEASE" at={[-21.8, 2.9, ANCHORS.up3.z - .7]} rotation={[0, Math.PI / 2, 0]} size={[4.1, 1]} bg={green} fg={cream} />
      <Sign text="↑ 4 · STAIRS" at={[ANCHORS.up3.x - 2.8, .032, ANCHORS.up3.z - 1]} rotation={[-Math.PI / 2, 0, 0]} size={[2.5, .85]} bg={green} fg={cream} />
    </>}
  </>
}

const lampLocations: Record<UpperFloor, [number, number][]> = {
  3: [[-18.8, -16], [-10, -17.3], [0, -17.3], [11, -17.3], [19.2, -9], [19.2, 3], [19.2, 15], [0, 17.2], [-19.2, 14], [-19.2, 3]],
  4: [[18.5, -15], [19.2, -7], [19.2, 2], [19.2, 13], [10, 17.2], [0, 17.2], [-11, 17.2], [-19.2, 12], [-19.2, 5], [-19.2, -16]],
}

/** Sequential, widely spaced fades in instanced geometry; zero runtime lights. */
function CorridorLamps({ floor }: { floor: UpperFloor }) {
  const root = useRef<THREE.Group>(null)
  const beat = useRef<{ reset: number; start: number | null }>({ reset: -1, start: null })
  const previouslyDark = runtime.triggers.has(`upper-floor-${floor}-lamps`)
  const levels = useRef<number[]>(lampLocations[floor].map((_, i) => previouslyDark && i < lampLocations[floor].length - 2 ? 0 : 1))
  const bright = useMemo(() => new THREE.Color(floor === 3 ? '#ede2bd' : '#dce2e6'), [floor])
  const dark = useMemo(() => new THREE.Color('#5a6262'), [])
  const tint = useMemo(() => new THREE.Color(), [])
  const frames = useMemo(() => [
    ...lampLocations[floor].map(([x, z]) => part([x, 4.27, z], [2.65, .16, .65], floor === 3 ? '#928e7d' : '#8a9196')),
    ...lampLocations[floor].map(([x, z]) => part([x, floor === 3 ? 4.56 : 6.14, z], [.04, floor === 3 ? .4 : 3.5, .04], '#a8aaa4')),
  ], [floor])
  const strips = useMemo(() => lampLocations[floor].map(([x, z], i) => part([x, 4.175, z], [2.42, .035, .46],
    previouslyDark && i < lampLocations[floor].length - 2 ? '#5a6262' : floor === 3 ? '#ede2bd' : '#dce2e6',
  )), [floor, previouslyDark])
  useFrame((_, dt) => {
    const s = useGame.getState(), flag = `upper-floor-${floor}-lamps`
    if (beat.current.reset !== runtime.resetId) {
      beat.current.reset = runtime.resetId
      beat.current.start = runtime.triggers.has(flag) ? runtime.time - 30 : null
    }
    const crossed = floor === 3 ? runtime.player.x < -10 && runtime.player.z < -13 : runtime.player.x > 11 && runtime.player.z < -8
    if (beat.current.start === null && crossed && s.phase === 'playing' && !s.reducedFlashing) {
      beat.current.start = runtime.time
      runtime.triggers.add(flag)
    }
    const mesh = root.current?.children[0] as THREE.InstancedMesh | undefined
    if (!mesh?.isInstancedMesh) return
    let changed = false
    for (let i = 0; i < strips.length; i++) {
      // Last two fixtures remain lit to preserve the stair/return route.
      const extinguished = beat.current.start !== null && runtime.time - beat.current.start > 1.5 + i * 1.85 && i < strips.length - 2
      const target = s.reducedFlashing ? .82 : extinguished ? 0 : 1
      const next = THREE.MathUtils.damp(levels.current[i], target, 1.8, Math.min(dt, .1))
      if (Math.abs(next - levels.current[i]) <= .0001) continue
      changed = true
      levels.current[i] = next
      mesh.setColorAt(i, tint.copy(dark).lerp(bright, next))
    }
    if (changed && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <><Instances items={frames} /><group ref={root}><Instances items={strips} /></group></>
}

function LoungeFloor() {
  return <>
    <FloorFinishes floor={3} /><Furniture floor={3} />
    <ClosedDoors at={[-20.29, 0, 3.7]} rotation={[0, Math.PI / 2, 0]} label="STATE BALLROOM" small="TALLEY · FLOOR 3 / CLOSED AFTER HOURS" ballroom />
    <ClosedDoors at={[7, 0, -21.94]} label="BALLROOM EVENT SUITE" small="EVENT SUPPORT / CLOSED" />
    <Noticeboard at={[21.91, 1.9, 12.5]} rotation={[0, -Math.PI / 2, 0]} title="SOUTH LOUNGE" notice="PLEASE LEAVE THE ATRIUM WALKWAY CLEAR" />
    <Noticeboard at={[-6.5, 1.9, -21.91]} title="TONIGHT IN TALLEY" notice="NIGHT OWL · SEE UV EVENT BOARD IN NORTH LOUNGE" />
    <Sign text="TALLEY / 3" small="NORTH LOUNGE · STATE BALLROOM" at={[-15, 3.55, -21.89]} size={[5.7, 1.2]} bg={green} fg={cream} />
    <Sign text="SOUTH LOUNGE / ATRIUM OVERLOOK" small="3 · EVENT BOARD & BADGE LOANS → NORTH LOUNGE" at={[0, 3.1, 21.89]} rotation={[0, Math.PI, 0]} size={[6.5, 1]} bg={green} fg={cream} />
    <EventBoard /><BadgeLoans /><StairWayfinding floor={3} /><CorridorLamps floor={3} />
  </>
}

function OrganizationFloor() {
  return <>
    <FloorFinishes floor={4} /><Furniture floor={4} />
    <ClosedDoors at={[-21.94, 0, -16.7]} rotation={[0, Math.PI / 2, 0]} label="STUDENT GOVERNMENT" small="401 / CLOSED" />
    <ClosedDoors at={[-21.94, 0, -4.2]} rotation={[0, Math.PI / 2, 0]} label="ORGANIZATION SUITE" small="403 / CLOSED" />
    <ClosedDoors at={[21.94, 0, -5.5]} rotation={[0, -Math.PI / 2, 0]} label="CAMPUS ACTIVITIES" small="406 / CLOSED" />
    <ClosedDoors at={[21.94, 0, 15.7]} rotation={[0, -Math.PI / 2, 0]} label="STUDENT ORGANIZATIONS" small="408 / CLOSED" />
    <Noticeboard at={[-21.91, 1.9, 13.1]} rotation={[0, Math.PI / 2, 0]} title="ORGANIZATION NOTICES" notice="OFFICES CLOSED · PLEASE USE THE MAIN ATRIUM" cold />
    <Noticeboard at={[7.5, 1.9, -21.91]} title="AFTER-HOURS ASSISTANCE" notice="EXIT RELEASE → EAST / OVERRIDE BADGE REQUIRED" cold />
    <Sign text="TALLEY / 4" small="STUDENT ORGANIZATIONS / UPPER LOUNGE" at={[-2, 3.35, -21.89]} size={[6.4, 1.25]} bg="#474556" fg={cream} />
    <Sign text="4 · UPPER LOUNGE" small="↓ 3 LOUNGE / ↓ 2 MAIN ATRIUM · WEST STAIRS" at={[0, 3.05, 21.89]} rotation={[0, Math.PI, 0]} size={[6.4, 1]} bg="#474556" fg={cream} />
    <Sign text="EXIT RELEASE →" small="FICTIONAL TRAINING SYSTEM / NORTH-EAST WALKWAY" at={[21.87, 2.9, -14.5]} rotation={[0, -Math.PI / 2, 0]} size={[4.2, .9]} bg="#9e343b" fg={cream} />
    <ReleaseStation /><StairWayfinding floor={4} /><CorridorLamps floor={4} />
  </>
}

/** Shell, balcony slabs, glass rails, skylight, columns and stairs belong to the atrium root. */
export function UpperFloors() {
  const floor = useGame(s => s.floor) as Floor
  if (floor !== 3 && floor !== 4) return null
  return <group position={[0, floorY(floor), 0]}>{floor === 3 ? <LoungeFloor /> : <OrganizationFloor />}</group>
}
