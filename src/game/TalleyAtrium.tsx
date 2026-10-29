import { useMemo } from 'react'
import * as THREE from 'three'
import { Instances, Sign, type Instance, type XYZ } from './primitives'
import { ATRIUM_BOUNDARIES, ATRIUM_GLAZING, COLUMNS, STAIR_PATHS, insideAtrium, type Point, type StairPoint } from './world'
import { surfaceTexture } from './textures'

const cube = new THREE.BoxGeometry(1, 1, 1)
const white = new THREE.MeshLambertMaterial({ color: '#e6e5df' })
const glass = new THREE.MeshBasicMaterial({ color: '#bad2d0', transparent: true, opacity: .09, depthWrite: false, side: THREE.DoubleSide })
const windowGlass = new THREE.MeshBasicMaterial({ color: '#526d6d', transparent: true, opacity: .82, depthWrite: false, side: THREE.DoubleSide })
const part = (at: XYZ, size: XYZ, color: string, rotation?: XYZ): Instance => ({ at, size, color, rotation })
const line = (a: XYZ, b: XYZ, width: number, color: string): Instance => {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start)
  const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()))
  return part(start.add(end).multiplyScalar(.5).toArray(), [width, delta.length(), width], color, [rotation.x, rotation.y, rotation.z])
}

function floorGeometry(level: 3 | 4 | 5) {
  const shape = new THREE.Shape()
  shape.moveTo(-22, -22); shape.lineTo(22, -22); shape.lineTo(22, 22); shape.lineTo(-22, 22); shape.closePath()
  const cut = (points: Point[]) => {
    const path = new THREE.Path(points.map(p => new THREE.Vector2(p.x, -p.z)))
    path.closePath(); shape.holes.push(path)
  }
  cut(ATRIUM_BOUNDARIES[level])
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .32, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}
const floors = ([3, 4, 5] as const).map(level => ({ level, geometry: floorGeometry(level) }))
const edges = floors.flatMap(({ level }) => ATRIUM_BOUNDARIES[level].map((a, i, points) => ({ a, b: points[(i + 1) % points.length], y: (level - 2) * 5 })))
const guards = edges.flatMap(edge => {
  const { a, b } = edge
  if (a.z !== b.z || Math.abs(a.z) < 8 || Math.abs(a.z) > 12) return [edge]
  const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x)
  if (hi <= 12 || lo >= 16) return [edge]
  return [[lo, Math.min(12, hi)], [Math.max(16, lo), hi]].filter(([x1, x2]) => x2 - x1 > .05)
    .map(([x1, x2]) => ({ a: { x: x1, z: a.z }, b: { x: x2, z: a.z }, y: edge.y }))
})
const edgeTrim = edges.flatMap(({ a, b, y }) => {
  const width = Math.abs(b.x - a.x), depth = Math.abs(b.z - a.z), x = (a.x + b.x) / 2, z = (a.z + b.z) / 2
  return [part([x, y - .27, z], [width || .18, .18, depth || .18], '#f2f1eb'),
    part([x, y - .48, z], [width || .12, .14, depth || .12], '#c6c8c3'),
    part([x, y + .07, z], [width || .16, .14, depth || .16], '#909b9b')]
})

function Guard({ a, b, y }: { a: Point; b: Point; y: number }) {
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), count = Math.ceil(length / 1.5)
  const angle = -Math.atan2(dz, dx)
  const posts = Array.from({ length: count + 1 }, (_, i) => part([a.x + dx * i / count, y + .54, a.z + dz * i / count], [.028, 1.06, .028], '#879294'))
  return <group>
    <mesh position={[(a.x + b.x) / 2, y + .56, (a.z + b.z) / 2]} rotation={[0, angle, 0]} geometry={cube} material={glass} scale={[length, 1.03, .018]} dispose={null} />
    <Instances items={[
      ...posts,
      part([(a.x + b.x) / 2, y + 1.09, (a.z + b.z) / 2], [length, .045, .045], '#a6ada9', [0, angle, 0]),
      part([(a.x + b.x) / 2, y + .23, (a.z + b.z) / 2], [length, .018, .018], '#c0c7c3', [0, angle, 0]),
    ]} />
  </group>
}

