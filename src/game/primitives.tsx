import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { signTexture } from './textures'
export type XYZ = [number, number, number]
export type Instance = { at: XYZ; size: XYZ; color: string; rotation?: XYZ }
const cube = new THREE.BoxGeometry(1, 1, 1)
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 16)
const materials = new Map<string, THREE.MeshLambertMaterial>()
export function Box({ at, size, color, map, emissive, intensity = 0 }: { at: XYZ; size: XYZ; color: string; map?: THREE.Texture; emissive?: string; intensity?: number; roughness?: number; metalness?: number }) {
  const key = [color, map?.uuid, emissive, intensity].join('/')
  let material = materials.get(key)
  if (!material) { material = new THREE.MeshLambertMaterial({ color, map: map ?? null, emissive: emissive ?? '#000000', emissiveIntensity: intensity }); materials.set(key, material) }
  return <mesh geometry={cube} material={material} position={at} scale={size} dispose={null} />
}
export function Instances({ items, round = false, unlit = false }: { items: Instance[]; round?: boolean; unlit?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const object = new THREE.Object3D(), color = new THREE.Color()
    items.forEach((item, i) => { object.position.set(...item.at); object.scale.set(...item.size); object.rotation.set(...(item.rotation ?? [0, 0, 0])); object.updateMatrix(); ref.current.setMatrixAt(i, object.matrix); ref.current.setColorAt(i, color.set(item.color)) })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingBox(); ref.current.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[round ? cylinder : cube, undefined, items.length]} dispose={null}>{unlit ? <meshBasicMaterial color="white" /> : <meshLambertMaterial color="white" />}</instancedMesh>
}
export function Sign({ text, at, size, rotation = [0, 0, 0], small, bg, fg, glow = .16 }: { text: string; at: XYZ; size: [number, number]; rotation?: XYZ; small?: string; bg?: string; fg?: string; glow?: number }) {
  const map = useMemo(() => signTexture(text, { small, bg, fg, border: bg !== 'transparent' }), [text, small, bg, fg])
  return <mesh position={at} rotation={rotation}><planeGeometry args={size} /><meshBasicMaterial map={map} color={glow > 0 ? '#ffffff' : '#b9b9af'} transparent={bg === 'transparent'} alphaTest={bg === 'transparent' ? .05 : 0} side={THREE.DoubleSide} /></mesh>
}
