import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box, Instances, Sign, type Instance, type XYZ } from './primitives'
import { UpperFloors } from './UpperFloors'
import { runtime, useGame } from './store'
import { ANCHORS, COLUMNS, ROOM, SOFAS, STAIRS, TABLES, type Floor } from './world'
import { surfaceTexture } from './textures'

// Keep the historical Box export for callers that still import it from Library.
export { Box } from './primitives'

const columnGeometry = new THREE.CylinderGeometry(.47, .47, 1, 12)
const stoolGeometry = new THREE.CylinderGeometry(1, 1, 1, 10)
const beamGeometry = new THREE.BoxGeometry(1, 1, 1)
const concrete = new THREE.MeshLambertMaterial({ color: '#f3f0e7' })
const chalk = new THREE.MeshLambertMaterial({ color: '#fffaf0' })
const upholstery = new THREE.MeshLambertMaterial({ color: '#bf2530', side: THREE.DoubleSide })
const seatMaterial = new THREE.MeshLambertMaterial({ color: '#da3740', side: THREE.DoubleSide })
const glassMaterial = new THREE.MeshBasicMaterial({ color: '#accad0', opacity: .21, transparent: true, depthWrite: false, side: THREE.DoubleSide })
const beamWhite = new THREE.MeshLambertMaterial({ color: '#efeee9' })

type Rect = { x1: number; x2: number; z1: number; z2: number }
const ring: Rect[] = [
  { x1: -22, x2: 22, z1: -22, z2: -10 },
  { x1: -22, x2: 22, z1: 10, z2: 22 },
  { x1: -22, x2: -9, z1: -10, z2: 10 },
  { x1: 9, x2: 22, z1: -10, z2: 10 },
]
// The openings include the complete animated stair runs, including the portions
// that cross the front/back ring strips. A single uncut strip would hide the climb.
const eastOpening: Rect = { x1: 14.3, x2: 17.7, z1: -3, z2: 11 }
const westOpening: Rect = { x1: -17.7, x2: -14.3, z1: -11, z2: 3 }
function subtract(rect: Rect, cut: Rect): Rect[] {
  const x1 = Math.max(rect.x1, cut.x1), x2 = Math.min(rect.x2, cut.x2)
  const z1 = Math.max(rect.z1, cut.z1), z2 = Math.min(rect.z2, cut.z2)
  if (x1 >= x2 || z1 >= z2) return [rect]
  return [
    { x1: rect.x1, x2: x1, z1: rect.z1, z2: rect.z2 },
    { x1: x2, x2: rect.x2, z1: rect.z1, z2: rect.z2 },
    { x1, x2, z1: rect.z1, z2: z1 },
    { x1, x2, z1: z2, z2: rect.z2 },
  ].filter(r => r.x2 - r.x1 > .001 && r.z2 - r.z1 > .001)
}
const slabs = ([3, 4] as Floor[]).flatMap(floor =>
  ring.flatMap(r => (floor === 3 ? [eastOpening, westOpening] : [westOpening]).reduce<Rect[]>((parts, cut) => parts.flatMap(p => subtract(p, cut)), [r]))
    .map(r => ({ at: [(r.x1 + r.x2) / 2, (floor - 2) * 5 - .24, (r.z1 + r.z2) / 2] as XYZ,
      size: [r.x2 - r.x1, .48, r.z2 - r.z1] as XYZ, color: floor === 3 ? '#f5f0e5' : '#e7ebea' })))