function Decks() {
  const ceilingBays = floors.flatMap(({ level }) => {
    const result: Instance[] = [], y = (level - 2) * 5 - .365
    for (let x = -20; x <= 20; x += 4) for (let z = -20; z <= 20; z += 4) {
      if ([-1.9, 1.9].some(dx => [-1.9, 1.9].some(dz => insideAtrium(x + dx, z + dz, level))) || insideAtrium(x, z, level)) continue
      result.push(part([x, y, z], [3.86, .065, 3.86], '#b6bdb7'))
    }
    return result
  })
  const soffitLights = edges.flatMap(({ a, b, y }) => {
    const length = Math.hypot(a.x - b.x, a.z - b.z), count = Math.floor(length / 1.8)
    return Array.from({ length: count }, (_, i) => part([a.x + (b.x - a.x) * (i + .5) / count, y - .335, a.z + (b.z - a.z) * (i + .5) / count], [.16, .012, .16], '#dce4dc'))
  })
  const strips = edges.map(({ a, b, y }) => part([(a.x + b.x) / 2, y - .33, (a.z + b.z) / 2], [Math.abs(a.x - b.x) || .035, .02, Math.abs(a.z - b.z) || .035], '#e6eee3'))
  return <>
    {floors.map(({ level, geometry }) => <mesh key={level} geometry={geometry} material={white} position={[0, (level - 2) * 5 - .32, 0]} dispose={null} />)}
    <Instances items={edgeTrim} />
    <Instances items={ceilingBays} />
    <Instances items={ceilingBays.map(({ at }) => part([at[0], at[1] - .05, at[2]], [.28, .055, .28], '#e0e7dc'))} round unlit />
    <Instances items={[...soffitLights, ...strips]} unlit />
    {guards.map((edge, i) => <Guard key={i} {...edge} />)}
  </>
}

