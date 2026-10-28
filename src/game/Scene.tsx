import { memo, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import type { PointerLockControls as LockControls } from 'three-stdlib'
import * as THREE from 'three'
import { Library } from './Library'
import { audio } from './audio'
import { runtime, tick, useGame } from './store'
import { ANCHORS, SPAWN, floorY, zoneAt, type Floor, type Point } from './world'

const EYE = 1.67
const still = { x: 0, z: 0 }

function Entity() {
  const root = useRef<THREE.Group>(null!)
  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const arms = useRef<THREE.Group[]>([]), elbows = useRef<THREE.Group[]>([])
  const legs = useRef<THREE.Group[]>([]), knees = useRef<THREE.Group[]>([])
  const previous = useRef({ ...runtime.entity })
  const gait = useRef(0), stride = useRef(0), reset = useRef(-1), lastFloor = useRef<Floor>(runtime.entityFloor)
  useFrame((_, dt) => {
    if (!root.current) return
    const s = useGame.getState()
    if (reset.current !== runtime.resetId) {
      previous.current = { ...runtime.entity }; reset.current = runtime.resetId
      stride.current = 0; gait.current = 0
      torso.current.rotation.set(0, 0, 0); head.current.rotation.set(0, 0, 0)
      arms.current.forEach(arm => arm.rotation.x = 0)
      elbows.current.forEach(elbow => elbow.rotation.x = 0)
      legs.current.forEach(leg => leg.rotation.x = 0)
      knees.current.forEach(knee => knee.rotation.x = 0)
    }
    const displacement = lastFloor.current === runtime.entityFloor ? Math.hypot(runtime.entity.x - previous.current.x, runtime.entity.z - previous.current.z) : 0
    previous.current = { ...runtime.entity }; lastFloor.current = runtime.entityFloor
    // The store is the ONLY source of translation and floor; joint animation never paths the entity.
    root.current.position.set(runtime.entity.x, floorY(runtime.entityFloor), runtime.entity.z)
    root.current.visible = s.phase === 'scare' || ((s.phase === 'playing' || s.phase === 'stairs') && (s.phone || s.power || s.phoneTaught || runtime.triggers.has('scene-first-balcony')))
    if (s.phase !== 'playing' && s.phase !== 'scare') return
    if (!s.phone && s.phase !== 'scare') return // Closing the phone stops turning and gait immediately.
    const toward = runtime.entityFloor === s.floor ? Math.atan2(runtime.player.x - runtime.entity.x, runtime.player.z - runtime.entity.z) : Math.atan2(-runtime.entity.x, -runtime.entity.z)
    const turn = Math.atan2(Math.sin(toward - root.current.rotation.y), Math.cos(toward - root.current.rotation.y))
    root.current.rotation.y += THREE.MathUtils.clamp(turn, -dt * 2, dt * 2)
    const walking = s.phase === 'playing' && displacement > 0.002 && displacement < 1.2
    stride.current = THREE.MathUtils.lerp(stride.current, walking ? 1 : 0, Math.min(1, dt * 4))
    if (walking) gait.current += Math.min(dt, .05) * 5.5
    const beat = Math.sin(gait.current), sway = Math.sin(runtime.time * 0.78)
    torso.current.rotation.set(0.12 + stride.current * (0.06 + Math.abs(beat) * 0.045), 0, 0.11 + sway * 0.018)
    head.current.rotation.set(-0.18 + Math.sin(runtime.time * .62) * .028, 0, -0.15 + sway * .022)
    torso.current.position.y = 1.33 + stride.current * Math.abs(beat) * .035
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
  const skin = <meshLambertMaterial color="#101214" emissive="#070709" emissiveIntensity={.16} />
  return <group ref={root} visible={false}>
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

// The environment owns a maximum two pooled point lights. Low/SwiftShader uses
// only the nearest one; its material/strip lighting and ambient fill remain intact.
function PoolQuality() {
  const { scene } = useThree()
  const pool = useRef<THREE.PointLight[]>([])
  useFrame(() => {
    if (pool.current.length < 2) scene.traverse(object => { if (object instanceof THREE.PointLight && !pool.current.includes(object)) pool.current.push(object) })
    if (pool.current[1]) pool.current[1].visible = useGame.getState().graphics === 'high'
  })
  return null
}

function RenderBudget({ setDpr }: { setDpr: (dpr: number) => void }) {
  const { gl, size } = useThree()
  const graphics = useGame(s => s.graphics)
  const budget = useRef(850_000), maximum = useRef(850_000), minimum = useRef(400_000)
  const software = useRef(false), currentDpr = useRef(1)
  const sample = useRef({ seconds: 0, frames: 0 })
  useEffect(() => {
    const context = gl.getContext()
    const extension = context.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER))
    software.current = /swiftshader|llvmpipe|software/i.test(renderer)
    // Software rendering gets the low preset too: the point-light pool and
    // flashlight budget respond to s.graphics, not just the framebuffer size.
    if (software.current && graphics !== 'low') { useGame.getState().setGraphics('low'); return }
    maximum.current = software.current ? 210_000 : graphics === 'low' ? 850_000 : 1_800_000
    minimum.current = software.current ? 120_000 : graphics === 'low' ? 420_000 : 700_000
    budget.current = maximum.current
    gl.domElement.dataset.renderTier = software.current ? 'software-low' : graphics
    gl.domElement.dataset.pixelBudget = String(maximum.current)
    gl.shadowMap.enabled = false
    const dpr = Math.max(.45, Math.min(window.devicePixelRatio || 1, software.current ? .8 : graphics === 'low' ? 1.1 : 1.6, Math.sqrt(budget.current / Math.max(1, size.width * size.height))))
    currentDpr.current = dpr; setDpr(dpr)
    sample.current = { seconds: 0, frames: 0 }
  }, [gl, graphics, setDpr, size.width, size.height])
  useFrame((_, dt) => {
    if (document.hidden) return
    sample.current.seconds += Math.min(dt, .1)
    sample.current.frames++
    if (sample.current.seconds < 4) return
    const fps = sample.current.frames / sample.current.seconds
    if (fps < 26) budget.current = Math.max(minimum.current, budget.current * .8)
    else if (fps > 53) budget.current = Math.min(maximum.current, budget.current * 1.12)
    const dpr = Math.max(.45, Math.min(window.devicePixelRatio || 1, software.current ? .8 : graphics === 'low' ? 1.1 : 1.6, Math.sqrt(budget.current / Math.max(1, size.width * size.height))))
    if (Math.abs(dpr - currentDpr.current) > .025) { currentDpr.current = dpr; setDpr(dpr) }
    sample.current = { seconds: 0, frames: 0 }
  })
  return null
}

// The cinematic stays inside the open atrium void, revealing skylight, columns,
// red sofa islands, staircase height and finally the Floor 2 entrance.
const introPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2, 13.2, 6), new THREE.Vector3(-5, 10.5, 4),
  new THREE.Vector3(-3, 7.7, 3), new THREE.Vector3(6, 4.1, 8),
  new THREE.Vector3(5, 2.3, 14), new THREE.Vector3(SPAWN.x, EYE, SPAWN.z),
])
const introTargets = [new THREE.Vector3(0, 16.3, 0), new THREE.Vector3(-6, 1.2, 3),
  new THREE.Vector3(11, 8, 11.5), new THREE.Vector3(16, 3.5, 4),
  new THREE.Vector3(0, 2.5, 20.5), new THREE.Vector3(ANCHORS.entrance.x, EYE, ANCHORS.entrance.z)]
