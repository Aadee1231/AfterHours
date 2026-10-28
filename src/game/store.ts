import { create } from 'zustand'
import { audio } from './audio'
import { ANCHORS, ENTITY_SPAWN, SPAWN, createRun, distance, findPath, lineClear, moveWithCollision, travelClear, zoneAt, type Point, type Run, type Zone } from './world'

export type Phase = 'title' | 'intro' | 'playing' | 'paused' | 'scare' | 'caught' | 'escaped'
export type PhoneTab = 'notes' | 'map' | 'objectives'
export type Panel = 'catalogue' | 'breaker' | 'cabinet'
export type Prompt = number | keyof typeof ANCHORS | null
const storage = {
  get(key: string, fallback = 0) { try { const v = localStorage.getItem(`after-hours:${key}`); return v !== null && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback } catch { return fallback } },
  set(key: string, value: number) { try { localStorage.setItem(`after-hours:${key}`, String(value)) } catch { /* Storage is optional. */ } },
}
export const runtime = {
  player: { ...SPAWN } as Point, entity: { ...ENTITY_SPAWN } as Point, direction: { x: 0, z: -1 } as Point,
  path: [] as Point[], pathAt: 0, time: 0, stepAt: 0, entityStepAt: 0, publishAt: 0, moving: false,
  scareAt: -10, resetId: 0, triggers: new Set<string>(), phoneSeconds: 0, contact: 0, scareClock: 0,
  phoneUi: false, lock: null as (() => void) | null, unlock: null as (() => void) | null,
}
export interface GameState {
  phase: Phase; phone: boolean; tab: PhoneTab; flashlight: boolean; clues: number[]; selectedNote: number
  elapsed: number; attempts: number; best: number; threat: number; prompt: Prompt; keypad: boolean
  code: string; codeError: string; notice: string; noticeUntil: number; notification: boolean
  flickerUntil: number; climaxUntil: number; muted: boolean; volume: number; capture: boolean; help: boolean
  run: Run; onboarding: number; phoneTaught: boolean; graceUntil: number; discovered: Zone[]
  panel: Panel | null; panelError: string; catalogueSolved: boolean; scheduleRead: boolean; breakerStep: number
  power: boolean; exposure: number; rubbingRead: boolean; cabinetSolved: boolean; loopBroken: boolean
  hint: boolean; reducedFlashing: boolean; difficulty: 'standard' | 'story'; loopUntil: number
  start: (seed?: number) => void; enter: () => void; pause: () => void; resume: () => void
  togglePhone: () => void; interact: () => void; closeKeypad: () => void; closePanel: () => void
  choose: (value: number) => void; digit: (key: string) => void; submit: () => void
  setVolume: (volume: number) => void; toggleMute: () => void; toggleFlashing: () => void
}
export function announce(notice: string, seconds = 7) { useGame.setState({ notice, noticeUntil: runtime.time + seconds }) }
export function objective(s: GameState): [string, string] {
  if (s.onboarding === 0) return ['Check your laptop.', 'WASD move · mouse look · E inspect. The clock is on your desk.']
  if (s.onboarding === 1) return ['Try the North Tower stairwell.', 'The red STAIR 07 door beside the west carrels.']
  if (s.onboarding === 2) return ['Inspect the checkout receipt.', 'The desk beneath the amber lamp. Q opens the phone; E saves a record.']
  if (!s.phoneTaught) return ['Learn its rule.', 'Q: open the phone and listen. Q again: close it to stop the figure.']
  if (!s.catalogueSolved) return ['Find Borrowed Time.', 'Central stacks: consult the catalogue in the west cross-aisle.']
  if (!s.clues.includes(1)) return ['Retrieve the matching folio.', 'The catalogue unlocked a drawer at the west study desk.']
  if (!s.scheduleRead) return ['Find the maintenance schedule.', 'South Tower, east wall: the service notice gives the restart order.']
  if (!s.power) return ['Restore the South Tower circuits.', 'Use the breaker cabinet. Follow the service order, not left to right.']
  if (!s.clues.includes(2)) return ['Read the load report.', 'The maintenance desk now has power. Count green circuits only.']
  if (!s.rubbingRead) return ['Recover the erased room number.', 'Central stacks, east wall. Aim the open phone light at the nameplate.']
  if (!s.cabinetSolved) return ['Open the room archive.', 'South Tower, west side. Match the room number you revealed.']
  if (!s.clues.includes(3)) return ['Take the room archive record.', 'The correct drawer is open. Read what your own handwriting says.']
  if (!s.loopBroken) return ['Return to the first stair door.', 'North Tower. Four records make this return different.']
  return ['Reach the South Tower access panel.', 'Reconstruct four digits, I–IV, from your records. Break the loop.']
}
export function act(s: GameState) { return s.loopBroken ? 'III — GET OUT' : s.phoneTaught ? 'II — THE LIBRARY CHANGES' : 'I — SOMETHING’S WRONG' }
export function promptText(s: GameState) {
  if (typeof s.prompt === 'number') return s.phone ? `Read ${s.run.records[s.prompt].title}` : 'Q — open phone to read'
  return ({ laptop: 'Inspect laptop & clock', stair: s.clues.length === 4 ? 'Return to the first stair door' : 'Try the North Tower stairs', directory: 'Read floor directory', catalogue: 'Consult catalogue / folio index', schedule: 'Read service order', breaker: 'Operate circuit cabinet', rubbing: s.rubbingRead ? 'Read recovered nameplate' : 'Inspect erased nameplate / phone light required', cabinet: 'Open room archive', return: 'Read evacuation notice', exit: 'Use South Tower access panel' } as Record<string, string>)[s.prompt ?? ''] ?? ''
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'title', phone: false, tab: 'notes', flashlight: true, clues: [], selectedNote: 0,
  elapsed: 0, attempts: storage.get('attempts'), best: storage.get('best-v2'), threat: 0, prompt: null,
  keypad: false, code: '', codeError: '', notice: '', noticeUntil: 0, notification: false, flickerUntil: 0, climaxUntil: 0,
  muted: storage.get('muted') === 1, volume: Math.max(0, Math.min(1, storage.get('volume', 65) / 100)), capture: false, help: false,
  run: createRun(213), onboarding: 0, phoneTaught: false, graceUntil: Infinity, discovered: ['north'], panel: null, panelError: '',
  catalogueSolved: false, scheduleRead: false, breakerStep: 0, power: false, exposure: 0, rubbingRead: false,
  cabinetSolved: false, loopBroken: false, hint: false, reducedFlashing: storage.get('reduced-flashing') === 1, difficulty: 'standard', loopUntil: 0,
  start: seed => {
    audio.unlock(); runtime.unlock?.()
    Object.assign(runtime, { player: { ...SPAWN }, entity: { ...ENTITY_SPAWN }, direction: { x: 0, z: -1 }, path: [], pathAt: 0, time: 0, stepAt: 0, publishAt: 0, moving: false, scareAt: -10, resetId: runtime.resetId + 1, triggers: new Set<string>(), phoneSeconds: 0, phoneUi: false, contact: 0, scareClock: 0 })
    const attempts = get().attempts + 1
    storage.set('attempts', attempts)
    set({ phase: 'intro', run: createRun(seed ?? Math.floor(Math.random() * 0xffffffff)), phone: false, tab: 'notes', flashlight: true, clues: [], selectedNote: 0, elapsed: 0, attempts, threat: 0, prompt: null, keypad: false, code: '', codeError: '', notice: '', noticeUntil: 0, notification: false, flickerUntil: 0, climaxUntil: 0, help: false, onboarding: 0, phoneTaught: false, graceUntil: Infinity, discovered: ['north'], panel: null, panelError: '', catalogueSolved: false, scheduleRead: false, breakerStep: 0, power: false, exposure: 0, rubbingRead: false, cabinetSolved: false, loopBroken: false, hint: false, loopUntil: 0, capture: false })
  },
  enter: () => { if (get().phase !== 'intro') return; set({ phase: 'playing' }); announce('02:13. Your laptop is still on. WASD to move, mouse to look, E to inspect.', 12); audio.ambience(true) },
  pause: () => { if (get().phase === 'playing') { set({ phase: 'paused', help: false, panel: null, keypad: false, phone: false }); runtime.phoneUi = false; runtime.unlock?.(); audio.ambience(false) } },
  resume: () => { if (get().phase !== 'paused') return; set({ phase: 'playing', help: false }); audio.unlock(); audio.ambience(true) },
  togglePhone: () => {
    const s = get(); if (s.phase !== 'playing' || s.keypad) return
    const phone = !s.phone
    if (!phone) runtime.phoneUi = false
    set({ phone, panel: null }); audio.phone(phone)
    if (!phone && s.clues.length && runtime.phoneSeconds >= 3 && !s.phoneTaught) { set({ phoneTaught: true }); announce('It stopped. Keep that rule. The catalogue in the west stacks may explain the records.', 10); runtime.triggers.add('taught') }
  },
  interact: () => {
    const s = get(); if (s.phase !== 'playing' || s.keypad || s.panel || s.prompt === null) return
    const p = s.prompt
    if (typeof p === 'number') {
      if (s.clues.includes(p) || !recordAvailable(s, p)) return
      if (!s.phone) { announce('Open the phone [Q] for light, then press [E].'); return }
      set({ clues: [...s.clues, p], selectedNote: p, tab: 'notes', ...(p === 0 ? { onboarding: 3, graceUntil: runtime.time + 55 } : {}) })
      audio.clue(); announce(`Record ${['I', 'II', 'III', 'IV'][p]} saved — ${s.clues.length + 1}/4. Read and interpret it in NOTES.`, 9)
      if (p === 0) { runtime.phoneSeconds = 0; runtime.entity = { x: 0, z: -15.5 }; runtime.triggers.add('first-clue'); set({ flickerUntil: runtime.time + 3 }); audio.flicker() }
      return
    }
    audio.click()
    if (p === 'laptop') { if (s.onboarding === 0) set({ onboarding: 1 }); announce('Both clocks say 02:13. No signal. Your bag is here, but everyone else is gone. Try the west stair door.', 11) }
    if (p === 'stair') {
      if (s.onboarding === 0) { announce('Your laptop is still running. Check it before you leave.'); return }
      if (s.clues.length === 4 && s.power && s.rubbingRead) {
        if (!s.loopBroken) { set({ loopBroken: true, loopUntil: runtime.time + 1, climaxUntil: runtime.time + 5, notification: true }); runtime.entity = { x: -1, z: -26 }; runtime.path = []; runtime.pathAt = 0; runtime.triggers.add('finale'); announce('The first door remembers. The South Tower panel is awake. This time, do not come back.', 12); audio.climax() }
        else announce('The loop is broken. South Tower. The last door, not this one.')
      } else { runtime.player = { ...SPAWN }; runtime.resetId++; runtime.path = []; set({ onboarding: Math.max(2, s.onboarding), loopUntil: runtime.time + 1.4 }); announce('Seven steps down. Your own desk again. The checkout receipt wasn’t there before. Find the amber desk lamp.', 12); audio.book() }
    }
    if (p === 'directory') announce('NORTH / 7200s: study carrels. CENTRAL: M–PR bookstacks. SOUTH / 7400s: maintenance, room archive, final access. TAB opens your phone map.', 15)
    if (p === 'return') announce('EVACUATION NOTICE: stairs return all readers to Floor 7. Reconcile four records at the first stair door, then use the South Tower access panel.', 13)
    if (p === 'schedule') { set({ scheduleRead: true }); announce('SERVICE ORDER SAVED: AIR → LAMPS → CATALOGUE → ACCESS. Switch labels matter, not their positions.', 13) }
    if (p === 'rubbing') { if (!s.power) announce('Emergency ink reacts to powered phone light. Restore the South Tower circuits first.'); else if (!s.rubbingRead) announce('Hold phone light on the erased nameplate. Look straight at it; the rubbing saves in short glances.'); else announce(`Recovered room: 740${s.run.roomDigit}. Find its drawer in the South Tower room archive.`, 10) }
    if (p === 'catalogue' || p === 'breaker' || p === 'cabinet') {
      if (!s.phoneTaught) { announce('First learn the phone rule: open it for three seconds, then close it. You are safe while learning.'); return }
      if (p === 'cabinet' && (!s.power || !s.rubbingRead)) { announce('Archive interlock: restore power and recover the erased room number in the east stacks.'); return }
      set({ panel: p, phone: true, panelError: '', keypad: false }); audio.phone(true); runtime.unlock?.()
    }
    if (p === 'exit') {
      if (!s.loopBroken) { announce(s.clues.length === 4 ? 'The access panel repeats: RETURN TO THE FIRST STAIR DOOR.' : 'The same floor waits beyond this door. Four records, power, and the first stair door must break the loop.'); return }
      set({ keypad: true, phone: false, code: '', codeError: '' }); runtime.unlock?.()
    }
  },
  choose: value => {
    const s = get(); if (s.phase !== 'playing' || !s.panel) return
    audio.click()
    if (s.panel === 'catalogue') {
      if (value !== s.run.callDigit) { set({ panelError: 'Wrong folio. Find Borrowed Time in the catalogue. Match its full call number.' }); return }
      set({ catalogueSolved: true, panel: null, phone: false }); announce('The Borrowed Time folio drawer unlocks. Its location is marked on your rough map.', 10); audio.clue()
    }
    if (s.panel === 'breaker') {
      if (!s.scheduleRead) { set({ panelError: 'Read the service order on the South Tower noticeboard first.' }); return }
      if (value !== s.breakerStep) { set({ breakerStep: 0, panelError: 'Load sequence tripped. Progress reset. AIR → LAMPS → CATALOGUE → ACCESS.' }); audio.book(); return }
      if (s.breakerStep === 3) { set({ power: true, breakerStep: 4, panel: null, phone: false, flickerUntil: runtime.time + 2 }); runtime.triggers.add('power'); announce('Power restored. Read the maintenance load report. A nameplate in the east stacks is reacting to your phone.', 12); audio.flicker() }
      else set({ breakerStep: s.breakerStep + 1, panelError: '' })
    }
    if (s.panel === 'cabinet') {
      if (value !== s.run.roomDigit) { set({ panelError: 'That room has no file. Check the nameplate recovered in the east stacks.' }); return }
      set({ cabinetSolved: true, panel: null, phone: false }); announce('Your room archive is open. The record inside is in your handwriting.', 9); audio.clue()
    }
  },
  closePanel: () => set({ panel: null, phone: false, panelError: '' }), closeKeypad: () => set({ keypad: false, code: '', codeError: '' }),
  digit: key => { if (!get().keypad || get().phase !== 'playing') return; audio.click(); if (key === 'Backspace' || key === 'CLEAR') set({ code: key === 'CLEAR' ? '' : get().code.slice(0, -1), codeError: '' }); else if (/^\d$/.test(key) && get().code.length < 4) set({ code: get().code + key, codeError: '' }) },
  submit: () => {
    const s = get(); if (s.phase !== 'playing' || !s.keypad) return
    if (s.clues.length !== 4 || !s.power || !s.loopBroken || !s.cabinetSolved) { set({ codeError: 'The loop is still intact. Complete the four records and return to the first stair door.', code: '' }); return }
    if (s.code !== s.run.code) { set({ codeError: 'ACCESS DENIED — interpret records in order I to IV.', code: '' }); audio.click(); return }
    const elapsed = runtime.time, best = s.best === 0 ? elapsed : Math.min(elapsed, s.best)
    storage.set('best-v2', best); set({ phase: 'escaped', keypad: false, phone: false, elapsed, best, threat: 0 }); runtime.unlock?.(); audio.ambience(false); audio.escaped()
  },
  setVolume: volume => { const value = Math.max(0, Math.min(1, volume)); set({ volume: value }); storage.set('volume', value * 100); audio.configure(value, get().muted) },
  toggleMute: () => { const muted = !get().muted; set({ muted }); storage.set('muted', +muted); audio.configure(get().volume, muted) },
  toggleFlashing: () => { const reducedFlashing = !get().reducedFlashing; set({ reducedFlashing }); storage.set('reduced-flashing', +reducedFlashing) },
}))
export function recordAvailable(s: GameState, id: number) { return id === 0 ? s.onboarding >= 2 : id === 1 ? s.catalogueSolved : id === 2 ? s.power : s.cabinetSolved }

