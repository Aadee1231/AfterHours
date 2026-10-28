import { create } from 'zustand'
import { audio } from './audio'
import { CLUES, ENTITY_SPAWN, ESCAPE_CODE, EXIT, SPAWN, distance, findPath, lineClear, moveWithCollision, travelClear, type Point } from './world'

export type Phase = 'title' | 'intro' | 'playing' | 'paused' | 'caught' | 'escaped'
export type PhoneTab = 'notes' | 'map'
const storage = {
  get(key: string, fallback = 0) {
    try {
      const saved = localStorage.getItem(`after-hours:${key}`)
      return saved !== null && saved.trim() !== '' && Number.isFinite(Number(saved)) ? Number(saved) : fallback
    } catch { return fallback }
  },
  set(key: string, value: number) { try { localStorage.setItem(`after-hours:${key}`, String(value)) } catch { /* Private browsing may disable storage. */ } },
}
export const runtime = {
  player: { ...SPAWN } as Point,
  entity: { ...ENTITY_SPAWN } as Point,
  direction: { x: -0.25, z: -0.97 } as Point,
  path: [] as Point[],
  pathAt: 0,
  time: 0,
  stepAt: 0,
  entityStepAt: 0,
  publishAt: 0,
  moving: false,
  clueAt: 0,
  secondClueAt: 0,
  scareAt: -10,
  resetId: 0,
  triggers: new Set<string>(),
  lock: null as (() => void) | null,
  unlock: null as (() => void) | null,
}