function introLook(progress: number, out: THREE.Vector3) {
  const index = Math.min(introTargets.length - 2, Math.floor(progress * (introTargets.length - 1)))
  return out.copy(introTargets[index]).lerp(introTargets[index + 1], progress * (introTargets.length - 1) - index)
}
function safeArrival(floor: Floor, player: Point): Point {
  if (floor === 2) return ANCHORS.entrance // doors, across the unobstructed south atrium
  if (floor === 3) return { x: player.x > 0 ? 16 : -16, z: -16 } // north ring toward ballroom
  return { x: player.x < 0 ? -16 : 16, z: player.x < 0 ? 14 : -15 } // F4 controls by the ring, not through void
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
  const audioAt = useRef(-1)
  const suppressUnlock = useRef(false)
  const beat = useRef({ kind: '', started: 0, cancelled: false })
  const lookMatrix = useRef(new THREE.Matrix4())
  const lookQuaternion = useRef(new THREE.Quaternion())
  const escapeOrigin = useRef(new THREE.Vector3())
  const escapeCurtain = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null>(null)

  useEffect(() => {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#020408', transparent: true, opacity: 0, depthTest: false, depthWrite: false }))
    curtain.visible = false; curtain.position.z = -.18; curtain.renderOrder = 10000
    camera.add(curtain); escapeCurtain.current = curtain
    return () => { camera.remove(curtain); curtain.geometry.dispose(); curtain.material.dispose(); escapeCurtain.current = null }
  }, [camera])

  useEffect(() => {
    runtime.lock = () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      try { controls.current?.lock() } catch { if (useGame.getState().phase === 'playing') useGame.getState().pause() }
    }
    runtime.unlock = () => { controls.current?.unlock(); keys.current.clear() }
    const closePuzzle = () => {
      suppressUnlock.current = locked.current
      useGame.getState().closePanel(); runtime.lock?.()
      // A puzzle's unlock event may arrive after Escape; don't suppress a later real pause.
      window.setTimeout(() => { suppressUnlock.current = false }, 250)
    }
    const down = (event: KeyboardEvent) => {
      const s = useGame.getState()
      if (s.phase !== 'playing' || s.help || event.altKey || event.ctrlKey || event.metaKey) return
      const editable = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable="true"]')
      const interactive = event.target instanceof Element && !!event.target.closest('button, input, textarea, select, [contenteditable="true"], [role="dialog"]')
      if (event.key === 'Escape') {
        event.preventDefault()
        if (s.panel) closePuzzle()
        else s.pause()
        return
      }
      if (s.panel && event.code === 'KeyQ' && !editable && !event.repeat) { event.preventDefault(); closePuzzle(); return }
      if (runtime.phoneUi && event.code === 'KeyQ' && !editable && !event.repeat) { event.preventDefault(); s.togglePhone(); runtime.lock?.(); return }
      if (s.phone && event.code === 'KeyX' && !editable && !event.repeat) {
        event.preventDefault()
        if (runtime.phoneUi) { runtime.phoneUi = false; runtime.lock?.() }
        else if (locked.current) { runtime.phoneUi = true; runtime.unlock?.() }
        return
      }
      if (s.panel || interactive) return // Native focus/buttons; no hidden puzzle-answer shortcuts.
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
      } else if (event.key === '?' || (event.code === 'Slash' && event.shiftKey)) useGame.setState({ hint: !s.hint })
      else if (event.code === 'KeyH') useGame.setState({ capture: !s.capture })
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const mouse = (event: MouseEvent) => { if (locked.current && Math.abs(event.movementX) + Math.abs(event.movementY) > 2) beat.current.cancelled = true }
    const blur = () => { keys.current.clear(); beat.current.cancelled = true; if (useGame.getState().phase === 'playing') useGame.getState().pause() }
    const visibility = () => { if (document.hidden) blur() }
    const error = () => { onLocked(false); locked.current = false; keys.current.clear(); if (useGame.getState().phase === 'playing') useGame.getState().pause() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousemove', mouse); window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility); document.addEventListener('pointerlockerror', error)
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousemove', mouse); window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility); document.removeEventListener('pointerlockerror', error)
      runtime.lock = null; runtime.unlock = null
    }
  }, [onLocked])

  useFrame(({ clock }, dt) => {
    const s = useGame.getState()
    const visible = !document.hidden && document.hasFocus()
    if (lastReset.current !== runtime.resetId) {
      lastReset.current = runtime.resetId; keys.current.clear()
      beat.current = { kind: '', started: 0, cancelled: false }
      camera.position.set(runtime.player.x, floorY(s.floor) + EYE, runtime.player.z)
      const arrival = safeArrival(s.floor, runtime.player)
      camera.lookAt(arrival.x, floorY(s.floor) + EYE, arrival.z)
    }
    if (s.phase === 'title') {
      camera.position.set(1.7 + Math.sin(clock.elapsedTime * .06) * .45, 9.4, 12.6)
      camera.lookAt(-2, 5.2, -1)
    } else if (s.phase === 'intro') {
      if (visible) tick(dt, still, false) // The store owns all 24 seconds, including skip/auto-enter.
      const p = THREE.MathUtils.clamp(runtime.introClock / 24, 0, 1)
      camera.position.copy(introPath.getPoint(p))
      camera.lookAt(introLook(p, tmp.current))
    } else if (s.phase === 'stairs') {
      if (visible) tick(dt, still, false) // The store owns the 2.8-second transition and floor change.
      const flight = s.transition
      if (flight) {
        const p = THREE.MathUtils.clamp(flight.progress, 0, 1)
        // The open stairwell is represented by visible steps/rails, not a teleport.
        camera.position.set(THREE.MathUtils.lerp(flight.start.x, flight.end.x, p),
          THREE.MathUtils.lerp(floorY(flight.from), floorY(flight.to), p) + EYE + Math.sin(p * Math.PI * 13) * .025,
          THREE.MathUtils.lerp(flight.start.z, flight.end.z, p))
        const heading = side.current.set(flight.end.x - flight.start.x, 0, flight.end.z - flight.start.z).normalize()
        const arrival = direction.current.set(flight.end.x + heading.x * 2, floorY(flight.to) + EYE, flight.end.z + heading.z * 2)
        // Following the flight keeps the height change obvious while the gaze reaches the landing.
        tmp.current.copy(camera.position).addScaledVector(heading, 4.5)
        tmp.current.y += (floorY(flight.to) - floorY(flight.from)) * .35
        camera.lookAt(tmp.current.lerp(arrival, p * .65))
      }
    } else if (s.phase === 'playing') {
      if (lastPhase.current === 'intro') {
        camera.position.set(runtime.player.x, floorY(s.floor) + EYE, runtime.player.z)
        camera.lookAt(ANCHORS.entrance.x, floorY(s.floor) + EYE, ANCHORS.entrance.z)
      } else if (lastPhase.current === 'stairs') {
        // Use the ACTUAL post-transition player position, already 1.2m beyond the landing.
        camera.position.set(runtime.player.x, floorY(s.floor) + EYE, runtime.player.z)
        const arrival = safeArrival(s.floor, runtime.player)
        camera.lookAt(arrival.x, floorY(s.floor) + EYE, arrival.z)
        keys.current.clear()
      }
      audio.setSurface(zoneAt(s.floor))
      if (s.panel && !lastPanel.current) audio.puzzle()
      if (clock.elapsedTime - audioAt.current > .12) {
        audioAt.current = clock.elapsedTime
        const dx = runtime.entity.x - runtime.player.x, dz = runtime.entity.z - runtime.player.z
        const vertical = (floorY(runtime.entityFloor) - floorY(s.floor)) * 2
        const distance = Math.hypot(dx, dz, vertical)
        audio.proximity(distance, (-runtime.direction.z * dx + runtime.direction.x * dz) / Math.max(2, distance))
      }
      camera.getWorldDirection(direction.current)
      direction.current.y = 0; direction.current.normalize()
      runtime.direction = { x: direction.current.x, z: direction.current.z }
      side.current.crossVectors(direction.current, camera.up).normalize()
      const forward = +(keys.current.has('KeyW') || keys.current.has('ArrowUp')) - +(keys.current.has('KeyS') || keys.current.has('ArrowDown'))
      const strafe = +keys.current.has('KeyD') - +keys.current.has('KeyA')
      tmp.current.copy(direction.current).multiplyScalar(forward).addScaledVector(side.current, strafe).normalize()
      // Phone UI and puzzle panels immobilize the player, NEVER the threat or hint clock.
      if (visible) tick(dt, locked.current && !s.panel && !runtime.phoneUi ? { x: tmp.current.x, z: tmp.current.z } : still,
        keys.current.has('ShiftLeft') || keys.current.has('ShiftRight'))
      const bob = runtime.moving && locked.current ? Math.sin(runtime.time * (keys.current.has('ShiftLeft') ? 16 : 10)) * .023 : 0
      camera.position.set(runtime.player.x, floorY(s.floor) + EYE + bob, runtime.player.z)
      // Two authored balcony glances; store movement/grace decides where the actual entity is.
      // They never translate it, force phone-open, or run with a moving player.
      const first = s.floor === 2 && !s.power && runtime.entityFloor === 3 && !runtime.triggers.has('scene-first-balcony')
      const second = s.floor === 3 && s.power && !s.badge && runtime.entityFloor === 3 && !runtime.triggers.has('scene-upper-approach')
      const kind = first ? 'scene-first-balcony' : second ? 'scene-upper-approach' : ''
      if (kind && s.phone && !runtime.moving && visible) {
        runtime.triggers.add(kind); beat.current = { kind, started: runtime.time, cancelled: false }
      }
      if (beat.current.kind && (s.phone && !runtime.moving && !beat.current.cancelled && runtime.time - beat.current.started < 3)) {
        tmp.current.set(runtime.entity.x, floorY(runtime.entityFloor) + 2.3, runtime.entity.z)
        lookMatrix.current.lookAt(camera.position, tmp.current, camera.up)
        lookQuaternion.current.setFromRotationMatrix(lookMatrix.current)
        camera.quaternion.slerp(lookQuaternion.current, Math.min(1, dt * 1.6))
      }
    } else if (s.phase === 'scare') {
      if (lastPhase.current !== 'scare') scareOrigin.current.copy(camera.position)
      if (visible) tick(dt, still, false) // Store owns the 1.65-second contact cinematic.
      const progress = Math.min(1, runtime.scareClock / 1.65)
      const lunge = Math.max(0, (progress - .42) / .58) ** 2
      const offset = tmp.current.set(scareOrigin.current.x - runtime.entity.x, 0, scareOrigin.current.z - runtime.entity.z).normalize()
      if (offset.lengthSq() < .01) offset.set(0, 0, 1)
      camera.position.lerpVectors(scareOrigin.current, side.current.set(runtime.entity.x + offset.x * .48, floorY(runtime.entityFloor) + 1.92, runtime.entity.z + offset.z * .48), lunge)
      camera.lookAt(runtime.entity.x, floorY(runtime.entityFloor) + 2.55, runtime.entity.z)
      camera.rotateZ(Math.sin(progress * 13) * .012 * progress - progress * .07)
    } else if (s.phase === 'escaping') {
      if (lastPhase.current !== 'escaping') escapeOrigin.current.copy(camera.position)
      if (visible) tick(dt, still, false) // Store owns all five seconds and the escaped phase.
      const p = THREE.MathUtils.clamp(runtime.escapeClock / 5, 0, 1)
      const approach = THREE.MathUtils.smoothstep(p, 0, .88)
      camera.position.lerpVectors(escapeOrigin.current, side.current.set(0, floorY(2) + EYE, 23.9), approach)
      camera.lookAt(0, floorY(2) + EYE + .25, 28)
      if (escapeCurtain.current) {
        escapeCurtain.current.visible = p > .3
        escapeCurtain.current.material.opacity = THREE.MathUtils.smoothstep(p, .3, .55)
      }
    } else if (s.phase === 'caught') camera.lookAt(runtime.entity.x, floorY(runtime.entityFloor) + 2.35, runtime.entity.z)
    if (s.phase !== 'escaping' && escapeCurtain.current) escapeCurtain.current.visible = false
    lastPhase.current = s.phase
    lastPanel.current = s.panel
    camera.getWorldDirection(direction.current)
    flashlight.current.position.copy(camera.position).addScaledVector(direction.current, .15)
    target.current.position.copy(camera.position).addScaledVector(direction.current, 10)
    target.current.updateMatrixWorld()
    flashlight.current.target = target.current
    const phoneLight = s.phone && s.flashlight
    flashlight.current.intensity = phoneLight ? s.graphics === 'low' ? 11 : 19 : 0
    flashlight.current.angle = phoneLight ? .55 : .4
    flashlight.current.distance = phoneLight ? s.graphics === 'low' ? 17 : 23 : 0
    gl.domElement.style.cursor = locked.current ? 'none' : 'default'
  })
  return <>
    <PointerLockControls ref={controls} makeDefault pointerSpeed={0.65} selector="#manual-lock-only"
      onLock={() => { runtime.phoneUi = false; locked.current = true; onLocked(true) }}
      onUnlock={() => {
        locked.current = false; onLocked(false); keys.current.clear()
        const suppressed = suppressUnlock.current; suppressUnlock.current = false
        const s = useGame.getState()
        if (!suppressed && s.phase === 'playing' && !s.panel && !runtime.phoneUi) s.pause()
      }} />
    <spotLight ref={flashlight} color="#fff6dd" penumbra={.82} decay={2} intensity={0} castShadow={false} />
    <primitive object={target.current} />
  </>
}

export const Scene = memo(function Scene({ onLocked, onReady }: { onLocked: (value: boolean) => void; onReady: () => void }) {
  const [contextLost, setContextLost] = useState(false)
  const [dpr, setDpr] = useState(1)
  return <>
    <Canvas camera={{ fov: 68, near: 0.08, far: 120 }} dpr={dpr} gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.42
        gl.shadowMap.enabled = false
        gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); useGame.getState().pause() })
        onReady()
      }}>
      <color attach="background" args={['#1d2830']} />
      <fog attach="fog" args={['#1d2830', 30, 78]} />
      <ambientLight intensity={.72} color="#f5e9d8" />
      <hemisphereLight args={['#f2f5f5', '#766e68', 1.15]} />
      <RenderBudget setDpr={setDpr} />
      <Suspense fallback={null}><Library /><Entity /><PoolQuality /></Suspense>
      <Controller onLocked={onLocked} />
    </Canvas>
    {contextLost && <div className="fatal-screen"><h2>The lights went out.</h2><p>Your graphics context was interrupted. Reload to restore it.</p><button onClick={() => location.reload()}>Reload game</button></div>}
  </>
})
