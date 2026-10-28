import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ANCHORS, CARRELS, DESKS, OBSTACLES, ROOM, SHELF_X, SHELF_Z } from './world'
import { recordAvailable, runtime, useGame } from './store'
import { signTexture, surfaceTexture } from './textures'

type XYZ = [number, number, number]
type Instance = { at: XYZ; size: XYZ; color: string }
const cube = new THREE.BoxGeometry(1, 1, 1)
const spinePlane = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2)
const materials = new Map<string, THREE.MeshStandardMaterial>()
let deskWood: THREE.Texture | null = null

// The world module owns every obstacle. Decorative furniture never adds new collision geometry.
export function Box({ at, size, color, roughness = 0.85, metalness = 0, map, emissive, intensity = 0 }: { at: XYZ; size: XYZ; color: string; roughness?: number; metalness?: number; map?: THREE.Texture; emissive?: string; intensity?: number }) {
  const key = [color, roughness, metalness, map?.uuid, emissive, intensity].join('/')
  let material = materials.get(key)
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness, map: map ?? null, emissive: emissive ?? '#000000', emissiveIntensity: intensity })
    materials.set(key, material)
  }
  return <mesh geometry={cube} material={material} position={at} scale={size} dispose={null} />
}

function Instances({ items, metalness = 0, roughness = .85, simple = false, plane = false }: { items: Instance[]; metalness?: number; roughness?: number; simple?: boolean; plane?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const object = new THREE.Object3D(), color = new THREE.Color()
    items.forEach((item, i) => {
      object.position.set(...item.at); object.scale.set(...item.size); object.updateMatrix()
      ref.current.setMatrixAt(i, object.matrix); ref.current.setColorAt(i, color.set(item.color))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingBox()
    ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[plane ? spinePlane : cube, undefined, items.length]} dispose={null}>
    {simple ? <meshLambertMaterial color="white" side={plane ? THREE.DoubleSide : THREE.FrontSide} /> : <meshStandardMaterial color="white" metalness={metalness} roughness={roughness} />}
  </instancedMesh>
}

function Sign({ text, at, size, rotation = [0, 0, 0], small, bg, fg, glow = .16 }: { text: string; at: XYZ; size: [number, number]; rotation?: XYZ; small?: string; bg?: string; fg?: string; glow?: number }) {
  const map = useMemo(() => signTexture(text, { small, bg, fg }), [text, small, bg, fg])
  return <mesh position={at} rotation={rotation}>
    <planeGeometry args={size} />
    <meshStandardMaterial map={map} color="white" emissive="#e4e2cb" emissiveMap={map} emissiveIntensity={glow} roughness={.9} />
  </mesh>
}

const northDesks = DESKS.filter(p => p.z < -19)
const centralDesks = DESKS.filter(p => Math.abs(p.z) < 19)
const southDesks = DESKS.filter(p => p.z > 19)
const stacks = SHELF_X.flatMap((x, i) => SHELF_Z.map((z, row) => ({ x, z, i, row })))

function Architecture() {
  const tex = useMemo(() => ({
    north: surfaceTexture('floor', [10, 7]), stacks: surfaceTexture('floor', [10, 9]), south: surfaceTexture('carpet', [12, 8]),
    ceilingNorth: surfaceTexture('ceiling', [10, 7]), ceilingStacks: surfaceTexture('ceiling', [10, 9]), ceilingSouth: surfaceTexture('ceiling', [10, 7]),
    brick: surfaceTexture('brick', [7, 3]), partition: surfaceTexture('brick', [4, 3]), wall: surfaceTexture('wall', [8, 4]),
  }), [])
  // The wall, column, shelf and desk footprints are all taken from OBSTACLES.
  const columns = useMemo<Instance[]>(() => OBSTACLES.filter(o => o.kind === 'column').map(o => ({ at: [o.x, o.h / 2, o.z], size: [o.w, o.h, o.d], color: '#816b57' })), [])
  const baseboards = useMemo<Instance[]>(() => [
    ...OBSTACLES.filter(o => o.kind === 'wall').map(o => ({ at: [o.x + (Math.abs(o.x) > 20 ? (o.x > 0 ? -.24 : .24) : 0), .13, o.z + (Math.abs(o.z) > 44 ? (o.z > 0 ? -.24 : .24) : 0)] as XYZ, size: [o.w > o.d ? o.w : .07, .26, o.d > o.w ? o.d : .07] as XYZ, color: '#39483b' })),
    ...OBSTACLES.filter(o => o.kind === 'column').map(o => ({ at: [o.x, .13, o.z] as XYZ, size: [o.w + .08, .26, o.d + .08] as XYZ, color: '#354137' })),
  ], [])
  return <>
    <Box at={[0, -.095, -31.5]} size={[ROOM.w, .19, 25]} color="#ffffff" map={tex.north} />
    <Box at={[0, -.095, 0]} size={[ROOM.w, .19, 38]} color="#ffffff" map={tex.stacks} />
    <Box at={[0, -.095, 31.5]} size={[ROOM.w, .19, 25]} color="#ffffff" map={tex.south} />
    <Box at={[0, ROOM.h + .08, -31.5]} size={[ROOM.w, .16, 25]} color="#d9dbcb" map={tex.ceilingNorth} />
    <Box at={[0, ROOM.h + .08, 0]} size={[ROOM.w, .16, 38]} color="#c6ceba" map={tex.ceilingStacks} />
    <Box at={[0, ROOM.h + .08, 31.5]} size={[ROOM.w, .16, 25]} color="#d9dbcb" map={tex.ceilingSouth} />
    {OBSTACLES.filter(o => o.kind === 'wall').map((o, i) => <Box key={i} at={[o.x, o.h / 2, o.z]} size={[o.w, o.h, o.d]}
      color="#ffffff" map={Math.abs(o.z) === 19 || o.z < -19 ? tex.partition : Math.abs(o.x) > 20 ? tex.brick : tex.wall} />)}
    <Instances items={columns} />
    <Instances items={baseboards} />
    {[-40, -34, -27, -22, 23, 29, 36, 41].map((z, i) => <Window key={z} x={i % 2 ? -19.95 : 19.95} z={z} />)}
    <Sign text="D. H. HILL / FLOOR SEVEN" small="NORTH TOWER  ·  STUDY CARRELS / 7200s" at={[0, 2.95, -43.94]} size={[5, .58]} />
    <Sign text="02:13" small="THE CLOCK HAS STOPPED" at={[-11, 2.42, -43.93]} size={[1.35, .66]} bg="#23392e" fg="#d9d7b9" glow={.36} />
    <Sign text="CENTRAL / M–PR" small="CALL NUMBERS RUN NORTH TO SOUTH" at={[0, 2.85, -18.75]} size={[4.5, .65]} />
    <Sign text="SOUTH TOWER / 7400s" small="MAINTENANCE  ·  ARCHIVE  ·  ACCESS" at={[0, 2.85, 19.25]} rotation={[0, Math.PI, 0]} size={[4.7, .65]} />
    <Sign text="← STAIR 07     CARRELS / 7200s" at={[-9, 2.85, -29]} size={[4.3, .42]} />
    <Sign text="← CATALOGUE      M–PR STACKS      SOUTH →" at={[0, 2.95, -19.35]} rotation={[0, Math.PI, 0]} size={[6.2, .45]} />
    <Sign text="← ARCHIVE     7400s / MAINTENANCE →" at={[0, 2.9, 19.35]} rotation={[0, Math.PI, 0]} size={[6, .48]} />
    <Sign text="FLOOR DIRECTORY" small="NORTH 7200s  /  STACKS M–PR  /  SOUTH 7400s" at={[ANCHORS.directory.x, 2.12, ANCHORS.directory.z]} rotation={[0, Math.PI, 0]} size={[3.4, .66]} />
    <Sign text="FLOOR DIRECTORY" small="NORTH 7200s  /  STACKS M–PR  /  SOUTH 7400s" at={[ANCHORS.directory.x, 2.12, ANCHORS.directory.z + .02]} size={[3.4, .66]} />
    <Lights />
  </>
}

function Window({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <Box at={[0, 2.05, 0]} size={[.032, 1.55, 1.14]} color="#101d20" roughness={.25} metalness={.2} />
    <Box at={[x > 0 ? -.03 : .03, 2.06, 0]} size={[.025, 1.45, 1]} color="#243e3d" emissive="#274541" intensity={.27} />
    {[-.59, .59].map(offset => <Box key={offset} at={[0, 2.05, offset]} size={[.085, 1.7, .055]} color="#555e53" />)}
    {[1.27, 2.82].map(y => <Box key={y} at={[0, y, 0]} size={[.09, .07, 1.24]} color="#677262" />)}
    <Box at={[0, 2.05, 0]} size={[.09, 1.58, .035]} color="#576a63" />
    <Box at={[x > 0 ? -.13 : .13, 1.23, 0]} size={[.36, .08, 1.38]} color="#888b7b" />
  </group>
}

function Lights() {
  const fixtures: { at: XYZ; failing?: boolean; south?: boolean }[] = [
    ...[-37, -28, -23].flatMap(z => [-10, 10].map(x => ({ at: [x, 3.48, z] as XYZ, failing: x === -10 && z !== -23 }))),
    ...[-15, -7, 2, 11].flatMap(z => [-3, 9].map(x => ({ at: [x, 3.48, z] as XYZ }))),
    ...[24, 31, 38].flatMap(z => [-10, 10].map(x => ({ at: [x, 3.48, z] as XYZ, south: true }))),
  ]
  const lights = useRef<THREE.PointLight[]>([])
  useFrame(({ camera }, dt) => {
    const s = useGame.getState(), damping = s.reducedFlashing ? 1.2 : 4
    const sources = [
      { at: [-11, 2.8, -36], color: '#decfa8', intensity: runtime.triggers.has('first-clue') ? 2 : 7, range: 11 },
      { at: [-3, 3, -15], color: '#d0d9b9', intensity: 6, range: 11 },
      { at: [5, 3, 3], color: '#c8dbc4', intensity: 7, range: 14 },
      { at: [4, 3, 33], color: '#d9dac0', intensity: s.power ? runtime.time < s.climaxUntil ? 4 : 8 : 2.2, range: 16 },
    ].sort((a, b) => Math.hypot(a.at[0] - camera.position.x, a.at[2] - camera.position.z) - Math.hypot(b.at[0] - camera.position.x, b.at[2] - camera.position.z))
    lights.current.forEach((light, i) => {
      const source = sources[i]
      light.position.set(source.at[0], source.at[1], source.at[2]); light.color.set(source.color); light.distance = source.range
      light.intensity = THREE.MathUtils.damp(light.intensity, source.intensity, damping, dt)
    })
  })
  return <>
    {fixtures.map((p, i) => <Fluorescent key={i} {...p} />)}
    {[0, 1].map(i => <pointLight key={i} ref={node => { if (node) lights.current[i] = node }} intensity={0} decay={2} />)}
  </>
}

function Fluorescent({ at, failing, south }: { at: XYZ; failing?: boolean; south?: boolean }) {
  const tube = useRef<THREE.MeshStandardMaterial>(null!)
  const darkAt = useRef<number | null>(null)
  useFrame(() => {
    if (!tube.current) return
    const s = useGame.getState()
    if (!runtime.triggers.has('first-clue')) darkAt.current = null
    else if (failing && at[2] === s.run.positions[0].z && darkAt.current === null) darkAt.current = runtime.time
    let brightness = south ? s.power ? .95 : .24 : 1
    if (failing && darkAt.current !== null) {
      const t = runtime.time - darkAt.current
      // One authored failure, then darkness for the rest of the run. Reduced flashing fades safely.
      brightness = Math.max(0, 1 - t / (s.reducedFlashing ? 2.7 : 2))
      if (!s.reducedFlashing && t < 1.35 && Math.sin(t * 22) > .25) brightness *= .14
    }
    if (south && s.power && runtime.time < s.flickerUntil && !s.reducedFlashing) brightness *= .83 + .17 * Math.sin(runtime.time * 9)
    tube.current.emissiveIntensity = brightness * 1.8
    tube.current.color.setScalar(.045 + brightness * .72)
  })
  return <group position={at}>
    <Box at={[0, 0, 0]} size={[.5, .12, 2.05]} color="#647167" metalness={.5} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.074, 0]}>
      <planeGeometry args={[.34, 1.88]} />
      <meshStandardMaterial ref={tube} color="#e4e7d6" emissive="#cbdac3" emissiveIntensity={south ? .43 : 1.8} />
    </mesh>
  </group>
}

function Books() {
  const items = useMemo(() => {
    const palette = ['#655a42', '#30483e', '#754837', '#6e6b52', '#41594a', '#9c8861', '#353c3b', '#70795d', '#394e53']
    let seed = 427
    const rand = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 }
    return stacks.map(({ x, z }) => {
      const volumes: Instance[] = [], stripes: Instance[] = []
      for (const side of [-1, 1]) for (let level = 0; level < 5; level++) {
      let cursor = -4.68
      while (cursor < 4.58) {
        const width = .075 + rand() * .09, height = .31 + rand() * .13, depth = .43 + rand() * .08
        const at: XYZ = [x + side * .48, .33 + level * .49 + height / 2, z + cursor]
        volumes.push({ at, size: [depth, height, width], color: palette[Math.floor(rand() * palette.length)] })
        stripes.push({ at: [at[0] + side * (depth / 2 + .004), at[1] + height * .24, at[2]], size: [1, .009, width * .8], color: rand() > .5 ? '#c6b589' : '#a6b5a2' })
        cursor += width + .018
        if (rand() > .97) cursor += .22
      }
      }
      return { volumes, stripes }
    })
  }, [])
  return <>{items.map((shelf, i) => <group key={i}><Instances items={shelf.volumes} simple /><Instances items={shelf.stripes} simple plane /></group>)}</>
}

