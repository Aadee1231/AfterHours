import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CARRELS, CLUES, SHELF_X, SHELF_Z } from './world'
import { runtime, useGame } from './store'
import { signTexture, surfaceTexture } from './textures'

type XYZ = [number, number, number]

export function Box({ at, size, color, roughness = 0.85, metalness = 0, map, emissive, intensity = 0 }: { at: XYZ; size: XYZ; color: string; roughness?: number; metalness?: number; map?: THREE.Texture; emissive?: string; intensity?: number }) {
  return <mesh position={at} receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} map={map} emissive={emissive} emissiveIntensity={intensity} /></mesh>
}

function Sign({ text, at, size, rotation = [0, 0, 0], small, bg, fg, glow = 0 }: { text: string; at: XYZ; size: [number, number]; rotation?: XYZ; small?: string; bg?: string; fg?: string; glow?: number }) {
  const map = useMemo(() => signTexture(text, { small, bg, fg }), [text, small, bg, fg])
  return <mesh position={at} rotation={rotation}><planeGeometry args={size} /><meshStandardMaterial map={map} roughness={0.7} emissive="#e4e4cf" emissiveMap={map} emissiveIntensity={glow} /></mesh>
}

function Books() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const bands = useRef<THREE.InstancedMesh>(null!)
  const books = useMemo(() => {
    const result: { position: XYZ; size: XYZ; color: string; band: number }[] = []
    const palette = ['#605b3d', '#3c5148', '#713f31', '#6d6550', '#394942', '#94856a', '#4a4240', '#6d7656', '#283c3d', '#855f41']
    let seed = 427
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (const x of SHELF_X) for (const z of SHELF_Z) for (const side of [-1, 1]) for (let shelf = 0; shelf < 5; shelf++) {
      let cursor = -3.7
      while (cursor < 3.6) {
        const width = 0.085 + random() * 0.09, height = 0.3 + random() * 0.15
        result.push({ position: [x + side * 0.41, 0.32 + shelf * 0.51 + height / 2, z + cursor], size: [0.42 + random() * 0.06, height, width], color: palette[Math.floor(random() * palette.length)], band: random() })
        cursor += width + 0.024
        if (random() > 0.97) cursor += 0.22
      }
    }
    return result
  }, [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D(), color = new THREE.Color()
    books.forEach((b, i) => {
      dummy.position.set(...b.position); dummy.scale.set(...b.size); dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix); ref.current.setColorAt(i, color.set(b.color))
      dummy.position.y += b.size[1] * 0.27
      dummy.scale.set(b.size[0] + 0.003, 0.009, b.size[2] * 0.8); dummy.updateMatrix()
      bands.current.setMatrixAt(i, dummy.matrix); bands.current.setColorAt(i, color.set(b.band > 0.5 ? '#c1ae7b' : '#878e78'))
    })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor!.needsUpdate = true
    bands.current.instanceMatrix.needsUpdate = true; bands.current.instanceColor!.needsUpdate = true
  }, [books])
  return <>
    <instancedMesh ref={ref} args={[undefined, undefined, books.length]}><boxGeometry /><meshStandardMaterial roughness={0.95} /></instancedMesh>
    <instancedMesh ref={bands} args={[undefined, undefined, books.length]}><boxGeometry /><meshStandardMaterial roughness={0.9} /></instancedMesh>
  </>
}

function Stacks() {
  return <><Books />{SHELF_X.map((x, i) => SHELF_Z.map((z, j) => <group key={`${x}-${z}`}>
    <Box at={[x, 1.44, z]} size={[0.075, 2.85, 8]} color="#313d34" />
    {[-3.98, 3.98].map(end => <Box key={end} at={[x, 1.44, z + end]} size={[1.4, 2.85, 0.075]} color="#535e4e" metalness={0.3} />)}
    {[0.27, 0.78, 1.29, 1.8, 2.31, 2.83].map(y => <Box key={y} at={[x, y, z]} size={[1.42, 0.055, 8]} color="#5a6452" metalness={0.25} />)}
    <Box at={[x, 0.13, z]} size={[1.3, 0.26, 8]} color="#30382d" />
    <Sign text={['M — N', 'P — PE', 'PF — PN', 'PQ — PR'][i]} small={`STACK ${i + 1 + j * 4}  /  FLOOR 7`} at={[x, 2.45, z + 4.03]} size={[1.25, 0.37]} glow={0.09} />
    <Sign text={['M — N', 'P — PE', 'PF — PN', 'PQ — PR'][i]} at={[x, 2.45, z - 4.03]} rotation={[0, Math.PI, 0]} size={[1.25, 0.37]} />
  </group>))}</>
}