interface GameState {
  phase: Phase
  phone: boolean
  tab: PhoneTab
  flashlight: boolean
  clues: number[]
  selectedNote: number
  elapsed: number
  attempts: number
  best: number
  threat: number
  prompt: number | 'exit' | null
  keypad: boolean
  code: string
  codeError: string
  notice: string
  noticeUntil: number
  notification: boolean
  flickerUntil: number
  climaxUntil: number
  muted: boolean
  volume: number
  capture: boolean
  help: boolean
  start: () => void
  enter: () => void
  pause: () => void
  resume: () => void
  togglePhone: () => void
  interact: () => void
  closeKeypad: () => void
  digit: (key: string) => void
  submit: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

function announce(message: string, seconds = 5) { useGame.setState({ notice: message, noticeUntil: runtime.time + seconds }) }

export const useGame = create<GameState>((set, get) => ({
  phase: 'title', phone: false, tab: 'notes', flashlight: true, clues: [], selectedNote: 0,
  elapsed: 0, attempts: storage.get('attempts'), best: storage.get('best'), threat: 0, prompt: null,
  keypad: false, code: '', codeError: '', notice: '', noticeUntil: 0,
  notification: false, flickerUntil: 0, climaxUntil: 0,
  muted: storage.get('muted') === 1, volume: storage.get('volume', 65) / 100, capture: false, help: false,
  start: () => {
    audio.unlock()
    runtime.unlock?.()
    Object.assign(runtime, { player: { ...SPAWN }, entity: { ...ENTITY_SPAWN }, direction: { x: -0.25, z: -0.97 }, path: [], pathAt: 0, time: 0, stepAt: 0, entityStepAt: 0, publishAt: 0, moving: false, clueAt: 0, secondClueAt: 0, scareAt: -10, resetId: runtime.resetId + 1, triggers: new Set<string>() })
    const attempts = get().attempts + 1
    storage.set('attempts', attempts)
    set({ phase: 'intro', phone: false, tab: 'notes', flashlight: true, clues: [], selectedNote: 0, elapsed: 0, attempts, threat: 0, prompt: null, keypad: false, code: '', codeError: '', notice: '', noticeUntil: 0, notification: false, flickerUntil: 0, climaxUntil: 0, help: false })
  },
  enter: () => { set({ phase: 'playing' }); announce('Find four records. The emergency stairwell is on the north wall.', 9); audio.ambience(true) },
  pause: () => { if (get().phase === 'playing') { set({ phase: 'paused', help: false }); runtime.unlock?.(); audio.ambience(false) } },
  resume: () => { set({ phase: 'playing', help: false }); audio.unlock(); audio.ambience(true) },
  togglePhone: () => {
    if (get().phase !== 'playing' || get().keypad) return
    const phone = !get().phone
    set({ phone }); audio.phone(phone)
    if (phone && !runtime.triggers.has('phone')) { runtime.triggers.add('phone'); announce('PHONE OPEN: it can move. Close your phone to make it stop.', 7) }
  },
  interact: () => {
    const s = get()
    if (s.phase !== 'playing' || s.keypad) return
    if (s.prompt === 'exit') { set({ keypad: true, phone: false, code: '', codeError: '' }); runtime.unlock?.(); audio.click(); return }
    if (s.prompt === null || s.clues.includes(s.prompt)) return
    if (!s.phone) { announce('Too dark to read. Open your phone [Q], then press [E].'); return }
    const clue = CLUES[s.prompt]
    set({ clues: [...s.clues, clue.id], selectedNote: clue.id, tab: 'notes' })
    audio.clue(); announce(`Record ${['I', 'II', 'III', 'IV'][clue.id]} saved. ${s.clues.length + 1}/4 collected. Read the digit in NOTES.`, 7)
    if (s.clues.length === 0) { runtime.clueAt = runtime.time; runtime.scareAt = runtime.time; set({ flickerUntil: runtime.time + 4 }); audio.flicker(); runtime.triggers.add('first-clue') }
    if (s.clues.length === 1) runtime.secondClueAt = runtime.time
  },
  closeKeypad: () => { set({ keypad: false, code: '', codeError: '' }) },
  digit: (key: string) => {
    if (!get().keypad || get().phase !== 'playing') return
    audio.click()
    if (key === 'Backspace' || key === 'CLEAR') set({ code: key === 'CLEAR' ? '' : get().code.slice(0, -1), codeError: '' })
    else if (/^\d$/.test(key) && get().code.length < 4) set({ code: get().code + key, codeError: '' })
  },
  submit: () => {
    const s = get()
    if (s.phase !== 'playing' || !s.keypad) return
    if (s.clues.length !== 4) { set({ codeError: 'Four records required. Find the missing clues.', code: '' }); return }
    if (s.code !== ESCAPE_CODE) { set({ codeError: 'ACCESS DENIED — use the record order, I to IV.', code: '' }); audio.book(); return }
    const elapsed = runtime.time
    const best = s.best === 0 ? elapsed : Math.min(elapsed, s.best)
    storage.set('best', best)
    set({ phase: 'escaped', keypad: false, phone: false, elapsed, best, threat: 0 })
    runtime.unlock?.(); audio.ambience(false); audio.escaped()
  },
  setVolume: (volume: number) => { const value = Math.max(0, Math.min(1, volume)); set({ volume: value }); storage.set('volume', value * 100); audio.configure(value, get().muted) },
  toggleMute: () => { const muted = !get().muted; set({ muted }); storage.set('muted', +muted); audio.configure(get().volume, muted) },
}))

export function tick(dt: number, input: Point, sprint: boolean) {
  if (!Number.isFinite(dt) || dt <= 0) return
  let remaining = Math.min(dt, 1)
  while (remaining > 0.000001 && useGame.getState().phase === 'playing') {
    const step = Math.min(remaining, 0.05)
    tickStep(step, input, sprint)
    remaining -= step
  }
}

function tickStep(dt: number, input: Point, sprint: boolean) {
  const s = useGame.getState()
  if (s.phase !== 'playing') return
  runtime.time += dt
  runtime.moving = !s.keypad && Math.hypot(input.x, input.z) > 0.01
  if (runtime.moving) {
    const speed = sprint ? 3.75 : 2.35
    runtime.player = moveWithCollision(runtime.player, input.x * speed * dt, input.z * speed * dt)
    if (runtime.time > runtime.stepAt) { audio.step(); runtime.stepAt = runtime.time + (sprint ? 0.31 : 0.48) }
  }
  if (s.phone && !s.keypad) {
    if (runtime.time > runtime.pathAt || runtime.path.length === 0) {
      runtime.path = findPath(runtime.entity, runtime.player)
      runtime.pathAt = runtime.time + 0.7
    }
    const target = travelClear(runtime.entity, runtime.player) ? runtime.player : runtime.path[0]
    if (target) {
      const dist = distance(runtime.entity, target), travel = Math.min(dist, (1.08 + s.clues.length * 0.07) * dt)
      if (dist > 0.001) runtime.entity = moveWithCollision(runtime.entity, (target.x - runtime.entity.x) / dist * travel, (target.z - runtime.entity.z) / dist * travel, 0.32)
      if (dist < 0.24) runtime.path.shift()
    }
    const dist = distance(runtime.entity, runtime.player)
    if (runtime.time > runtime.entityStepAt && dist < 17) {
      const side = (runtime.entity.x - runtime.player.x) * -runtime.direction.z + (runtime.entity.z - runtime.player.z) * runtime.direction.x
      audio.step(true, Math.max(-1, Math.min(1, side / 8)))
      runtime.entityStepAt = runtime.time + 0.72
    }
  }
  const dist = distance(runtime.entity, runtime.player)
  const threat = Math.max(0, 1 - dist / 10)
  if (runtime.time > 8 && dist < 0.94 && !s.keypad && lineClear(runtime.entity, runtime.player)) {
    useGame.setState({ phase: 'caught', phone: false, threat: 1, elapsed: runtime.time, prompt: null })
    runtime.unlock?.(); audio.ambience(false); audio.caught(); return
  }
  if (s.clues.length > 0 && runtime.time > runtime.clueAt + 15 && runtime.time > runtime.scareAt + 7 && !runtime.triggers.has('book')) {
    runtime.triggers.add('book'); runtime.scareAt = runtime.time; audio.book(); announce('Something fell in the stacks.', 4)
  }
  if (s.clues.length >= 2 && runtime.time > runtime.secondClueAt + 4 && runtime.time > runtime.scareAt + 7 && !runtime.triggers.has('notification')) {
    runtime.triggers.add('notification'); runtime.scareAt = runtime.time; useGame.setState({ notification: true }); audio.notification(); announce('NEW MESSAGE / from your own number. Open your phone.', 7)
  }
  if (s.clues.length >= 3 && distance(runtime.player, EXIT) < 6 && runtime.time > runtime.scareAt + 5 && !runtime.triggers.has('climax')) {
    runtime.triggers.add('climax'); runtime.scareAt = runtime.time; useGame.setState({ climaxUntil: runtime.time + 4, flickerUntil: runtime.time + 4 }); audio.climax(); announce('The stairwell. Don’t stop now.', 4)
  }
  if (s.phone && !s.keypad) audio.danger(threat)
  if (runtime.time >= runtime.publishAt) {
    runtime.publishAt = runtime.time + 0.08
    let prompt: GameState['prompt'] = distance(runtime.player, EXIT) < 2.8 ? 'exit' : null
    for (const clue of CLUES) if (!s.clues.includes(clue.id) && distance(runtime.player, clue) < 2.4 && lineClear(runtime.player, clue)) {
      const dx = clue.x - runtime.player.x, dz = clue.z - runtime.player.z
      if (dx * runtime.direction.x + dz * runtime.direction.z > -0.2) prompt = clue.id
    }
    useGame.setState({ elapsed: runtime.time, threat, prompt })
  }
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}
