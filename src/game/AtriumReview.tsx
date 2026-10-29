import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Inferred public-photo compositions, never a measured building/security plan.
export const ATRIUM_CAMERAS = {
  hero: { photo: 'IMG_1042.JPG', at: [-7, 1.67, -9], target: [3.5, 10.5, 7], fov: 84 },
  stair: { photo: 'IMG_1047.JPG', at: [20, 1.67, -6], target: [14, 7, 1], fov: 90 },
  landing: { photo: 'IMG_1055.JPG', at: [9.5, 6.67, -10], target: [-.5, 9, 8.4], fov: 78 },
} satisfies Record<string, { photo: string; at: number[]; target: number[]; fov: number }>

/** Development-only camera fixture; no state unlocks, production cheats or extra lighting. */
export function AtriumReview() {
  const name = new URLSearchParams(location.search).get('camera')
  const view = name && name in ATRIUM_CAMERAS ? ATRIUM_CAMERAS[name as keyof typeof ATRIUM_CAMERAS] : null
  useFrame(({ camera }) => {
    if (!view) return
    camera.position.fromArray(view.at)
    camera.lookAt(new THREE.Vector3().fromArray(view.target))
    const perspective = camera as THREE.PerspectiveCamera
    if (perspective.fov !== view.fov) { perspective.fov = view.fov; perspective.updateProjectionMatrix() }
  })
  return null
}