function Stacks() {
  const metal = useMemo<Instance[]>(() => stacks.flatMap(({ x, z }) => [
    { at: [x, 1.43, z], size: [.08, 2.85, 10], color: '#46564d' },
    { at: [x, 1.43, z - 4.97], size: [1.45, 2.85, .07], color: '#708074' },
    { at: [x, 1.43, z + 4.97], size: [1.45, 2.85, .07], color: '#708074' },
    ...[.22, .72, 1.21, 1.70, 2.19, 2.68].map(y => ({ at: [x, y, z] as XYZ, size: [1.45, .045, 10] as XYZ, color: '#727e71' })),
    ...[-.68, .68].flatMap(side => [-4.8, 0, 4.8].map(dz => ({ at: [x + side, 1.4, z + dz] as XYZ, size: [.05, 2.8, .06] as XYZ, color: '#34463e' }))),
  ]), [])
  const labels = [
    ['M — ML', 'ML — MT', 'N — NB', 'NC — NX', 'P — PA'],
    ['PB — PE', 'PF — PG', 'PH — PJ', 'PK — PN', 'PQ — PR'],
  ]
  return <><Books /><Instances items={metal} metalness={.55} roughness={.52} />
    {stacks.map(({ x, z, i, row }) => <group key={`${x}/${z}`}>
      <Sign text={labels[row][i]} small={`FLOOR 7  /  ${row ? 'SOUTH' : 'NORTH'} AISLE ${i + 1}`} at={[x, 2.47, z - 5.025]} rotation={[0, Math.PI, 0]} size={[1.36, .43]} />
      <Sign text={labels[row][i]} small={`FLOOR 7  /  ${row ? 'SOUTH' : 'NORTH'} AISLE ${i + 1}`} at={[x, 2.47, z + 5.025]} size={[1.36, .43]} />
      <Sign text={`0${row * 5 + i + 1}`} at={[x, .52, z + 5.025]} size={[.52, .25]} bg="#546255" />
    </group>)}
    <FallingBook />
  </>
}

