import { memo, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import type { PointerLockControls as LockControls } from 'three-stdlib'
import * as THREE from 'three'
import { Library } from './Library'
import { audio } from './audio'
import { runtime, tick, useGame } from './store'
import { zoneAt } from './world'

function Entity() {
  const root = useRef<THREE.Group>(null!)
  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const arms = useRef<THREE.Group[]>([]), elbows = useRef<THREE.Group[]>([])
  const legs = useRef<THREE.Group[]>([]), knees = useRef<THREE.Group[]>([])
  const previous = useRef({ ...runtime.entity })
  const gait = useRef(0), stride = useRef(0), reset = useRef(-1)
  useFrame((_, dt) => {
    if (!root.current) return
    const s = useGame.getState()
    if (reset.current !== runtime.resetId) {
      previous.current = { ...runtime.entity }; reset.current = runtime.resetId
      stride.current = 0; gait.current = 0; root.current.position.y = 0
      torso.current.rotation.set(0, 0, 0); head.current.rotation.set(0, 0, 0)
      arms.current.forEach(arm => arm.rotation.x = 0)
      elbows.current.forEach(elbow => elbow.rotation.x = 0)
      legs.current.forEach(leg => leg.rotation.x = 0)
      knees.current.forEach(knee => knee.rotation.x = 0)
    }
    const displacement = Math.hypot(runtime.entity.x - previous.current.x, runtime.entity.z - previous.current.z)
    previous.current = { ...runtime.entity }
    // The store alone determines where it stands; no render-time pathing or teleporting.
    root.current.position.x = runtime.entity.x
    root.current.position.z = runtime.entity.z
    if (s.phase !== 'playing' && s.phase !== 'scare') return
    if (!s.phone && s.phase !== 'scare') return // Its direction and joints stop with its footsteps.
    const toward = Math.atan2(runtime.player.x - runtime.entity.x, runtime.player.z - runtime.entity.z)
    const turn = Math.atan2(Math.sin(toward - root.current.rotation.y), Math.cos(toward - root.current.rotation.y))
    root.current.rotation.y += THREE.MathUtils.clamp(turn, -dt * 2, dt * 2)
    const walking = s.phase === 'playing' && displacement > 0.002 && displacement < 1.2
    stride.current = THREE.MathUtils.lerp(stride.current, walking ? 1 : 0, Math.min(1, dt * 4))
    if (walking) gait.current += Math.min(dt, .05) * 5.5
    const beat = Math.sin(gait.current), sway = Math.sin(runtime.time * 0.78)
    torso.current.rotation.set(0.12 + stride.current * (0.06 + Math.abs(beat) * 0.045), 0, 0.11 + sway * 0.018)
    head.current.rotation.set(-0.18 + Math.sin(runtime.time * .62) * .028, 0, -0.15 + sway * .022)
    root.current.position.y = stride.current * Math.abs(beat) * .035
    for (let i = 0; i < 2; i++) {
      const step = Math.sin(gait.current + i * Math.PI)
      legs.current[i].rotation.x = stride.current * step * .27
      knees.current[i].rotation.x = Math.max(0, step) * stride.current * .32 + .06
      arms.current[i].rotation.x = -stride.current * step * .22 + (i ? -.1 : .17)
      elbows.current[i].rotation.x = .22 + stride.current * Math.max(0, -step) * .24
    }
    if (s.phase === 'scare') {
      const lean = Math.max(0, Math.min(1, (runtime.scareClock - .45) / .9))
      torso.current.rotation.x += lean * .48
      head.current.rotation.x -= lean * .19
      arms.current[0].rotation.x -= lean * .4
      arms.current[1].rotation.x -= lean * .52
    }
  })
  const skin = <meshStandardMaterial color="#030605" roughness={1} />
  return <group ref={root}>
    <mesh position={[0, 1.23, 0]} scale={[.25, .21, .17]}><sphereGeometry args={[1, 10, 8]} />{skin}</mesh>
    <group ref={torso} position={[0, 1.33, -.06]}>
      <mesh position={[0, .52, .06]} rotation={[.13, 0, -.08]}><cylinderGeometry args={[.245, .18, 1.18, 7]} />{skin}</mesh>
      <mesh position={[0, 1.07, .17]} scale={[.43, .17, .23]}><sphereGeometry args={[1, 10, 8]} />{skin}</mesh>
      <mesh position={[0, 1.3, .18]}><cylinderGeometry args={[.095, .07, .36, 7]} />{skin}</mesh>
      <group ref={head} position={[0, 1.5, .22]}>
        <mesh position={[0, .16, .03]} scale={[.21, .34, .19]}><sphereGeometry args={[1, 12, 10]} />{skin}</mesh>
      </group>
      {[-1, 1].map((side, i) => <group key={`arm-${side}`} ref={node => { if (node) arms.current[i] = node }} position={[side * .35, 1.06 - (i ? .10 : 0), .1]} rotation={[0, 0, side * .12]}>
        <mesh position={[side * .025, -.44, 0]} rotation={[0, 0, side * .07]}><cylinderGeometry args={[.09, .068, .88, 7]} />{skin}</mesh>
        <group ref={node => { if (node) elbows.current[i] = node }} position={[side * .04, -.87, 0]}>
          <mesh position={[0, -.4, 0]}><cylinderGeometry args={[.068, .04, .81, 7]} />{skin}</mesh>
          <mesh position={[0, -.83, .02]} scale={[.064, .16, .075]}><sphereGeometry args={[1, 8, 8]} />{skin}</mesh>
        </group>
      </group>)}
    </group>
    {[-1, 1].map((side, i) => <group key={`leg-${side}`} ref={node => { if (node) legs.current[i] = node }} position={[side * .15, 1.34, 0]}>
      <mesh position={[0, -.37, 0]}><cylinderGeometry args={[.12, .075, .73, 7]} />{skin}</mesh>
      <group ref={node => { if (node) knees.current[i] = node }} position={[0, -.74, 0]}>
        <mesh position={[0, -.27, 0]}><cylinderGeometry args={[.075, .052, .55, 7]} />{skin}</mesh>
        <mesh position={[0, -.53, .085]} scale={[.09, .06, .2]}><sphereGeometry args={[1, 8, 8]} />{skin}</mesh>
      </group>
    </group>)}
  </group>
}

function RenderBudget({ setDpr }: { setDpr: (dpr: number) => void }) {
  const { gl, size } = useThree()
  const budget = useRef(1_800_000)
  const maxBudget = useRef(1_800_000)
  const minBudget = useRef(500_000)
  const sample = useRef({ seconds: 0, frames: 0 })
  useEffect(() => {
    const context = gl.getContext()
    const extension = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = extension ? String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : ''
    const software = /swiftshader|llvmpipe|software/i.test(renderer)
    maxBudget.current = software ? 280_000 : 1_800_000
    minBudget.current = software ? 160_000 : 500_000
    budget.current = Math.min(budget.current, maxBudget.current)
    if (!software && budget.current < minBudget.current) budget.current = maxBudget.current
    const pixels = Math.max(1, size.width * size.height)
    setDpr(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(budget.current / pixels)))
    sample.current = { seconds: 0, frames: 0 }
  }, [gl, setDpr, size.width, size.height])
  useFrame((_, dt) => {
    sample.current.seconds += dt
    sample.current.frames++
    if (sample.current.seconds < 4) return
    const fps = sample.current.frames / sample.current.seconds
    if (fps < 26 && budget.current > minBudget.current) budget.current = Math.max(minBudget.current, budget.current * .78)
    else if (fps > 53 && budget.current < maxBudget.current) budget.current = Math.min(maxBudget.current, budget.current * 1.12)
    setDpr(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(budget.current / Math.max(1, size.width * size.height))))
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
  const scareOrigin = useRef(new THREE.Vector3())
  const lastPhase = useRef(useGame.getState().phase)
  const lastPanel = useRef(useGame.getState().panel)
  const lastChairRun = useRef(-1)
  const audioAt = useRef(-1)

  useEffect(() => {
    runtime.lock = () => { try { controls.current?.lock() } catch { useGame.getState().pause() } }
    runtime.unlock = () => { controls.current?.unlock(); keys.current.clear() }
    const down = (event: KeyboardEvent) => {
      const s = useGame.getState()
      if (s.phase !== 'playing' || s.help || event.altKey || event.ctrlKey || event.metaKey) return
      const editable = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable="true"]')
      const interactive = event.target instanceof Element && !!event.target.closest('button, input, textarea, select, [contenteditable="true"], [role="dialog"]')
      if (event.key === 'Escape') {
        event.preventDefault()
        if (s.panel) { s.closePanel(); runtime.lock?.() }
        else if (s.keypad) { s.closeKeypad(); runtime.lock?.() }
        else s.pause()
        return
      }
      if (s.panel && event.code === 'KeyQ' && !editable && !event.repeat) { event.preventDefault(); s.togglePhone(); runtime.lock?.(); return }
      if (s.phone && event.code === 'KeyX' && !editable && !event.repeat) {
        event.preventDefault()
        if (runtime.phoneUi) { runtime.phoneUi = false; runtime.lock?.() }
        else if (locked.current) { runtime.phoneUi = true; runtime.unlock?.() }
        return
      }
      if (s.keypad) {
        if (editable) return
        if (event.key === 'Enter' && !interactive) { event.preventDefault(); if (!event.repeat) s.submit() }
        else if (/^\d$/.test(event.key) || event.key === 'Backspace') { event.preventDefault(); if (!event.repeat) s.digit(event.key) }
        return
      }
      if (s.panel || interactive) return // Keep native focus and buttons; no hidden-answer shortcuts.
      if (!locked.current) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault()
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight'].includes(event.code)) keys.current.add(event.code)
      if (event.repeat) return
      if (event.code === 'KeyQ') s.togglePhone()
      else if (event.code === 'KeyE') s.interact()
      else if (event.code === 'KeyF' && s.phone) useGame.setState({ flashlight: !s.flashlight })
      else if (event.code === 'Tab' && s.phone) {
        const tabs = ['notes', 'map', 'objectives'] as const
        useGame.setState({ tab: tabs[(tabs.indexOf(s.tab) + 1) % tabs.length] })
      } else if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && s.phone && s.tab === 'notes') {
        const clues = [...s.clues].sort(), current = clues.indexOf(s.selectedNote)
        if (clues.length) useGame.setState({ selectedNote: clues[(current + (event.code === 'ArrowRight' ? 1 : clues.length - 1)) % clues.length] })
      } else if (event.key === '?' || (event.code === 'Slash' && event.shiftKey)) useGame.setState({ hint: !s.hint })
      else if (event.code === 'KeyH') useGame.setState({ capture: !s.capture })
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const blur = () => { keys.current.clear(); useGame.getState().pause() }
    const visibility = () => { if (document.hidden) blur() }
    const error = () => { onLocked(false); locked.current = false; keys.current.clear(); useGame.getState().pause() }
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
      camera.position.set(-4 + Math.sin(clock.elapsedTime * 0.06) * 0.25, 1.8, -32)
      camera.lookAt(-11, 1.15, -37)
    } else if (lastReset.current !== runtime.resetId) {
      lastReset.current = runtime.resetId
      camera.position.set(runtime.player.x, 1.67, runtime.player.z)
      camera.lookAt(-11, 1.1, -37)
      keys.current.clear()
    }
    if (s.phase === 'playing') {
      audio.setSurface(zoneAt(runtime.player))
      if (s.panel && !lastPanel.current) audio.puzzle()
      if (runtime.triggers.has('chair') && lastChairRun.current !== runtime.resetId) { lastChairRun.current = runtime.resetId; audio.chair() }
      if (clock.elapsedTime - audioAt.current > .12) {
        audioAt.current = clock.elapsedTime
        const dx = runtime.entity.x - runtime.player.x, dz = runtime.entity.z - runtime.player.z
        const distance = Math.hypot(dx, dz)
        audio.proximity(distance, (-runtime.direction.z * dx + runtime.direction.x * dz) / Math.max(2, distance))
      }
      camera.getWorldDirection(direction.current)
      direction.current.y = 0; direction.current.normalize()
      runtime.direction = { x: direction.current.x, z: direction.current.z }
      side.current.crossVectors(direction.current, camera.up).normalize()
      const forward = +(keys.current.has('KeyW') || keys.current.has('ArrowUp')) - +(keys.current.has('KeyS') || keys.current.has('ArrowDown'))
      const strafe = +keys.current.has('KeyD') - +keys.current.has('KeyA')
      tmp.current.copy(direction.current).multiplyScalar(forward).addScaledVector(side.current, strafe).normalize()
      tick(dt, locked.current && !s.keypad && !s.panel ? { x: tmp.current.x, z: tmp.current.z } : { x: 0, z: 0 }, keys.current.has('ShiftLeft') || keys.current.has('ShiftRight'))
      const bob = runtime.moving && locked.current ? Math.sin(runtime.time * (keys.current.has('ShiftLeft') ? 16 : 10)) * 0.024 : 0
      camera.position.set(runtime.player.x, 1.67 + bob, runtime.player.z)
    }
    if (s.phase === 'scare') {
      if (lastPhase.current !== 'scare') scareOrigin.current.copy(camera.position)
      tick(dt, { x: 0, z: 0 }, false) // Store owns the 1.65-second transition to caught.
      const progress = Math.min(1, runtime.scareClock / 1.65)
      const lunge = Math.max(0, (progress - 0.42) / 0.58) ** 2
      const offset = tmp.current.set(scareOrigin.current.x - runtime.entity.x, 0, scareOrigin.current.z - runtime.entity.z).normalize()
      if (offset.lengthSq() < 0.01) offset.set(0, 0, 1)
      const near = side.current.set(runtime.entity.x + offset.x * 0.48, 1.92, runtime.entity.z + offset.z * 0.48)
      camera.position.lerpVectors(scareOrigin.current, near, lunge)
      const look = direction.current.set(runtime.entity.x, 2.47, runtime.entity.z)
      camera.lookAt(look)
      camera.rotateZ(Math.sin(progress * 13) * 0.012 * progress - progress * 0.07)
    } else if (s.phase === 'caught') camera.lookAt(runtime.entity.x, 2.35, runtime.entity.z)
    lastPhase.current = s.phase
    lastPanel.current = s.panel
    camera.getWorldDirection(direction.current)
    flashlight.current.position.copy(camera.position).addScaledVector(direction.current, 0.15)
    target.current.position.copy(camera.position).addScaledVector(direction.current, 12)
    target.current.updateMatrixWorld()
    flashlight.current.target = target.current
    const phoneLight = s.phone && s.flashlight
    flashlight.current.intensity = phoneLight ? 30 : s.phase === 'title' ? 7 : 1.5
    flashlight.current.angle = phoneLight ? 0.6 : 0.45
    flashlight.current.distance = phoneLight ? 24 : 5
    gl.domElement.style.cursor = locked.current ? 'none' : 'default'
  })
  return <>
    <PointerLockControls ref={controls} makeDefault pointerSpeed={0.65} selector="#manual-lock-only"
      onLock={() => { runtime.phoneUi = false; locked.current = true; onLocked(true) }}
      onUnlock={() => { locked.current = false; onLocked(false); keys.current.clear(); const s = useGame.getState(); if (s.phase === 'playing' && !s.keypad && !s.panel && !runtime.phoneUi) s.pause() }} />
    <spotLight ref={flashlight} color="#e5e4ca" penumbra={0.7} decay={1.4} intensity={5} />
    <primitive object={target.current} />
  </>
}

export const Scene = memo(function Scene({ onLocked, onReady }: { onLocked: (value: boolean) => void; onReady: () => void }) {
  const [contextLost, setContextLost] = useState(false)
  const [dpr, setDpr] = useState(1)
  return <>
    <Canvas camera={{ fov: 68, near: 0.08, far: 120 }} dpr={dpr} gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.25
        gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); useGame.getState().pause() })
        onReady()
      }}>
      <color attach="background" args={['#151c18']} />
      <fog attach="fog" args={['#151c18', 17, 78]} />
      <ambientLight intensity={0.36} color="#9aa88a" />
      <hemisphereLight args={['#b4c5a7', '#363a26', 0.8]} />
      <RenderBudget setDpr={setDpr} />
      <Suspense fallback={null}><Library /><Entity /></Suspense>
      <Controller onLocked={onLocked} />
    </Canvas>
    {contextLost && <div className="fatal-screen"><h2>The lights went out.</h2><p>Your graphics context was interrupted. Reload to restore it.</p><button onClick={() => location.reload()}>Reload game</button></div>}
  </>
})