function Desk({ x, z, w = 2.6, carrel = false }: { x: number; z: number; w?: number; carrel?: boolean }) {
  return <group position={[x, 0, z]}>
    <Box at={[0, 0.9, 0]} size={[w, 0.09, 1.4]} color="#63553d" />
    <Box at={[0, 0.83, 0]} size={[w - 0.1, 0.05, 1.28]} color="#302c22" />
    {[-1, 1].map(side => <Box key={side} at={[side * (w / 2 - 0.16), 0.43, 0]} size={[0.11, 0.85, 1.1]} color="#3e4539" metalness={0.3} />)}
    {carrel && <>
      <Box at={[0, 1.24, -0.67]} size={[w, 0.65, 0.08]} color="#5d543e" />
      {[-1, 1].map(side => <Box key={side} at={[side * w / 2, 1.24, 0]} size={[0.07, 0.65, 1.4]} color="#5d543e" />)}
    </>}
    <group position={[0.3, 0, 1.4]} rotation={[0, -0.08, 0]}>
      <Box at={[0, 0.5, 0]} size={[0.64, 0.1, 0.6]} color="#4a4c37" />
      <Box at={[0, 0.88, 0.27]} size={[0.64, 0.64, 0.08]} color="#424633" />
      {[-0.26, 0.26].map(a => [-0.24, 0.24].map(b => <Box key={`${a}-${b}`} at={[a, 0.25, b]} size={[0.045, 0.5, 0.045]} color="#242b25" metalness={0.5} />))}
    </group>
  </group>
}

function ClueObject({ id }: { id: number }) {
  const clue = CLUES[id], collected = useGame(s => s.clues.includes(id))
  const map = useMemo(() => signTexture(['I / 2', 'II / 1', 'III / 3', 'IV / 7'][id], { bg: '#d8d1b8', fg: '#332e25', small: clue.label, width: 512, height: 640, serif: true }), [clue.label, id])
  return <group position={[clue.x, clue.y + 0.025, clue.z]} rotation={[0, id * 0.18 - 0.13, 0]}>
    <Box at={[0, 0, 0]} size={[0.45, 0.012, 0.59]} color={clue.color} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[0.43, 0.56]} /><meshStandardMaterial map={map} emissive="#cac2a0" emissiveIntensity={collected ? 0.03 : 0.2} roughness={1} /></mesh>
    <Box at={[-0.16, 0.017, -0.25]} size={[0.045, 0.005, 0.12]} color="#9c3d2a" />
    {!collected && <pointLight position={[0, 0.4, 0]} color="#e0c291" intensity={1.5} distance={2.8} decay={2} />}
  </group>
}

function Lights() {
  const lights = useRef<THREE.Group>(null!)
  const material = useRef<THREE.MeshStandardMaterial>(null!)
  useFrame(() => {
    const s = useGame.getState()
    const flicker = runtime.time < s.flickerUntil
    const factor = flicker && Math.sin(runtime.time * 43) * Math.sin(runtime.time * 19) > -0.1 ? 0.06 : 1
    if (material.current) material.current.emissiveIntensity = factor * 2.5
    lights.current.children.forEach(child => { if (child instanceof THREE.PointLight) child.intensity = 13 * factor })
  })
  const positions: XYZ[] = [-12, -6, 0, 6, 12].flatMap(x => [-15, -2, 11].map(z => [x, 3.46, z] as XYZ))
  return <>
    {positions.map((p, i) => <group key={i} position={p}>
      <Box at={[0, 0, 0]} size={[0.42, 0.13, 2.6]} color="#3a453a" />
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.28, 2.4]} />
        {i === 0 ? <meshStandardMaterial ref={material} color="#d1dac1" emissive="#c1d3ac" emissiveIntensity={2.5} /> : <meshStandardMaterial color="#c4cdb5" emissive="#b4c69c" emissiveIntensity={1.7} />}
      </mesh>
    </group>)}
    <group ref={lights}>{positions.filter((_, i) => i % 2 === 0).map((p, i) => <pointLight key={i} position={[p[0], 2.95, p[2]]} color={i % 3 === 0 ? '#d4d7b3' : '#b4cab2'} intensity={13} distance={12} decay={2} />)}</group>
    <pointLight position={[0, 2.6, -18]} intensity={5} color="#ca3b24" distance={7} />
  </>
}