function FallingBook() {
  const ref = useRef<THREE.Group>(null!), started = useRef<number | null>(null), side = useRef(-1)
  useFrame(() => {
    if (!ref.current) started.current = null
    else {
      if (!runtime.triggers.has('book')) started.current = null
      else if (started.current === null) { started.current = runtime.time; side.current = runtime.player.z > 0 ? 1 : -1 }
      const t = started.current === null ? 0 : Math.min(1, (runtime.time - started.current) / .8)
      // Always fall at the near end of the aisle the player just entered.
      ref.current.position.set(.52 + .65 * t, 2.1 - 1.98 * t * t, side.current * (12.7 + .9 * t))
      ref.current.rotation.set(t * 1.35, t * .8, t * 2.7)
    }
  })
  return <group ref={ref}>
    <Box at={[0, 0, 0]} size={[.1, .36, .23]} color="#635141" />
    <Box at={[.054, 0, 0]} size={[.01, .32, .2]} color="#d0bea0" />
  </group>
}

function Chair({ turned = false }: { turned?: boolean }) {
  const ref = useRef<THREE.Group>(null!), turn = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current || !turned) return
    const target = runtime.triggers.has('chair') ? 1 : 0
    turn.current += (target - turn.current) * Math.min(1, dt * 2)
    ref.current.rotation.y = turn.current * 2.5
    ref.current.position.z = .22 + turn.current * .16
  })
  // The whole chair fits inside the desk's existing 2.6 × 1.4 obstacle footprint.
  return <group ref={ref} position={[0, 0, .22]}>
    <Box at={[0, .54, 0]} size={[.54, .08, .45]} color="#3c4b3e" />
    <Box at={[0, .94, .2]} size={[.52, .77, .07]} color="#344538" />
    <Box at={[0, .27, 0]} size={[.045, .48, .045]} color="#747b6d" metalness={.7} />
    <Box at={[0, .11, 0]} size={[.52, .04, .05]} color="#646e60" metalness={.5} />
    <Box at={[0, .11, 0]} size={[.05, .04, .44]} color="#646e60" metalness={.5} />
  </group>
}

