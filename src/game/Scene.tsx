import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import type { PointerLockControls as LockControls } from 'three-stdlib'
import * as THREE from 'three'
import { Library } from './Library'
import { runtime, tick, useGame } from './store'

function Entity() {
  const ref = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.set(runtime.entity.x, 0, runtime.entity.z)
    ref.current.rotation.y = Math.atan2(runtime.player.x - runtime.entity.x, runtime.player.z - runtime.entity.z)
    ref.current.rotation.z = useGame.getState().phone ? Math.sin(clock.elapsedTime * 1.8) * 0.012 : 0
  })
  const skin = <meshStandardMaterial color="#030605" roughness={1} />
  return <group ref={ref}>
    <mesh position={[0, 2.61, 0]} scale={[0.21, 0.34, 0.185]}><sphereGeometry args={[1, 16, 12]} />{skin}</mesh>
    <mesh position={[0, 1.93, 0]}><cylinderGeometry args={[0.35, 0.23, 1.12, 7]} />{skin}</mesh>
    <mesh position={[0, 2.29, 0]} scale={[1, 0.4, 0.6]}><sphereGeometry args={[0.38, 12, 8]} />{skin}</mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.39, 1.66, 0]} rotation={[0, 0, side * 0.10]}><cylinderGeometry args={[0.082, 0.06, 1.48, 7]} />{skin}</mesh>
      <mesh position={[side * 0.46, 0.87, 0.035]} scale={[0.06, 0.22, 0.075]}><sphereGeometry args={[1, 8, 8]} />{skin}</mesh>
      <mesh position={[side * 0.15, 0.65, 0]} rotation={[0, 0, side * -0.06]}><cylinderGeometry args={[0.105, 0.065, 1.3, 7]} />{skin}</mesh>
      <mesh position={[side * 0.18, 0.055, 0.07]} scale={[0.085, 0.055, 0.2]}><sphereGeometry args={[1, 8, 8]} />{skin}</mesh>
    </group>)}
  </group>
}

function RenderBudget() {
  const { gl, size, setDpr } = useThree()
  const budget = useRef(900_000)
  const sample = useRef({ seconds: 0, frames: 0 })
  useEffect(() => {
    const context = gl.getContext()
    const extension = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = extension ? String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : ''
    budget.current = /swiftshader|llvmpipe|software/i.test(renderer) ? 220_000 : 900_000
    setDpr(Math.min(devicePixelRatio, 1.5, Math.sqrt(budget.current / (size.width * size.height))))
    sample.current = { seconds: 0, frames: 0 }
  }, [gl, setDpr, size.width, size.height])
  useFrame((_, dt) => {
    sample.current.seconds += dt
    sample.current.frames++
    if (sample.current.seconds < 3) return
    const fps = sample.current.frames / sample.current.seconds
    if (fps < 26 && budget.current > 80_000) {
      budget.current = Math.max(80_000, budget.current * 0.65)
      setDpr(Math.min(devicePixelRatio, 1.5, Math.sqrt(budget.current / (size.width * size.height))))
    }
    sample.current = { seconds: 0, frames: 0 }
  })
  return null
}