function Architecture() {
  const textures = useMemo(() => ({ floor: surfaceTexture('floor'), ceiling: surfaceTexture('ceiling'), wall: surfaceTexture('wall'), brick: surfaceTexture('brick') }), [])
  return <>
    <Box at={[0, -0.1, 0]} size={[32.4, 0.2, 40.4]} color="#d4d0b8" map={textures.floor} />
    <Box at={[0, 3.68, 0]} size={[32.4, 0.16, 40.4]} color="#a7b09b" map={textures.ceiling} />
    <Box at={[0, 1.8, -20.2]} size={[32.8, 3.6, 0.4]} color="#a3a98e" map={textures.wall} />
    <Box at={[0, 1.8, 20.2]} size={[32.8, 3.6, 0.4]} color="#a3a98e" map={textures.brick} />
    <Box at={[-16.2, 1.8, 0]} size={[0.4, 3.6, 40.8]} color="#a3a98e" map={textures.wall} />
    <Box at={[16.2, 1.8, 0]} size={[0.4, 3.6, 40.8]} color="#a3a98e" map={textures.wall} />
    {[-16, 16].map(x => <Box key={x} at={[x, 0.12, 0]} size={[0.08, 0.24, 40]} color="#354336" />)}
    {[-20, 20].map(z => <Box key={z} at={[0, 0.12, z]} size={[32, 0.24, 0.08]} color="#354336" />)}
    {[-12, 12].flatMap(x => [-15, 10].map(z => <group key={`${x}-${z}`}>
      <Box at={[x, 1.8, z]} size={[0.6, 3.6, 0.6]} color="#85715c" map={textures.brick} />
      <Box at={[x, 0.13, z]} size={[0.66, 0.26, 0.66]} color="#364134" />
    </group>))}
    {[-13, -6, 1, 8, 15].map(z => <group key={z}>
      <Box at={[15.96, 2.05, z]} size={[0.05, 2.35, 4.5]} color="#080f12" roughness={0.2} metalness={0.4} />
      {[-2.3, 0, 2.3].map(d => <Box key={d} at={[15.87, 2.05, z + d]} size={[0.15, 2.5, 0.07]} color="#414b41" metalness={0.4} />)}
      <Box at={[15.7, 0.89, z]} size={[0.6, 0.09, 4.8]} color="#636c5b" />
      <Box at={[15.91, 2.05, z]} size={[0.08, 0.05, 4.6]} color="#414b41" />
      {[0, 1, 2, 3, 4].map(i => <Box key={i} at={[15.9, 1.05 + i * 0.23, z + 1.2 - i * 0.12]} size={[0.01, 0.018, 0.025]} color="#afad76" emissive="#adab72" intensity={0.8} />)}
    </group>)}
    <Sign text="FLOOR 7" small="D. H. HILL / NORTH STACKS" at={[6.2, 2.35, 19.96]} rotation={[0, Math.PI, 0]} size={[4.5, 1.15]} glow={0.18} />
    <Sign text="QUIET STUDY" small="PLEASE RESPECT THE SILENCE" at={[-15.95, 2.5, -2]} rotation={[0, Math.PI / 2, 0]} size={[2, 0.55]} />
    <Sign text="← STUDY CARRELS      BOOKSTACKS →" at={[0, 2.95, 11]} size={[4, 0.28]} />
    <Sign text="EMERGENCY STAIRS ↑" at={[0, 2.95, -15.8]} size={[3.4, 0.35]} bg="#4b2620" fg="#e2c6ad" glow={0.2} />
    <Lights />
  </>
}

function ExitAndElevators() {
  const exitMap = useMemo(() => signTexture('EXIT', { bg: '#4c2018', fg: '#eed1b2' }), [])
  return <>
    <Box at={[0, 1.35, -19.88]} size={[2.3, 2.7, 0.16]} color="#273a30" metalness={0.35} />
    {[-1.2, 1.2].map(x => <Box key={x} at={[x, 1.4, -19.74]} size={[0.12, 2.8, 0.18]} color="#697361" />)}
    <Box at={[0, 2.79, -19.74]} size={[2.5, 0.12, 0.18]} color="#697361" />
    <Box at={[0, 1.15, -19.72]} size={[1.8, 0.10, 0.10]} color="#8c9986" metalness={0.7} />
    <Box at={[0, 2, -19.77]} size={[0.55, 0.58, 0.04]} color="#091510" roughness={0.15} />
    <mesh position={[0, 3.13, -19.73]}><planeGeometry args={[1.15, 0.37]} /><meshStandardMaterial map={exitMap} emissive="#dc5430" emissiveMap={exitMap} emissiveIntensity={1.5} /></mesh>
    <Box at={[1.62, 1.4, -19.73]} size={[0.34, 0.5, 0.13]} color="#252c26" metalness={0.4} />
    <Box at={[1.62, 1.54, -19.65]} size={[0.24, 0.07, 0.01]} color="#9e462c" emissive="#eb5d35" intensity={0.9} />
    {[0, 1, 2].map(a => [0, 1, 2].map(b => <Box key={`${a}-${b}`} at={[1.54 + a * 0.08, 1.41 - b * 0.08, -19.65]} size={[0.04, 0.04, 0.015]} color="#909c88" />))}
    <Sign text="STAIR 07" small="ALARMED / ACCESS CODE REQUIRED" at={[3.6, 1.8, -19.96]} size={[1.9, 0.65]} />
    {[-11, -6].map((x, index) => <group key={x}>
      <Box at={[x, 1.35, 19.89]} size={[3, 2.7, 0.19]} color="#313b32" metalness={0.8} roughness={0.45} />
      {[-0.74, 0.74].map(a => <Box key={a} at={[x + a, 1.35, 19.75]} size={[1.44, 2.6, 0.04]} color="#6b7367" metalness={0.65} roughness={0.5} />)}
      <Sign text={index === 0 ? '7' : '—'} at={[x, 2.95, 19.96]} rotation={[0, Math.PI, 0]} size={[0.5, 0.3]} bg="#1e2620" fg="#a65c3e" glow={0.35} />
      <Sign text="OUT OF SERVICE" at={[x, 1.5, 19.7]} rotation={[0, Math.PI, 0]} size={[1.6, 0.3]} bg="#b0a278" fg="#3c3527" />
    </group>)}
    <Sign text="ELEVATORS" at={[-8.5, 3.35, 19.96]} rotation={[0, Math.PI, 0]} size={[3, 0.27]} />
  </>
}