function Desk({ x, z, north = false, index = 0 }: { x: number; z: number; north?: boolean; index?: number }) {
  const starter = x === ANCHORS.laptop.x && z === ANCHORS.laptop.z
  const wood = deskWood ?? (deskWood = surfaceTexture('wood', [1.5, 1]))
  return <group position={[x, 0, z]}>
    <Box at={[0, .92, 0]} size={[2.6, .095, 1.4]} color="#dcc6a3" map={wood} />
    <Box at={[0, .84, -.1]} size={[2.5, .065, 1.12]} color={north ? '#5b4636' : '#596b61'} />
    {[-1.16, 1.16].map(side => <Box key={side} at={[side, .43, -.12]} size={[.09, .86, 1.02]} color={north ? '#5a4534' : '#485c51'} />)}
    {north && <>
      <Box at={[0, 1.19, -.66]} size={[2.6, .6, .075]} color="#6d533d" />
      {[-1.27, 1.27].map(side => <Box key={side} at={[side, 1.19, -.04]} size={[.065, .6, 1.29]} color="#66503a" />)}
      <Chair turned={starter} />
    </>}
    {!north && <>
      <Box at={[.72, .68, -.12]} size={[.67, .12, .85]} color="#43594e" />
      <Box at={[.72, .50, -.12]} size={[.65, .23, .8]} color="#667469" />
    </>}
    {(starter || index % 3 === 0) && <Laptop at={starter ? [.13, 0, -.16] : [-.15, 0, -.19]} active={starter} />}
    {index % 3 === 1 && <>
      <Box at={[-.22, .99, -.07]} size={[.63, .025, .46]} color="#c9c3a9" />
      <Box at={[-.22, 1.01, -.07]} size={[.56, .006, .43]} color="#e7dcc2" />
      <Box at={[.84, 1.02, .04]} size={[.42, .17, .38]} color="#343d35" />
    </>}
    {(starter || index % 4 === 2) && <Cup at={[-.83, 1.06, .28]} />}
    {north && index % 4 === 0 && !starter && <Backpack at={[.87, .97, -.23]} />}
    {starter && <ClockAndLamp />}
  </group>
}