function Controller({ onLocked }: { onLocked: (value: boolean) => void }) {
  const { camera, gl } = useThree()
  const controls = useRef<LockControls>(null)
  const keys = useRef(new Set<string>())
  const lastReset = useRef(-1)
  const flashlight = useRef<THREE.SpotLight>(null!)
  const target = useRef(new THREE.Object3D())
  const direction = useRef(new THREE.Vector3())
  const side = useRef(new THREE.Vector3())
  const tmp = useRef(new THREE.Vector3())
  const locked = useRef(false)

  useEffect(() => {
    runtime.lock = () => { try { controls.current?.lock() } catch { useGame.getState().pause() } }
    runtime.unlock = () => { controls.current?.unlock(); keys.current.clear() }
    const down = (event: KeyboardEvent) => {
      const s = useGame.getState()
      if (s.phase !== 'playing') return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault()
      keys.current.add(event.code)
      if (event.repeat) return
      if (s.keypad) {
        if (event.key === 'Escape') s.closeKeypad()
        else if (event.key === 'Enter') s.submit()
        else s.digit(event.key)
        return
      }
      if (event.code === 'KeyQ') s.togglePhone()
      if (event.code === 'KeyE') s.interact()
      if (event.code === 'KeyF' && s.phone) useGame.setState({ flashlight: !s.flashlight })
      if (event.code === 'Tab' && s.phone) useGame.setState({ tab: s.tab === 'notes' ? 'map' : 'notes' })
      if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && s.phone) {
        const clues = [...s.clues].sort(), current = clues.indexOf(s.selectedNote)
        if (clues.length) useGame.setState({ selectedNote: clues[(current + (event.code === 'ArrowRight' ? 1 : clues.length - 1)) % clues.length] })
      }
      if (event.code === 'KeyH') useGame.setState({ capture: !s.capture })
      if (event.code === 'Escape') s.pause()
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const blur = () => { keys.current.clear(); useGame.getState().pause() }
    const visibility = () => { if (document.hidden) blur() }
    const error = () => { onLocked(false); locked.current = false; useGame.getState().pause() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility); document.addEventListener('pointerlockerror', error)
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility); document.removeEventListener('pointerlockerror', error)
      runtime.lock = null; runtime.unlock = null
    }
  }, [onLocked])

  useFrame(({ clock }, dt) => {
    const s = useGame.getState()
    if (s.phase === 'title') {
      camera.position.set(5.6 + Math.sin(clock.elapsedTime * 0.06) * 0.3, 1.73, 13.4)
      camera.lookAt(-3.8, 1.7, -12)
    } else if (lastReset.current !== runtime.resetId) {
      lastReset.current = runtime.resetId
      camera.position.set(runtime.player.x, 1.67, runtime.player.z)
      camera.lookAt(runtime.player.x - 2.5, 1.3, runtime.player.z - 10)
      keys.current.clear()
    }
    if (s.phase === 'playing') {
      camera.getWorldDirection(direction.current)
      direction.current.y = 0; direction.current.normalize()
      runtime.direction = { x: direction.current.x, z: direction.current.z }
      side.current.crossVectors(direction.current, camera.up).normalize()
      const forward = +(keys.current.has('KeyW') || keys.current.has('ArrowUp')) - +(keys.current.has('KeyS') || keys.current.has('ArrowDown'))
      const strafe = +keys.current.has('KeyD') - +keys.current.has('KeyA')
      tmp.current.copy(direction.current).multiplyScalar(forward).addScaledVector(side.current, strafe).normalize()
      if (locked.current || s.keypad) tick(dt, locked.current ? { x: tmp.current.x, z: tmp.current.z } : { x: 0, z: 0 }, keys.current.has('ShiftLeft') || keys.current.has('ShiftRight'))
      const bob = runtime.moving && locked.current ? Math.sin(runtime.time * (keys.current.has('ShiftLeft') ? 16 : 10)) * 0.024 : 0
      camera.position.set(runtime.player.x, 1.67 + bob, runtime.player.z)
    }
    if (s.phase === 'caught') camera.lookAt(runtime.entity.x, 2.3, runtime.entity.z)
    camera.getWorldDirection(direction.current)
    flashlight.current.position.copy(camera.position).addScaledVector(direction.current, 0.15)
    target.current.position.copy(camera.position).addScaledVector(direction.current, 12)
    target.current.updateMatrixWorld()
    flashlight.current.target = target.current
    const phoneLight = s.phone && s.flashlight
    flashlight.current.intensity = phoneLight ? 30 : s.phase === 'title' ? 7 : 4.5
    flashlight.current.angle = phoneLight ? 0.6 : 0.45
    flashlight.current.distance = phoneLight ? 24 : 11
    gl.domElement.style.cursor = locked.current ? 'none' : 'default'
  })
  return <>
    <PointerLockControls ref={controls} makeDefault pointerSpeed={0.65} selector="#manual-lock-only"
      onLock={() => { locked.current = true; onLocked(true) }}
      onUnlock={() => { locked.current = false; onLocked(false); keys.current.clear(); const s = useGame.getState(); if (s.phase === 'playing' && !s.keypad) s.pause() }} />
    <spotLight ref={flashlight} color="#e5e4ca" penumbra={0.7} decay={1.4} intensity={5} />
    <primitive object={target.current} />
  </>
}

export function Scene({ onLocked, onReady }: { onLocked: (value: boolean) => void; onReady: () => void }) {
  const [contextLost, setContextLost] = useState(false)
  return <>
    <Canvas camera={{ fov: 68, near: 0.08, far: 60 }} dpr={1} gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.25
        gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); useGame.getState().pause() })
        onReady()
      }}>
      <color attach="background" args={['#151c18']} />
      <fog attach="fog" args={['#151c18', 9, 35]} />
      <ambientLight intensity={0.36} color="#9aa88a" />
      <hemisphereLight args={['#b4c5a7', '#363a26', 0.8]} />
      <RenderBudget />
      <Suspense fallback={null}><Library /><Entity /></Suspense>
      <Controller onLocked={onLocked} />
    </Canvas>
    {contextLost && <div className="fatal-screen"><h2>The lights went out.</h2><p>Your graphics context was interrupted. Reload to restore it.</p><button onClick={() => location.reload()}>Reload game</button></div>}
  </>
}