const railCaps: Instance[] = [5, 10].flatMap(y => [
  ...[-10, 10].map(z => ({ at: [0, y + 1.11, z] as XYZ, size: [18, .09, .09] as XYZ, color: '#f9f8f3' })),
  ...[-9, 9].map(x => ({ at: [x, y + 1.11, 0] as XYZ, size: [.09, .09, 20] as XYZ, color: '#f9f8f3' })),
])
const fascia: Instance[] = [5, 10].flatMap(y => [
  ...[-10, 10].map(z => ({ at: [0, y - .42, z] as XYZ, size: [18, .36, .22] as XYZ, color: '#fffdf6' })),
  ...[-9, 9].map(x => ({ at: [x, y - .42, 0] as XYZ, size: [.22, .36, 20] as XYZ, color: '#fffdf6' })),
])
const windowGrid: Instance[] = [
  ...[-21.89, 21.89].flatMap(x => [-18, -12, -6, 0, 6, 12, 18].map(z => ({ at: [x, 8.9, z] as XYZ, size: [.14, 17.6, .12] as XYZ, color: '#f4f1e9' }))),
  ...[-21.89, 21.89].flatMap(z => [-18, -12, -6, 0, 6, 12, 18].map(x => ({ at: [x, 8.9, z] as XYZ, size: [.12, 17.6, .14] as XYZ, color: '#f4f1e9' }))),
  ...[4.9, 10, 15.1].flatMap(y => [-21.89, 21.89].flatMap(v => [
    { at: [v, y, 0] as XYZ, size: [.12, .09, 43.8] as XYZ, color: '#e9edea' },
    { at: [0, y, v] as XYZ, size: [43.8, .09, .12] as XYZ, color: '#e9edea' },
  ])),
]
const roofGrid: Instance[] = [
  ...[-12, -6, 0, 6, 12].map(x => ({ at: [x, 18.07, 0] as XYZ, size: [.14, .22, 26] as XYZ, color: '#faf8f3' })),
  ...[-13, -6.5, 0, 6.5, 13].map(z => ({ at: [0, 18.07, z] as XYZ, size: [24, .22, .14] as XYZ, color: '#faf8f3' })),
]
const roofEdge: Instance[] = [
  ...[-18.5, 18.5].map(z => ({ at: [0, 18.06, z] as XYZ, size: [44, .3, 7] as XYZ, color: '#e9eeea' })),
  ...[-17, 17].map(x => ({ at: [x, 18.06, 0] as XYZ, size: [10, .3, 30] as XYZ, color: '#e9eeea' })),
]
const floorBands: Instance[] = [
  ...[-18, 18].map(x => ({ at: [x, .012, 0] as XYZ, size: [.17, .022, 37] as XYZ, color: '#fdf3d6' })),
  ...[-18, 18].map(z => ({ at: [0, .012, z] as XYZ, size: [37, .022, .17] as XYZ, color: '#fdf3d6' })),
  ...[5, 10].flatMap(y => [-10.4, 10.4].map(z => ({ at: [0, y + .015, z] as XYZ, size: [18, .028, .12] as XYZ, color: '#f9f2df' }))),
]