function Laptop({ at, active }: { at: XYZ; active: boolean }) {
  return <group position={at}>
    <Box at={[0, .98, 0]} size={[.72, .045, .48]} color="#252e2a" metalness={.35} />
    <Box at={[0, 1.23, -.25]} size={[.72, .53, .045]} color="#303935" metalness={.4} />
    {active && <Sign text="02:13" small="NO SIGNAL  /  SESSION EXPIRED" at={[0, 1.23, -.221]} size={[.63, .41]} bg="#11221c" glow={.5} />}
    {!active && <Box at={[0, 1.23, -.22]} size={[.65, .43, .005]} color="#142920" emissive="#183e32" intensity={.34} />}
  </group>
}

function Backpack({ at }: { at: XYZ }) {
  return <group position={at}>
    <mesh position={[0, .23, 0]} scale={[.24, .29, .15]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#394d43" roughness={1} /></mesh>
    <Box at={[0, .17, .14]} size={[.31, .22, .065]} color="#586050" />
    <Box at={[0, .29, .177]} size={[.29, .013, .008]} color="#a2a68a" />
    {[-.1, .1].map(x => <Box key={x} at={[x, .23, -.14]} size={[.035, .38, .025]} color="#242f29" />)}
    <mesh position={[0, .53, 0]}><torusGeometry args={[.055, .012, 6, 10]} /><meshStandardMaterial color="#2a352f" /></mesh>
  </group>
}

function Cup({ at }: { at: XYZ }) {
  return <group position={at}>
    <mesh><cylinderGeometry args={[.09, .075, .17, 12]} /><meshStandardMaterial color="#d4cbbb" roughness={.48} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .087, 0]}><circleGeometry args={[.078, 12]} /><meshStandardMaterial color="#30261b" /></mesh>
  </group>
}

function ClockAndLamp() {
  return <>
    <Box at={[-.94, 1.03, -.23]} size={[.5, .15, .27]} color="#283a30" />
    <Sign text="02:13" at={[-.94, 1.045, -.088]} size={[.4, .10]} bg="#14231c" fg="#c9d0ad" glow={.5} />
    <mesh position={[.97, 1.24, -.43]}><cylinderGeometry args={[.11, .17, .16, 12]} /><meshStandardMaterial color="#86684a" emissive="#a17340" emissiveIntensity={.55} /></mesh>
    <Box at={[.97, 1.08, -.43]} size={[.035, .2, .035]} color="#6d6250" />
  </>
}

function North() {
  const active = useGame(s => s.run.positions[0])
  return <>
    {northDesks.map((p, i) => <Desk key={`${p.x}:${p.z}`} {...p} north index={i} />)}
    {CARRELS.map(z => <Sign key={z} text={`720${Math.abs(z) % 10}`} small="QUIET STUDY / ONE READER" at={[-19.94, 2.25, z]} rotation={[0, Math.PI / 2, 0]} size={[1.1, .4]} />)}
    <Box at={[active.x + .94, 1.13, active.z - .25]} size={[.1, .34, .1]} color="#806849" />
    <mesh position={[active.x + .94, 1.35, active.z - .25]}><coneGeometry args={[.19, .16, 10]} /><meshStandardMaterial color="#ae8a56" emissive="#a17343" emissiveIntensity={.65} /></mesh>
    <Stair />
  </>
}

function Stair() {
  const altered = useGame(s => s.loopBroken)
  return <>
    <Box at={[-19.92, 1.42, ANCHORS.stair.z]} size={[.07, 2.85, 2.28]} color="#612a24" metalness={.22} />
    {[-1.19, 1.19].map(z => <Box key={z} at={[-19.83, 1.42, ANCHORS.stair.z + z]} size={[.12, 2.95, .09]} color="#837966" />)}
    <Box at={[-19.84, 2.87, ANCHORS.stair.z]} size={[.12, .09, 2.45]} color="#837966" />
    <Sign text={altered ? 'STAIR 07 / RETURN' : 'STAIR 07'} small={altered ? 'THE FIRST DOOR REMEMBERS' : 'EMERGENCY / NORTH TOWER'} at={[-19.82, 2.03, ANCHORS.stair.z]} rotation={[0, Math.PI / 2, 0]} size={[1.42, .57]} bg="#632c23" fg="#ead7bb" />
    <Box at={[-19.78, 1.07, ANCHORS.stair.z + .75]} size={[.11, .14, .06]} color="#c2ad80" metalness={.7} />
    <Sign text="← STAIR 07" at={[-16.5, 2.75, -25.4]} size={[2.6, .41]} bg="#642d25" />
  </>
}

