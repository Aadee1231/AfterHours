import { memo, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instances, Sign, type Instance, type XYZ } from './primitives'
import { UpperFloors } from './UpperFloors'
import { PublicInteriors } from './PublicInteriors'
import { TalleyAtrium } from './TalleyAtrium'
import { runtime, useGame } from './store'
import { ANCHORS, SOFAS, TABLES } from './world'

// Keep the historical Box export for callers that still import it from Library.
export { Box } from './primitives'

const stoolGeometry = new THREE.CylinderGeometry(1, 1, 1, 10)
const upholstery = new THREE.MeshLambertMaterial({ color: '#bf2530', side: THREE.DoubleSide })
const seatMaterial = new THREE.MeshLambertMaterial({ color: '#da3740', side: THREE.DoubleSide })
const glassMaterial = new THREE.MeshBasicMaterial({ color: '#b7d4da', opacity: .14, transparent: true, depthWrite: false, side: THREE.DoubleSide })

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
    { at: [-9, .55, 15.44], size: [5, .82, .05], color: '#ae2735' },
    { at: [-9, 1.1, 15.46], size: [5, .13, .12], color: '#ae2736' },
    { at: [-18.9, 1.1, ANCHORS.power.z], size: [.37, 2.13, 1.48], color: '#efece3' },
    { at: [-18.83, 1.06, ANCHORS.powerNotice.z], size: [.22, 2, 2.0], color: '#f5f0e6' },
    ...[-2.65, 2.65].map(x => ({ at: [x, 2.1, 21.3] as XYZ, size: [.3, 4.2, .8] as XYZ, color: '#babfb7' })),
    { at: [0, 4.1, 21.3], size: [5.6, .4, .8], color: '#babfb7' },
    ...[-2.4, -1.2, 0, 1.2, 2.4].map(x => ({ at: [x, 1.6, 21.22] as XYZ, size: [.065, 3.2, .12] as XYZ, color: '#bec7be' })),
    { at: [0, 3.25, 21.22], size: [4.9, .075, .12], color: '#c5ccc4' },
    ...[-1.8, -.6, .6, 1.8].map(x => ({ at: [x, 1.13, 21.12] as XYZ, size: [.8, .055, .10] as XYZ, color: '#b0bcb0' })),
    { at: [0, .017, 20.5], size: [4.9, .025, 1.4], color: '#2e3c36' },
  ]
  return <>
    <Instances items={fixtures} />
    {[-1.8, -.6, .6, 1.8].map(x => <mesh key={x} position={[x, 1.62, 21.23]} material={glassMaterial}><planeGeometry args={[1.12, 3.12]} /></mesh>)}
    <Sign text="INFORMATION" small="FLOOR DIRECTORY / ASK HERE" at={[-9, 1.22, 15.39]} rotation={[0, Math.PI, 0]} size={[3.95, .53]} bg="#a32735" />
    <Sign text="TALLEY STUDENT UNION" small="FLOOR 2 / MAIN ATRIUM" at={[-9, 2.15, 16.63]} size={[4.6, .64]} bg="#f3efe3" fg="#a42b38" />
    <Sign text="EMERGENCY POWER" small={power ? 'BACKUP SUPPLY RESTORED' : 'APPROACH FROM THE EAST'} at={[-18.68, 1.8, ANCHORS.power.z]} rotation={[0, Math.PI / 2, 0]} size={[1.3, .57]} bg={power ? '#396759' : '#a12731'} />
    <Sign text={'ISOLATE DINING\nPRIME BATTERY\nCONNECT ATRIUM'} small="POWER RESTORE / POSTED SEQUENCE" at={[-18.7, 1.73, ANCHORS.powerNotice.z]} rotation={[0, Math.PI / 2, 0]} size={[2.0, .95]} bg="#a02735" />
    <Sign text="MAIN ENTRANCE" small={authorized ? 'DOORS RELEASED / EXIT' : 'TALLEY STUDENT UNION / EXIT'} at={[0, 3.65, 20.86]} rotation={[0, Math.PI, 0]} size={[3.6, .48]} bg="#2b3c35" />
    <Sign text="EXIT" at={[0, 2.95, 21.08]} rotation={[0, Math.PI, 0]} size={[.65, .27]} bg="#315d45" />
    <Sign text="← POWER CONTROL" small="NORTHWEST / MAINTENANCE" at={[-16.9, 2.9, 15]} rotation={[0, Math.PI / 2, 0]} size={[2.8, .65]} bg="#a12735" />
    <Dining />
  </>
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
    <TalleyAtrium />
    <Sofas />
    <PublicInteriors floor={floor} />
    {floor === 2 && <GroundLandmarks />}
    <UpperFloors />
    <AtriumLights />
  </>
})