export function tick(dt: number, input: Point, sprint: boolean) {
  if (!Number.isFinite(dt) || dt <= 0) return
  let remaining = Math.min(dt, 1)
  while (remaining > .000001) {
    const step = Math.min(remaining, .05), phase = useGame.getState().phase
    if (phase === 'scare') { runtime.scareClock += step; if (runtime.scareClock >= 1.65) useGame.setState({ phase: 'caught' }) }
    else if (phase === 'playing') tickStep(step, input, sprint)
    else break
    remaining -= step
  }
}
function tickStep(dt: number, input: Point, sprint: boolean) {
  const s = useGame.getState(); runtime.time += dt
  runtime.moving = !s.keypad && !s.panel && Math.hypot(input.x, input.z) > .01
  if (runtime.moving) { const speed = sprint ? 3.75 : 2.35; runtime.player = moveWithCollision(runtime.player, input.x * speed * dt, input.z * speed * dt); if (runtime.time > runtime.stepAt) { audio.step(); runtime.stepAt = runtime.time + (sprint ? .31 : .48) } }
  if (s.phone) runtime.phoneSeconds += dt
  if (s.phone && s.clues.length && !s.keypad) {
    if (runtime.time > runtime.pathAt || runtime.path.length === 0) { runtime.path = findPath(runtime.entity, runtime.player); runtime.pathAt = runtime.time + .8 }
    const target = travelClear(runtime.entity, runtime.player) ? runtime.player : runtime.path[0], safeLesson = !s.phoneTaught || runtime.time < s.graceUntil
    if (target && !(safeLesson && distance(runtime.entity, runtime.player) < 5)) {
      const d = distance(runtime.entity, target), speed = (s.difficulty === 'story' ? .85 : 1.3) + s.clues.length * .10 + (s.loopBroken ? .25 : 0), travel = Math.min(d, speed * dt)
      if (d > .001) runtime.entity = moveWithCollision(runtime.entity, (target.x - runtime.entity.x) / d * travel, (target.z - runtime.entity.z) / d * travel, .32)
      if (d < .24) runtime.path.shift()
    }
    const d = distance(runtime.entity, runtime.player)
    if (runtime.time > runtime.entityStepAt && d < 24) { const side = (runtime.entity.x - runtime.player.x) * -runtime.direction.z + (runtime.entity.z - runtime.player.z) * runtime.direction.x; audio.step(true, Math.max(-1, Math.min(1, side / 8))); runtime.entityStepAt = runtime.time + (d < 8 ? .6 : .85) }
  }
  const d = distance(runtime.entity, runtime.player), threat = s.clues.length ? Math.max(0, 1 - d / 16) : 0
  runtime.contact = d < 1.05 && s.phoneTaught && runtime.time > s.graceUntil && !s.keypad && lineClear(runtime.entity, runtime.player) ? runtime.contact + dt : 0
  if (runtime.contact > .9) { useGame.setState({ phase: 'scare', phone: false, panel: null, threat: 1, elapsed: runtime.time, prompt: null }); runtime.scareClock = 0; runtime.unlock?.(); audio.ambience(false); audio.caught(); return }
  const rub = ANCHORS.rubbing, delta = { x: rub.x - runtime.player.x, z: rub.z - runtime.player.z }
  if (s.power && !s.rubbingRead && s.phone && s.flashlight && !s.panel && distance(runtime.player, rub) < 3 && lineClear(runtime.player, rub) && (delta.x * runtime.direction.x + delta.z * runtime.direction.z) / Math.max(.01, distance(runtime.player, rub)) > .75) {
    const exposure = Math.min(6, s.exposure + dt)
    useGame.setState({ exposure, ...(exposure >= 6 ? { rubbingRead: true } : {}) })
    if (exposure >= 6) { audio.clue(); announce(`Emergency ink: ROOM 740${s.run.roomDigit}. Saved to your objective log. Find that room's archive drawer in the South Tower.`, 12) }
  }
  if (s.clues.length && zoneAt(runtime.player) === 'stacks' && runtime.time > runtime.scareAt + 12 && !runtime.triggers.has('book')) { runtime.triggers.add('book'); runtime.scareAt = runtime.time; audio.book(); announce('A book falls at the far end of the aisle. You did not touch it.') }
  if (s.power && zoneAt(runtime.player) === 'north' && !runtime.triggers.has('chair')) { runtime.triggers.add('chair'); runtime.scareAt = runtime.time; audio.book(); announce('Your chair has turned to face the door. It was facing the desk.') }
  if (s.clues.length >= 2 && runtime.time > runtime.scareAt + 14 && !runtime.triggers.has('notification')) { runtime.triggers.add('notification'); runtime.scareAt = runtime.time; useGame.setState({ notification: true }); audio.notification(); announce('NEW MESSAGE / your own number. DON’T TURN AROUND.') }
  if (s.loopBroken && runtime.player.z > 23 && !runtime.triggers.has('climax')) { runtime.triggers.add('climax'); useGame.setState({ climaxUntil: runtime.time + 8, flickerUntil: runtime.time + 4 }); audio.climax(); announce('Cold air under the door. A clock that is trying to move. The South panel is ahead.', 9) }
  if (s.phone && s.phoneTaught) audio.danger(threat)
  if (runtime.time < runtime.publishAt) return
  runtime.publishAt = runtime.time + .1
  const zone = zoneAt(runtime.player), discovered = s.discovered.includes(zone) ? s.discovered : [...s.discovered, zone]
  let prompt: Prompt = null, nearest = 3.1
  for (const [id, anchor] of Object.entries(ANCHORS)) {
    if ((id === 'cabinet' && s.cabinetSolved) || (id === 'breaker' && s.power) || (id === 'catalogue' && s.catalogueSolved) || (id === 'laptop' && s.onboarding > 0)) continue
    const dist = distance(runtime.player, anchor)
    if (dist < nearest && lineClear(runtime.player, anchor)) { nearest = dist; prompt = id as keyof typeof ANCHORS }
  }
  s.run.positions.forEach((p, id) => { const dist = distance(runtime.player, p); if (!s.clues.includes(id) && recordAvailable(s, id) && dist <= Math.min(2.8, nearest) && lineClear(runtime.player, p)) { nearest = dist; prompt = id } })
  useGame.setState({ elapsed: runtime.time, threat, prompt, discovered })
}
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` }