function Catalogue() {
  const solved = useGame(s => s.catalogueSolved), folio = useGame(s => s.run.positions[1])
  return <>
    <Sign text="CATALOGUE / FOLIO INDEX" small="BORROWED TIME  ·  NORTH → SOUTH  ·  M–PR" at={[ANCHORS.catalogue.x, 2.55, ANCHORS.catalogue.z]} rotation={[0, Math.PI / 2, 0]} size={[2.25, .67]} />
    <Box at={[-19.91, 1.48, ANCHORS.catalogue.z]} size={[.1, 1.2, 2]} color="#353f37" metalness={.45} />
    <Sign text="BORROWED TIME" small="SEARCH CALL NO.  PN 72?  /  FOLIO DRAWER" at={[-19.83, 1.55, ANCHORS.catalogue.z]} rotation={[0, Math.PI / 2, 0]} size={[1.72, .74]} glow={.4} />
    {centralDesks.map((p, i) => <group key={p.z}>
      <Desk {...p} index={i + 1} />
      <Box at={[p.x, 1.03, p.z + .16]} size={[.93, .14, .58]} color={solved && p.z === folio.z ? '#766b52' : '#4f5b50'} metalness={.25} />
      <Sign text={solved && p.z === folio.z ? 'FOLIO UNLOCKED' : 'FOLIOS / PN'} at={[p.x, 1.11, p.z + .46]} size={[.83, .11]} bg="#42574b" />
    </group>)}
  </>
}