function StairSegment({ a, b }: { a: StairPoint; b: StairPoint }) {
  const dy = b.y - a.y, dz = b.z - a.z, dx = b.x - a.x
  if (Math.abs(dy) < .01) {
    const alongX = Math.abs(dx) > .1, w = Math.abs(dx) + 3.4, d = Math.abs(dz) + 2.2
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2
    return <>
      <Instances items={[part([x, a.y - .23, z], [w, .46, d], '#e5e5df'), part([x, a.y - .48, z], [w - .1, .06, d - .1], '#b6bbb8')]} />
      <Guard a={alongX ? { x: x - w / 2, z: z + Math.sign(z) * d / 2 } : { x: x + 1.7, z: z - d / 2 }}
        b={alongX ? { x: x + w / 2, z: z + Math.sign(z) * d / 2 } : { x: x + 1.7, z: z + d / 2 }} y={a.y} />
    </>
  }
  const count = 30, run = Math.abs(dz), length = Math.hypot(dz, dy), angle = -Math.atan(dy / dz)
  const steps = Array.from({ length: count }, (_, i) => {
    const t = (i + .5) / count
    return part([a.x, a.y + dy * t - .065, a.z + dz * t], [3.4, .14, run / count + .02], i % 2 ? '#d2d6d3' : '#eeeeea')
  })
  const cheeks = [-1, 1].flatMap(side => [
    part([a.x + side * 1.74, a.y + dy / 2 - .25, (a.z + b.z) / 2], [.18, .5, length + .08], '#f2f2eb', [angle, 0, 0]),
    part([a.x + side * 1.76, a.y + dy / 2 + .05, (a.z + b.z) / 2], [.21, .065, length + .08], '#f8f6ef', [angle, 0, 0]),
    line([a.x + side * 1.71, a.y + 1.08, a.z], [b.x + side * 1.71, b.y + 1.08, b.z], .045, '#919c9e'),
    ...Array.from({ length: 11 }, (_, i) => part([a.x + side * 1.71, a.y + dy * i / 10 + .56, a.z + dz * i / 10], [.035, 1.05, .035], '#a2aca9')),
  ])
  // Vertical parallelogram avoids tilted-box glass projecting into the head-height path.
  const guardGeometry = (side: number) => {
    const x = a.x + side * 1.71
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([x, a.y + .12, a.z, x, b.y + .12, b.z, x, b.y + 1.05, b.z, x, a.y + 1.05, a.z], 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals()
    return geometry
  }
  return <>
    <mesh position={[a.x, a.y + dy / 2 - .3, (a.z + b.z) / 2]} rotation={[angle, 0, 0]} geometry={cube} material={white} scale={[3.4, .35, length]} dispose={null} />
    <Instances items={[...steps, ...cheeks]} />
    {[-1, 1].map(side => <mesh key={side} geometry={guardGeometry(side)} material={glass} />)}
  </>
}

function StairBank() {
  const paths = [...STAIR_PATHS, [{ x: 10, y: 10, z: -11.5 }, { x: 14, y: 10, z: -11.5 }, { x: 14, y: 10, z: -8 },
    { x: 14, y: 15, z: 8 }, { x: 14, y: 15, z: 12 }, { x: 10, y: 15, z: 12 }]]
  return <>
    {paths.map((path, floor) => <group key={floor}>{path.slice(1).map((b, i) => <StairSegment key={i} a={path[i]} b={b} />)}</group>)}
    <Sign text="3 ↑" small="LOUNGE / BALLROOM" at={[16.03, 2.35, -10.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.45, .5]} bg="#39423f" />
    <Sign text="4 ↑" small="UPPER LOUNGE" at={[16.03, 7.35, 10.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.45, .5]} bg="#39423f" />
  </>
}

function Screens() {
  const assemblies = [{ x: 3.1, bottom: 4.75, width: 5.1 }, { x: -4.3, bottom: 8.15, width: 5.5 }]
  return <>{assemblies.map(({ x, bottom, width }, index) => {
    const top = 17.05, spacing = .29, count = Math.floor((top - bottom) / spacing)
    const fins = Array.from({ length: count }, (_, i) => part([0, bottom + i * spacing, 0], [width, .052, .26], ['#97754f', '#ab8659', '#bc996a', '#a48158'][i % 4]))
    const verticals = [-.5, -.25, 0, .25, .5].flatMap(t => [
      part([width * t, (bottom + top) / 2, -.08], [.035, top - bottom, .045], '#82664b'),
      part([width * t, 17.7, -.08], [.018, 1.3, .018], '#737a78'),
      ...Array.from({ length: count }, (_, i) => part([width * t, bottom + i * spacing - .035, .07], [.07, .035, .24], '#6e6455')),
    ])
    return <group key={index} position={[x, 0, 8.4]}>
      <Instances items={fins} />
      <Instances items={[...verticals, part([0, bottom - .14, 0], [width + .15, .045, .25], '#7d8179'), part([0, top, -.08], [width, .06, .08], '#6e746e')]} />
    </group>
  })}</>
}

function Roof() {
  const steel = '#303b3d', thin = '#485351'
  const primary = [-10.5, -3.5, 3.5, 10.5].flatMap(x => [
    part([x, 18.15, 0], [.19, .7, 27], steel), part([x, 17.79, 0], [.44, .065, 27], '#263033'),
    ...[-12, -6, 0, 6, 12].map(z => line([x, 17.81, z], [x + 6.7, 18.47, z + (z >= 0 ? -5.5 : 5.5)], .055, thin)),
  ])
  const secondary = Array.from({ length: 15 }, (_, i) => part([0, 18.34, -13 + i * 1.85], [25.5, .25, .10], thin))
  const glazing = Array.from({ length: 7 }, (_, i) => part([-11 + i * 3.65, 18.55, 0], [3.58, .04, 26.6], i % 2 ? '#202e33' : '#28363a'))
  const rim = [part([0, 18.15, -18], [44, .45, 9], '#c8cfca'), part([0, 18.15, 18], [44, .45, 9], '#c8cfca'),
    part([-17.2, 18.15, 0], [9.5, .45, 27], '#d7dcd5'), part([17.2, 18.15, 0], [9.5, .45, 27], '#d7dcd5')]
  return <><Instances items={[...primary, ...secondary, ...rim]} /><Instances items={glazing} /></>
}

function Facades() {
  const internalGlazing = [...ATRIUM_GLAZING[3].map(p => ({ ...p, y: 5 })), ...ATRIUM_GLAZING[4].map(p => ({ ...p, y: 10 })),
    ...ATRIUM_GLAZING[4].map(p => ({ ...p, z: 18.4, y: 15, h: 2.8 }))]
  const internalFrames = internalGlazing.flatMap(p => [
    ...Array.from({ length: Math.ceil(p.w / 1.4) + 1 }, (_, i) => part([p.x - p.w / 2 + p.w * i / Math.ceil(p.w / 1.4), p.y + p.h / 2, p.z - .1], [.055, p.h, .08], '#8b9995')),
    ...[.15, 1.15, p.h - .05].map(y => part([p.x, p.y + y, p.z - .1], [p.w, .055, .08], '#a9b1a8')),
    part([p.x, p.y + p.h, p.z], [p.w + .12, .2, .32], '#d5d9d0'),
    part([p.x, p.y + p.h - .3, p.z + .32], [p.w - .3, .045, .18], '#cbd6c8'),
  ])
  const frames = floors.flatMap(({ level }) => {
    const y = (level - 2) * 5, z = 21.9
    return [part([0, y + 2.15, z], [40, 4.22, .14], '#263537'),
      ...Array.from({ length: 19 }, (_, i) => part([-19 + i * 2.1, y + 2.18, z - .09], [.055, 4.25, .10], '#929b96')),
      part([0, y + 3.75, z - .12], [40, .045, .10], '#798681'),
      part([0, y + 1.2, z - .12], [40, .045, .10], '#798681'),
      // Recessed room lights and varied wall inserts behind the balcony edge.
      ...[-15, -8, 0, 8, 15].map((x, i) => part([x, y + 2.3, z - .13], [1.15, 3.4, .05], i % 2 ? '#acaca0' : '#454f50')),
    ]
  })
  const southFrames = Array.from({ length: 19 }, (_, i) => part([-21 + i * 2.34, 9, 21.92], [.065, 18, .10], '#a5ada6'))
  const returns = [-1, 1].flatMap(side => [
    ...[-17, -10, 0, 10, 17].map(z => part([side * 21.9, 9, z], [.10, 18, .09], '#a1aaa3')),
    ...[4.9, 9.9, 14.9].map(y => part([side * 21.9, y, 0], [.12, .13, 44], '#b8bdb4')),
  ])
  const lowShops = [-17, -11, -5, 7, 13, 19].flatMap((x, i) => [
    part([x, 1.9, 21.35], [5.5, 3.8, .25], i % 2 ? '#c0c5bc' : '#2d3b3c'),
    ...[-2.1, 0, 2.1].map(dx => part([x + dx, 1.75, 21.16], [.065, 3.45, .1], '#a2aba6')),
    part([x, 3.7, 21.14], [5.45, .12, .11], '#b7beb7'),
  ])
  const c = COLUMNS.flatMap(({ x, z }) => [
    part([x, 9, z], [1.16, 18, 1.16], '#babfb7'),
    ...[.15, 5.15, 10.15, 15.15].map(y => part([x, y, z], [1.2, .18, 1.2], '#737e78')),
  ])
  return <>
    {internalGlazing.map((p, i) => <mesh key={i} position={[p.x, p.y + p.h / 2, p.z]} geometry={cube} material={windowGlass} scale={[p.w, p.h, .02]} dispose={null} />)}
    <Instances items={internalFrames} />
    <Instances items={[...frames, ...southFrames, ...returns, ...lowShops]} />
    <Instances items={c} round />
    {[-21.98, 21.98].map(z => <mesh key={z} position={[0, 9, z]} material={glass} geometry={cube} scale={[44, 18, .018]} dispose={null} />)}
    {[-21.98, 21.98].map(x => <mesh key={x} position={[x, 9, 0]} material={glass} geometry={cube} scale={[.018, 18, 44]} dispose={null} />)}
    <Sign text="STUDENT SERVICES" at={[-11, 3.28, 21.05]} rotation={[0, Math.PI, 0]} size={[3, .35]} bg="#293a39" />
  </>
}

function Ground() {
  const terrazzo = useMemo(() => surfaceTexture('terrazzo', [16, 16]), [])
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ map: terrazzo, color: '#afb5ae', roughness: .27, metalness: .12 }), [terrazzo])
  const bands = [-17, -11, -5, 1, 7, 13, 19].flatMap(x => [part([x, .012, 0], [.55, .018, 43.8], '#626e69'), part([x + .42, .013, 0], [.07, .018, 43.8], '#d7dcd3')])
  return <><mesh geometry={cube} material={floor} position={[0, -.15, 0]} scale={[44, .3, 44]} dispose={null} /><Instances items={bands} /></>
}

/** Gate A only: structural public atrium, shared stairs and surrounding facade depth. */
export function TalleyAtrium() {
  return <><Ground /><Decks /><Facades /><StairBank /><Screens /><Roof /></>
}