function StudyDetails() {
  const laptop = useMemo(() => signTexture('02:13', { bg: '#101b18', fg: '#adb99b', small: 'SESSION EXPIRED', width: 512, height: 320 }), [])
  return <>
    <Desk x={10.8} z={13.7} w={4.2} />
    <Box at={[11.9, 0.97, 13.65]} size={[0.85, 0.04, 0.55]} color="#252d29" metalness={0.6} />
    <group position={[11.9, 1.25, 13.37]} rotation={[-0.16, 0, 0]}>
      <Box at={[0, 0, 0]} size={[0.85, 0.56, 0.04]} color="#252d29" metalness={0.6} />
      <mesh position={[0, 0, 0.025]}><planeGeometry args={[0.77, 0.48]} /><meshBasicMaterial map={laptop} /></mesh>
    </group>
    <pointLight position={[11.9, 1.5, 13.8]} intensity={0.8} color="#aac1aa" distance={3} />
    <Box at={[9.3, 0.98, 13.5]} size={[0.55, 0.10, 0.75]} color="#5f4132" />
    <Box at={[9.28, 1.06, 13.49]} size={[0.52, 0.07, 0.68]} color="#3d4d3b" />
    <mesh position={[12.6, 1.06, 13.9]}><cylinderGeometry args={[0.1, 0.085, 0.24, 12]} /><meshStandardMaterial color="#c3c1ac" roughness={0.5} /></mesh>
    <mesh position={[12.6, 1.185, 13.9]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.083, 12]} /><meshStandardMaterial color="#201e16" /></mesh>
    {CARRELS.map(z => <Desk key={z} x={-13.55} z={z} carrel />)}
    <Desk x={-11.4} z={17} />
    <Desk x={13.7} z={-7} w={2.5} carrel />
    <Desk x={13.7} z={1} w={2.5} carrel />
    <group position={[0, 0, -8.8]}>
      {[0.35, 1.04].map(y => <Box key={y} at={[0, y, 0]} size={[1.55, 0.06, 0.85]} color="#697360" metalness={0.4} />)}
      {[-0.7, 0.7].map(x => [-0.35, 0.35].map(z => <group key={`${x}-${z}`}>
        <Box at={[x, 0.58, z]} size={[0.045, 1.1, 0.045]} color="#6c7566" metalness={0.6} />
        <mesh position={[x, 0.12, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.10, 0.10, 0.06, 10]} /><meshStandardMaterial color="#222a23" /></mesh>
      </group>))}
      {[0, 1, 2, 3].map(i => <Box key={i} at={[-0.43 + i * 0.25, 0.55 + i * 0.014, 0]} size={[0.19, 0.34, 0.5]} color={['#594932', '#3b5342', '#6b4136', '#7c7961'][i]} />)}
    </group>
    {CLUES.map(c => <ClueObject key={c.id} id={c.id} />)}
    <Sign text="RETURNS" at={[0, 0.8, -8.36]} size={[1.15, 0.24]} />
    <Sign text="READING ROOM" at={[10.6, 2.7, 18.3]} rotation={[0, Math.PI, 0]} size={[3.3, 0.4]} />
  </>
}

function Dust() {
  const points = useRef<THREE.Points>(null!)
  const positions = useMemo(() => Float32Array.from({ length: 240 * 3 }, (_, i) => i % 3 === 1 ? (Math.sin(i * 431) + 1) * 1.7 : Math.sin(i * 217) * 15), [])
  useFrame((_, dt) => { if (points.current) points.current.rotation.y += dt * 0.003 })
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#bbbea7" size={0.018} transparent opacity={0.25} depthWrite={false} /></points>
}

export function Library() {
  return <group><Architecture /><Stacks /><StudyDetails /><ExitAndElevators /><Dust /></group>
}