function Nameplate() {
  const digit = useGame(s => s.run.roomDigit)
  const revealed = useMemo(() => signTexture(`ROOM 740${digit}`, { bg: 'transparent', fg: '#d4cba6', border: false }), [digit])
  const reveal = useRef<THREE.MeshBasicMaterial>(null!)
  useFrame(() => {
    if (!reveal.current) return
    const s = useGame.getState()
    const glow = s.power && (s.phone && s.flashlight || s.rubbingRead) ? (s.rubbingRead ? 1 : Math.max(0, (s.exposure - .2) / 5.8)) : 0
    reveal.current.opacity = glow
    reveal.current.depthWrite = false
  })
  return <group position={[ANCHORS.rubbing.x, 0, ANCHORS.rubbing.z]}>
    {/* A suspended, thin plaque rather than an untracked collision blocker. */}
    <Box at={[0, 2.72, 0]} size={[.03, 1.0, .03]} color="#69746b" />
    <Box at={[0, 1.91, 0]} size={[.055, .55, 1.45]} color="#6f6756" />
    <Sign text="ERASED NAMEPLATE" small="USE THE PHONE LIGHT" at={[-.045, 1.93, 0]} rotation={[0, -Math.PI / 2, 0]} size={[1.3, .35]} bg="#4b483b" fg="#d1c8a8" />
    <mesh position={[-.055, 1.84, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[1.25, .23]} />
      <meshBasicMaterial ref={reveal} map={revealed} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    <Sign text="← ERASED PLATE" at={[-2, 2.8, 0]} rotation={[0, -Math.PI / 2, 0]} size={[2.3, .35]} />
  </group>
}

function Central() {
  const altered = useGame(s => s.loopBroken)
  return <>
    <Stacks /><Catalogue /><Nameplate />
    <Sign text={altered ? 'YOU WERE HERE BEFORE' : 'M–PR / FLOOR SEVEN'} small={altered ? 'PLEASE RETURN YOURSELF TO THE DESK' : 'BOOKSTACKS  ·  NORTH TO SOUTH'} at={[0, 2.98, 17.25]} rotation={[0, Math.PI, 0]} size={[4.8, .66]} />
    <Sign text="← CATALOGUE" at={[-12, 2.8, -14]} size={[2.25, .38]} />
    <Sign text="NAMEPLATE →" at={[12, 2.8, 14]} rotation={[0, Math.PI, 0]} size={[2.4, .38]} />
  </>
}

function ArchiveDesk({ x, z }: { x: number; z: number }) {
  const opened = useGame(s => s.cabinetSolved && s.run.positions[3].x === x && s.run.positions[3].z === z)
  return <group position={[x, 0, z]}>
    <Box at={[0, .74, 0]} size={[2.6, 1.48, 1.4]} color="#62736b" metalness={.55} roughness={.57} />
    {[.34, .75, 1.14].map(y => <group key={y}>
      <Box at={[0, y, y === 1.14 && opened ? .77 : .708]} size={[2.42, .34, .018]} color="#819081" metalness={.5} />
      <Box at={[0, y, .725]} size={[.34, .08, .035]} color="#b4b69d" metalness={.5} />
    </group>)}
    <Sign text="7400s / ROOM FILES" at={[0, 1.48, .715]} size={[2.25, .3]} bg="#364a3f" />
  </group>
}

function Maintenance() {
  const power = useGame(s => s.power), circuits = useGame(s => s.run.circuits), switches = useGame(s => s.run.switches)
  return <>
    <Sign text="SERVICE ORDER" small="AIR  →  LAMPS  →  CATALOGUE  →  ACCESS" at={[ANCHORS.schedule.x, 1.75, 22.39]} size={[2.2, .9]} bg="#e2d6b8" fg="#333e32" glow={.06} />
    <Box at={[ANCHORS.schedule.x, 1.78, 22.37]} size={[2.36, 1.02, .06]} color="#645b49" />
    <Sign text="MAINTENANCE / NOTICE" at={[ANCHORS.schedule.x, 2.82, ANCHORS.schedule.z]} size={[2.65, .35]} />
    {/* The world has no breaker obstacle at z30. Its slim operating marker is overhead; the cabinet is on the existing wall. */}
    <Sign text="BREAKER CABINET →" at={[ANCHORS.breaker.x, 2.82, ANCHORS.breaker.z]} rotation={[0, Math.PI / 2, 0]} size={[2.5, .39]} />
    <Box at={[19.92, 1.58, ANCHORS.breaker.z]} size={[.07, 2.1, 2.25]} color="#43594f" metalness={.6} />
    <Sign text="SOUTH CIRCUITS" small="RESTART BY LABEL / RED = ELEVATOR" at={[19.83, 2.35, ANCHORS.breaker.z]} rotation={[0, -Math.PI / 2, 0]} size={[1.94, .41]} />
    {Array.from({ length: circuits }, (_, i) => <Box key={`indicator-${i}`} at={[19.78, 2.02, 29.2 + i * .22]} size={[.06, .09, .09]} color={power ? '#9ebd85' : '#35483b'} emissive="#99c77e" intensity={power ? 1.1 : 0} />)}
    <Box at={[19.78, 2.02, 30.8]} size={[.06, .09, .09]} color="#92543d" emissive="#c16b45" intensity={power ? .7 : .05} />
    {switches.map((switchInfo, i) => <group key={switchInfo.id} position={[19.79, 1.7 - i * .28, 29.14]}>
      <Box at={[0, 0, 0]} size={[.09, .16, .09]} color={power ? '#a0ad9a' : '#8e8b74'} metalness={.5} />
      <Sign text={switchInfo.name} at={[-.052, -.02, .47]} rotation={[0, -Math.PI / 2, 0]} size={[.78, .17]} bg="#3f5148" />
    </group>)}
    <Sign text={power ? 'EMERGENCY LOAD / GREEN ONLY' : 'STANDBY / READ SERVICE ORDER'} at={[19.82, .66, 30]} rotation={[0, -Math.PI / 2, 0]} size={[1.94, .22]} />
  </>
}

function LoungeTable({ x, z }: { x: number; z: number }) {
  // The broad table and low seating occupy the same (world-owned) 3.8 × 1.2 footprint.
  return <group position={[x, 0, z]}>
    <Box at={[0, 1.04, 0]} size={[3.8, .12, 1.2]} color="#857457" />
    {[-1.63, 1.63].map(side => <Box key={side} at={[side, .52, 0]} size={[.12, 1.01, .85]} color="#565c4d" />)}
    {[-1, 1].map(side => <group key={side} position={[side * .84, 0, .26]}>
      <Box at={[0, .48, 0]} size={[.7, .13, .51]} color="#4a5b4f" />
      <Box at={[0, .8, .2]} size={[.68, .62, .06]} color="#354a40" />
      <Box at={[0, .22, 0]} size={[.06, .42, .06]} color="#6a796d" metalness={.55} />
    </group>)}
    <Box at={[0, 1.14, -.12]} size={[.8, .04, .5]} color="#242e2a" />
    <Cup at={[-1.25, 1.2, -.13]} />
  </group>
}

function South() {
  const cabinet = useGame(s => s.cabinetSolved), altered = useGame(s => s.loopBroken)
  const report = useGame(s => s.run.positions[2]), power = useGame(s => s.power)
  return <>
    {OBSTACLES.filter(o => o.kind === 'desk' && o.z === 36).map(o => <LoungeTable key={o.x} x={o.x} z={o.z} />)}
    {southDesks.filter(p => p.x >= 0).map((p, i) => <Desk key={p.x} {...p} index={i + 2} />)}
    {southDesks.filter(p => p.x < 0).map(p => <ArchiveDesk key={p.x} {...p} />)}
    <Box at={[report.x + 1.04, 1.14, report.z - .33]} size={[.04, .32, .04]} color="#806b4d" />
    <mesh position={[report.x + 1.04, 1.37, report.z - .33]}><coneGeometry args={[.18, .16, 10]} /><meshStandardMaterial color="#aa8b57" emissive="#be8d45" emissiveIntensity={power ? 1.3 : .02} /></mesh>
    <Sign text="ROOM ARCHIVE / 7400s" small="SELECT THE ERASED ROOM NUMBER" at={[ANCHORS.cabinet.x, 2.67, ANCHORS.cabinet.z + 1.05]} rotation={[0, Math.PI, 0]} size={[3.1, .56]} />
    <Sign text={cabinet ? 'DRAWER OPEN' : 'ROOM FILES'} at={[ANCHORS.cabinet.x, 1.74, ANCHORS.cabinet.z + .72]} size={[2.2, .26]} />
    <Maintenance />
    <ElevatorsAndExit />
    <Sign text="EVACUATION NOTICE" small="FOUR RECORDS  →  FIRST STAIR  →  FINAL ACCESS" at={[ANCHORS.return.x, 2.18, ANCHORS.return.z]} rotation={[0, Math.PI, 0]} size={[3.8, .68]} />
    <Sign text={altered ? 'ACCESS ACTIVE →' : 'EXIT / ACCESS →'} at={[0, 2.92, 39.4]} rotation={[0, Math.PI, 0]} size={[3.7, .45]} bg="#4d2823" fg="#e6d3ae" />
  </>
}

function ElevatorsAndExit() {
  const altered = useGame(s => s.loopBroken)
  return <>
    {[-14, -9].map((x, i) => <group key={x}>
      <Box at={[x, 1.4, 43.94]} size={[2.9, 2.8, .035]} color="#596c62" metalness={.85} roughness={.38} />
      <Box at={[x, 1.4, 43.9]} size={[.05, 2.65, .04]} color="#272e2a" />
      <Sign text={i === 0 ? '7' : '—'} small="OUT OF SERVICE" at={[x, 2.93, 43.87]} rotation={[0, Math.PI, 0]} size={[1.75, .43]} bg="#242e29" fg="#c48669" />
    </group>)}
    <Sign text="ELEVATORS" at={[-11.5, 3.3, 43.86]} rotation={[0, Math.PI, 0]} size={[4, .28]} />
    <Box at={[0, 1.38, 43.91]} size={[3.1, 2.76, .08]} color="#2b4234" metalness={.45} />
    {[-1.58, 1.58].map(x => <Box key={x} at={[x, 1.4, 43.85]} size={[.09, 2.88, .13]} color="#8e9a88" />)}
    <Box at={[0, 2.86, 43.86]} size={[3.2, .09, .12]} color="#899785" />
    <Sign text={altered ? 'FINAL EXIT / ACCESS' : 'EXIT / RETURN TO STAIR'} at={[0, 3.13, 43.83]} rotation={[0, Math.PI, 0]} size={[3.4, .37]} bg="#582c21" fg="#e3d2ad" glow={.7} />
    <Sign text="ACCESS PANEL" small="RECONCILE RECORDS I–IV" at={[ANCHORS.exit.x + 1.05, 1.63, ANCHORS.exit.z + 1.25]} rotation={[0, Math.PI, 0]} size={[1.25, .55]} bg="#2a362e" />
    <Box at={[1.05, 1.42, 43.77]} size={[.62, .85, .08]} color="#455c4f" metalness={.5} />
    {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <Box key={`${row}:${col}`} at={[.86 + col * .14, 1.52 - row * .13, 43.7]} size={[.075, .075, .012]} color="#acb19a" />))}
    <Box at={[0, 1.08, 43.82]} size={[1.8, .09, .08]} color="#8e9e86" metalness={.7} />
    <Sign text="EXIT ↑" at={[ANCHORS.exit.x, .008, ANCHORS.exit.z]} rotation={[-Math.PI / 2, 0, 0]} size={[2, .6]} bg="#46584a" />
  </>
}