function Columns() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    COLUMNS.forEach(({ x, z }, i) => {
      object.position.set(x, 9, z); object.scale.set(1, ROOM.h, 1); object.updateMatrix()
      ref.current.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  return <instancedMesh ref={ref} args={[columnGeometry, concrete, COLUMNS.length]} dispose={null} />
}

function BalconyGlass() {
  return <>
    {[5, 10].flatMap(y => [
      ...[-10, 10].map(z => <mesh key={`${y}-z${z}`} position={[0, y + .59, z]} material={glassMaterial}><boxGeometry args={[18, 1.03, .035]} /></mesh>),
      ...[-9, 9].map(x => <mesh key={`${y}-x${x}`} position={[x, y + .59, 0]} material={glassMaterial}><boxGeometry args={[.035, 1.03, 20]} /></mesh>),
    ])}
    <Instances items={railCaps} />
  </>
}

// Two opposing, visible white flights. Player transition tracks the very same
// endpoints in STAIRS; the tread bodies and cheek beams sit inside world stair footprints.
function Flight({ index }: { index: number }) {
  const flight = STAIRS[index]
  const { bottom, top } = flight
  const dz = top.z - bottom.z, dy = (flight.to - flight.from) * 5
  const low = (flight.from - 2) * 5
  const length = Math.hypot(dz, dy), angle = -Math.atan2(dy, dz)
  const centerZ = (bottom.z + top.z) / 2
  const steps = useMemo<Instance[]>(() => Array.from({ length: 24 }, (_, i) => ({
    at: [bottom.x, low + (i + .5) * dy / 24, bottom.z + (i + .5) * dz / 24] as XYZ,
    size: [2.8, .18, Math.abs(dz) / 24 + .035] as XYZ, color: i % 2 ? '#f5f3ee' : '#ffffff',
  })), [bottom.x, bottom.z, dz, dy, low])
  const posts = useMemo<Instance[]>(() => [-1, 1].flatMap(side => Array.from({ length: 9 }, (_, i) => ({
    at: [bottom.x + side * 1.45, low + dy * i / 8 + .67, bottom.z + dz * i / 8] as XYZ,
    size: [.055, 1.28, .055] as XYZ, color: '#eceeef',
  }))), [bottom.x, bottom.z, dz, dy, low])
  return <>
    {[-1, 1].map(side => <mesh key={`cheek${side}`} position={[bottom.x + side * 1.42, low + dy / 2 - .21, centerZ]} rotation={[angle, 0, 0]} geometry={beamGeometry} material={chalk} scale={[.2, .36, length]} dispose={null} />)}
    <mesh position={[bottom.x, low + dy / 2 - .23, centerZ]} rotation={[angle, 0, 0]} geometry={beamGeometry} material={chalk} scale={[2.78, .26, length]} dispose={null} />
    <Instances items={steps} />
    {[-1, 1].map(side => <group key={`rail${side}`}>
      <mesh position={[bottom.x + side * 1.52, low + dy / 2 + .65, centerZ]} rotation={[angle, 0, 0]} material={glassMaterial} scale={[.035, 1.05, length]} geometry={beamGeometry} dispose={null} />
      <mesh position={[bottom.x + side * 1.52, low + dy / 2 + 1.17, centerZ]} rotation={[angle, 0, 0]} material={beamWhite} scale={[.07, .065, length]} geometry={beamGeometry} dispose={null} />
    </group>)}
    <Instances items={posts} />
  </>
}

function Architecture() {
  const terrazzo = useMemo(() => surfaceTexture('terrazzo', [11, 11]), [])
  const glass = useMemo(() => surfaceTexture('glass'), [])
  return <>
    <Box at={[0, -.15, 0]} size={[ROOM.w, .3, ROOM.d]} color="#e9e5d8" map={terrazzo} />
    <Instances items={slabs} />
    <Instances items={fascia} />
    <GlowBands />
    <Columns />
    {/* Campus skyline is painted into a lightweight, self-contained nighttime glazing texture. */}
    <mesh position={[0, 8.9, -21.98]}><planeGeometry args={[43.8, 17.8]} /><meshBasicMaterial map={glass} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 8.9, 21.98]} rotation={[0, Math.PI, 0]}><planeGeometry args={[43.8, 17.8]} /><meshBasicMaterial map={glass} side={THREE.DoubleSide} /></mesh>
    {[-1, 1].map(side => <mesh key={side} position={[side * 21.98, 8.9, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[43.8, 17.8]} /><meshBasicMaterial map={glass} side={THREE.DoubleSide} /></mesh>)}
    <Instances items={windowGrid} />
    {/* Roof ring leaves a real 24 x 26 m skylit aperture, not a solid ceiling. */}
    <Instances items={roofEdge} />
    <mesh position={[0, 17.97, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[24, 26]} /><meshBasicMaterial color="#748f9b" transparent opacity={.38} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <Instances items={roofGrid} />
    <BalconyGlass />
    {STAIRS.map((_, i) => <Flight key={i} index={i} />)}
    <Sign text="02 / MAIN ATRIUM" small="← POWER CONTROL    ·    INFORMATION    ·    FLOOR 3 STAIRS →" at={[0, 3.35, 13.7]} size={[8.5, 1.02]} bg="#9e1c2b" fg="#fff8e8" />
    <Sign text="02 / MAIN ATRIUM" small="← POWER CONTROL    ·    INFORMATION    ·    FLOOR 3 STAIRS →" at={[0, 3.35, 13.66]} rotation={[0, Math.PI, 0]} size={[8.5, 1.02]} bg="#9e1c2b" fg="#fff8e8" />
    <Sign text="↑ FLOOR 3 / LOUNGE" small="BALLROOM / NORTH LOUNGE" at={[18.85, 2.75, 11.3]} size={[3.35, .74]} bg="#992534" />
    <Sign text="↑ FLOOR 4 / ORGANIZATIONS" small="EMERGENCY EXIT RELEASE" at={[-18.85, 7.75, -11.3]} rotation={[0, Math.PI, 0]} size={[3.45, .74]} bg="#942936" />
    <Sign text="02  /  MAIN ATRIUM" small="INFORMATION    ·    DINING    ·    ENTRANCE" at={[0, 3.3, -21.86]} size={[7.5, .9]} bg="#a62230" />
    <Sign text="FLOOR 3  /  LOUNGE" small="↑ FLOOR 4 WEST STAIR    ·    ↓ ATRIUM EAST STAIR" at={[0, 7.8, -21.86]} size={[7.5, .82]} bg="#ad734a" />
    <Sign text="FLOOR 4  /  ORGANIZATIONS" small="EMERGENCY CONTROL    ·    ↓ FLOOR 3 WEST STAIR" at={[0, 12.8, -21.86]} size={[7.5, .82]} bg="#53727a" />
  </>
}

function curvedBand(inner: number, outer: number, height: number) {
  const start = .43, end = Math.PI * 2 - .43
  const shape = new THREE.Shape()
  shape.moveTo(inner * Math.cos(start), inner * Math.sin(start))
  shape.lineTo(outer * Math.cos(start), outer * Math.sin(start))
  shape.absarc(0, 0, outer, start, end, false)
  shape.lineTo(inner * Math.cos(end), inner * Math.sin(end))
  shape.absarc(0, 0, inner, end, start, true)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSegments: 1, bevelThickness: .035, bevelSize: .035, curveSegments: 22 })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}