function RecordProp({ id }: { id: number }) {
  const point = useGame(s => s.run.positions[id]), record = useGame(s => s.run.records[id])
  const available = useGame(s => recordAvailable(s, id)), collected = useGame(s => s.clues.includes(id))
  const page = useMemo(() => signTexture(`RECORD ${['I', 'II', 'III', 'IV'][id]}`, { small: record.label, bg: '#dad1b5', fg: '#354239', width: 512, height: 512 }), [id, record.label])
  if (!available || collected) return null
  const height = id === 3 ? 1.53 : id === 1 ? 1.135 : 1.045
  return <group position={[point.x, height, point.z + .1]} rotation={[0, id * .13, 0]}>
    {id === 1 && <Box at={[0, -.095, 0]} size={[.66, .13, .58]} color="#665744" />}
    {id === 3 && <Box at={[0, -.11, 0]} size={[.75, .07, .58]} color="#494d40" />}
    {id === 2 && <Box at={[0, -.015, 0]} size={[.68, .035, .59]} color="#344a40" />}
    <Box at={[0, 0, 0]} size={[.5, .014, .48]} color={['#d8cba7', '#b7c5af', '#d7d0ba', '#c4b99f'][id]} />
    <mesh position={[0, .009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[.48, .45]} />
      <meshStandardMaterial map={page} roughness={1} />
    </mesh>
    <Box at={[-.19, .018, -.15]} size={[.012, .006, .17]} color="#905342" />
  </group>
}

function Dust() {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => Float32Array.from({ length: 240 * 3 }, (_, i) => i % 3 === 1 ? (Math.sin(i * 431) + 1) * 1.6 : i % 3 === 0 ? Math.sin(i * 217) * 19 : Math.sin(i * 137) * 43), [])
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * .0003 })
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#c5c4ae" size={.017} transparent opacity={.21} depthWrite={false} /></points>
}

export const Library = memo(function Library() {
  return <group><Architecture /><North /><Central /><South />{[0, 1, 2, 3].map(id => <RecordProp key={id} id={id} />)}<Dust /></group>
})