const seatGeometry = curvedBand(1.27, 2.05, .30)
const backGeometry = curvedBand(1.94, 2.12, .76)
const islandTops: Instance[] = SOFAS.map(({ x, z }) => ({ at: [x, .38, z], size: [.68, .055, .68], color: '#e5cfad' }))
function Sofas() {
  return <>
    {SOFAS.map(({ x, z }) => <group key={`${x}/${z}`} position={[x, 0, z]}>
      <mesh geometry={seatGeometry} material={seatMaterial} position={[0, .39, 0]} scale={[1.27, 1, 1]} dispose={null} />
      <mesh geometry={backGeometry} material={upholstery} position={[0, .36, 0]} scale={[1.27, 1, 1]} dispose={null} />
    </group>)}
    <Instances items={islandTops} />
  </>
}

const tableParts: Instance[] = TABLES.flatMap(({ x, z }) => [
  { at: [x, .72, z] as XYZ, size: [2.12, .09, .77] as XYZ, color: '#e2ceae' },
  { at: [x, .35, z] as XYZ, size: [.13, .68, .13] as XYZ, color: '#e8e1d5' },
  ...[-.73, .73].map(dx => ({ at: [x + dx, .38, z] as XYZ, size: [.07, .72, .07] as XYZ, color: '#faf8f2' })),
])
const stoolPositions = TABLES.flatMap(({ x, z }) => [-.46, .46].flatMap(dx => [-.4, .4].map(dz => [x + dx, .46, z + dz] as XYZ)))
const chairFrames: Instance[] = [
  ...stoolPositions.map(([x, , z]) => ({ at: [x, .22, z] as XYZ, size: [.055, .43, .055] as XYZ, color: '#e8e5df' })),
  ...TABLES.flatMap(({ x, z }) => [-.46, .46].flatMap(dx => [-1, 1].map(side => ({
    at: [x + dx, .73, z + side * .6] as XYZ, size: [.35, .42, .045] as XYZ, color: '#a12e39',
  })))),
]
function Stools() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    stoolPositions.forEach((p, i) => { object.position.set(...p); object.scale.set(.22, .1, .22); object.updateMatrix(); ref.current.setMatrixAt(i, object.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  return <>
    <instancedMesh ref={ref} args={[stoolGeometry, undefined, stoolPositions.length]} dispose={null}><meshLambertMaterial color="#9b2933" /></instancedMesh>
    <Instances items={chairFrames} />
  </>
}
function Dining() {
  const foodCases: Instance[] = [
    ...[-6, 0, 6].map(x => ({ at: [x, .68, -20] as XYZ, size: [5.3, 1.36, 1.3] as XYZ, color: '#f1eee5' })),
    ...[-6, 0, 6].map(x => ({ at: [x, 1.41, -20] as XYZ, size: [5.4, .10, 1.35] as XYZ, color: '#b13235' })),
    ...[-6, 0, 6].map(x => ({ at: [x, 1.96, -20.48] as XYZ, size: [5, .73, .08] as XYZ, color: '#e7dfcb' })),
  ]
  return <>
    <Instances items={foodCases} />
    <Sign text="ONE EARTH" small="CLOSED  ·  SERVICE RESUMES 07:00" at={[-6, 2.13, -20.41]} size={[4.3, .6]} bg="#9e2732" />
    <Sign text="DINING / PAVILIONS" small="CLOSED FOR THE NIGHT" at={[4, 2.13, -20.41]} size={[6.4, .6]} bg="#a42b34" />
    <Instances items={tableParts} />
    <Stools />
    <Sign text="DINING    ←" small="COUNTERS / NORTH ATRIUM" at={[-15, 2.9, -21.83]} size={[4, .58]} bg="#a22a36" />
  </>
}

function GroundLandmarks() {
  const power = useGame(s => s.power)
  const authorized = useGame(s => s.authorized)
  const fixtures: Instance[] = [
    { at: [-9, .57, 16], size: [5, 1.14, 1.08], color: '#f3eee5' },
    { at: [-9, 1.1, 15.46], size: [5, .13, .12], color: '#ae2736' },
    { at: [-18.9, 1.1, ANCHORS.power.z], size: [.37, 2.13, 1.48], color: '#efece3' },
    { at: [-18.83, 1.06, ANCHORS.powerNotice.z], size: [.22, 2, 2.0], color: '#f5f0e6' },
    ...[-1.55, 1.55].map(x => ({ at: [x, 1.62, 21.89] as XYZ, size: [.09, 3.25, .11] as XYZ, color: '#f6f5ec' })),
    { at: [0, 3.22, 21.89], size: [4.4, .10, .10], color: '#fcfbf4' },
    ...[-.22, .22].map(x => ({ at: [x, 1.02, 21.85] as XYZ, size: [.05, .42, .10] as XYZ, color: '#f8dfad' })),
    { at: [0, 1.65, 21.88], size: [.07, 3.12, .1], color: '#f9f6ed' },
  ]
  return <>
    <Instances items={fixtures} />
    {[-.8, .8].map(x => <mesh key={x} position={[x, 1.62, 21.87]} material={glassMaterial}><planeGeometry args={[1.48, 2.98]} /></mesh>)}
    <Sign text="INFORMATION" small="FLOOR DIRECTORY / ASK HERE" at={[-9, 1.22, 15.39]} rotation={[0, Math.PI, 0]} size={[3.95, .53]} bg="#a32735" />
    <Sign text="TALLEY STUDENT UNION" small="FLOOR 2 / MAIN ATRIUM" at={[-9, 2.15, 16.63]} size={[4.6, .64]} bg="#f3efe3" fg="#a42b38" />
    <Sign text="EMERGENCY POWER" small={power ? 'BACKUP SUPPLY RESTORED' : 'APPROACH FROM THE EAST'} at={[-18.68, 1.8, ANCHORS.power.z]} rotation={[0, Math.PI / 2, 0]} size={[1.3, .57]} bg={power ? '#396759' : '#a12731'} />
    <Sign text={'ISOLATE DINING\nPRIME BATTERY\nCONNECT ATRIUM'} small="POWER RESTORE / POSTED SEQUENCE" at={[-18.7, 1.73, ANCHORS.powerNotice.z]} rotation={[0, Math.PI / 2, 0]} size={[2.0, .95]} bg="#a02735" />
    <Sign text={authorized ? 'MAIN ENTRANCE / OPEN' : 'MAIN ENTRANCE / LOCKED'} small="TALLEY STUDENT UNION  /  EXIT" at={[0, 3.7, 21.85]} rotation={[0, Math.PI, 0]} size={[6.9, .78]} bg={authorized ? '#386757' : '#ac2734'} />
    <Sign text="← POWER CONTROL" small="NORTHWEST / MAINTENANCE" at={[-16.9, 2.9, 15]} rotation={[0, Math.PI / 2, 0]} size={[2.8, .65]} bg="#a12735" />
    <Dining />
  </>
}

function GlowBands() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff2d9', toneMapped: false }), [])
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    floorBands.forEach(({ at, size }, i) => {
      object.position.set(...at); object.scale.set(...size); object.updateMatrix()
      ref.current.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  useFrame(() => {
    const s = useGame.getState()
    const dim = runtime.triggers.has('corridor-lights') && s.floor === 4 ? .82 : 1
    material.color.set('#fff1d7').multiplyScalar((s.power ? 1 : .7) * dim)
  })
  return <instancedMesh ref={ref} args={[beamGeometry, material, floorBands.length]} dispose={null} />
}

const ceilingStrips: Instance[] = [
  ...[-16, 16].flatMap(x => [-16, -6, 6, 16].map(z => ({ at: [x, 17.74, z] as XYZ, size: [.13, .03, 4.7] as XYZ, color: '#fff4e0' }))),
  ...[-15, 15].flatMap(z => [-15, -5, 5, 15].map(x => ({ at: [x, 17.74, z] as XYZ, size: [4.7, .03, .13] as XYZ, color: '#fff4e0' }))),
]
function AtriumLights() {
  const lights = useRef<THREE.PointLight[]>([])
  useFrame(({ camera }, dt) => {
    const s = useGame.getState()
    const flicker = !s.reducedFlashing && runtime.time < s.flickerUntil ? .87 + .13 * Math.sin(runtime.time * 7) : 1
    const centers = [
      { x: -11, y: 3.5, z: 9, color: '#ffe3bd' },
      { x: 11, y: 8.7, z: -4, color: '#d9ebf2' },
      { x: -10, y: 12.5, z: -11, color: '#e9eff2' },
      { x: 9, y: 3.6, z: -16, color: '#ffebcc' },
    ].sort((a, b) => ((a.x - camera.position.x) ** 2 + (a.y - camera.position.y) ** 2 + (a.z - camera.position.z) ** 2)
      - ((b.x - camera.position.x) ** 2 + (b.y - camera.position.y) ** 2 + (b.z - camera.position.z) ** 2))
    lights.current.forEach((light, i) => {
      const source = centers[i]
      if (!source) return
      light.position.set(source.x, source.y, source.z)
      light.color.set(source.color)
      light.intensity = THREE.MathUtils.damp(light.intensity, (s.power ? 5 : 2.1) * flicker * (s.authorized ? .92 : 1), 3, dt)
    })
    // No third light: these emissive strips and two nearby pooled lights keep
    // the white architectural volume legible even during backup-power loss.
  })
  return <>
    <Instances items={ceilingStrips} />
    {[0, 1].map(i => <pointLight key={i} ref={node => { if (node) lights.current[i] = node }} intensity={0} distance={18} decay={2} />)}
  </>
}

export const Library = memo(function Library() {
  const floor = useGame(s => s.floor)
  return <>
    <Architecture />
    <Sofas />
    {floor === 2 && <GroundLandmarks />}
    <UpperFloors />
    <AtriumLights />
  </>
})
