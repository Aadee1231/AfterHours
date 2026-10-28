import { create } from 'zustand'
import { audio } from './audio'
import { ANCHORS, SPAWN, createRun, distance, findPath, isBlocked, lineClear, moveWithCollision, travelClear, type AnchorId, type Floor, type Point, type Run } from './world'

export type Phase = 'title' | 'intro' | 'playing' | 'stairs' | 'scare' | 'caught' | 'escaping' | 'escaped' | 'paused'
export type PhoneTab = 'notes' | 'map' | 'objectives'
export type Panel = 'power' | 'badge' | 'release'
export type Prompt = AnchorId | null
type Transition = { from: Floor; to: Floor; progress: number; start: Point; end: Point }
const storage = {
  get(key: string, fallback = 0) { try { const v = localStorage.getItem(`after-hours:${key}`); return v !== null && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback } catch { return fallback } },
  set(key: string, value: number) { try { localStorage.setItem(`after-hours:${key}`, String(value)) } catch { /* Persistence is optional. */ } },
}
export const runtime = {
  player: { ...SPAWN } as Point, entity: { x: 7, z: -11.2 } as Point, entityFloor: 3 as Floor,
  direction: { x: 0, z: 1 } as Point, path: [] as Point[], pathAt: 0, time: 0, stepAt: 0, entityStepAt: 0,
  publishAt: 0, moving: false, resetId: 0, triggers: new Set<string>(), phoneSeconds: 0, contact: 0,
  scareClock: 0, introClock: 0, escapeClock: 0, lastProgress: 0, closedUntil: 0, checkpointTime: 0,
  phoneUi: false, lock: null as (() => void) | null, unlock: null as (() => void) | null,
}
export interface GameState {
  phase: Phase; floor: Floor; phone: boolean; tab: PhoneTab; flashlight: boolean; elapsed: number
  attempts: number; best: number; muted: boolean; volume: number; capture: boolean; help: boolean
  threat: number; prompt: Prompt; panel: Panel | null; panelError: string; hint: boolean
  reducedFlashing: boolean; difficulty: 'standard' | 'story'; graphics: 'low' | 'high'
  doorsTried: boolean; directoryRead: boolean; powerNoticeRead: boolean; power: boolean; powerStep: number
  phoneTaught: boolean; graceUntil: number; boardRead: boolean; exposure: number; badge: boolean
  authorized: boolean; releaseStep: number; checkpoint: 0 | 1 | 2; discovered: Floor[]
  notice: string; noticeUntil: number; notification: boolean; flickerUntil: number; climaxUntil: number
  floorOverlayUntil: number; run: Run; transition: Transition | null
  start: (seed?: number) => void; enter: () => void; retry: () => void; pause: () => void; resume: () => void
  togglePhone: () => void; interact: () => void; choose: (value: number) => void; closePanel: () => void
  setVolume: (volume: number) => void; toggleMute: () => void; toggleFlashing: () => void
  setGraphics: (quality: 'low' | 'high') => void
}
const freshProgress = {
  floor: 2 as Floor, phone: false, tab: 'objectives' as PhoneTab, flashlight: true, elapsed: 0, threat: 0,
  prompt: null, panel: null, panelError: '', hint: false, capture: false, help: false,
  doorsTried: false, directoryRead: false, powerNoticeRead: false, power: false, powerStep: 0,
  phoneTaught: false, graceUntil: Infinity, boardRead: false, exposure: 0, badge: false,
  authorized: false, releaseStep: 0, checkpoint: 0 as const, discovered: [2] as Floor[],
  notice: '', noticeUntil: 0, notification: false, flickerUntil: 0, climaxUntil: 0,
  floorOverlayUntil: 0, transition: null,
}
function resetRuntime(time = 0) {
  Object.assign(runtime, { player: { ...SPAWN }, entity: { x: 7, z: -11.2 }, entityFloor: 3,
    direction: { x: 0, z: 1 }, path: [], pathAt: 0, time, stepAt: 0, entityStepAt: 0, publishAt: 0,
    moving: false, resetId: runtime.resetId + 1, triggers: new Set<string>(), phoneSeconds: 0,
    contact: 0, scareClock: 0, introClock: 0, escapeClock: 0, lastProgress: time, closedUntil: time + 2, phoneUi: false })
}
export function announce(notice: string, seconds = 9) { useGame.setState({ notice, noticeUntil: runtime.time + seconds }) }
function progress() { runtime.lastProgress = runtime.time }
function putPhoneAway() { runtime.phoneUi = false; runtime.contact = 0; runtime.closedUntil = runtime.time + 1.3; audio.phone(false) }
function placeEntity(floor: Floor, player: Point, returning = false) {
  const candidates = returning ? [{ x: -18, z: 17 }, { x: -18, z: -17 }, { x: 18, z: 18 }]
    : floor === 3 ? [{ x: 18, z: 18 }, { x: -18, z: 18 }, { x: -18, z: -17 }]
      : floor === 4 ? [{ x: -18, z: 18 }, { x: 18, z: 18 }, { x: -18, z: -17 }]
        : [{ x: -18, z: -17 }, { x: 18, z: 18 }, { x: -18, z: 17 }]
  const safe = candidates.find(p => distance(p, player) >= 16 && !isBlocked(p.x, p.z, .38, floor))
    ?? candidates.filter(p => !isBlocked(p.x, p.z, .38, floor)).sort((a, b) => distance(b, player) - distance(a, player))[0]
  runtime.entity = { ...safe }; runtime.entityFloor = floor; runtime.path = []; runtime.pathAt = 0; runtime.contact = 0
}
function beginStairs(to: Floor, end: Point) {
  const s = useGame.getState()
  putPhoneAway(); runtime.moving = false
  useGame.setState({ phase: 'stairs', phone: false, panel: null, prompt: null, threat: 0,
    transition: { from: s.floor, to, progress: 0, start: { ...runtime.player }, end: { ...end } } })
  runtime.unlock?.(); audio.click()
}

export function currentLandmark(s: GameState): { floor: Floor; point: Point; label: string } {
  const id: AnchorId = !s.doorsTried ? 'entrance' : !s.directoryRead ? 'directory' : !s.powerNoticeRead ? 'powerNotice'
    : !s.power ? 'power' : !s.boardRead ? 'eventBoard' : !s.badge ? 'badge' : !s.authorized ? 'release' : 'entrance'
  const target = ANCHORS[id]
  const names: Record<AnchorId, string> = { entrance: 'MAIN ENTRANCE', directory: 'INFORMATION DESK', powerNotice: 'SERVICE NOTICE', power: 'BACKUP POWER', eventBoard: 'EVENT BOARD', badge: 'BADGE LOAN BOX', release: 'EXIT RELEASE', up2: 'STAIRS TO FLOOR 3', down3: 'STAIRS TO FLOOR 2', up3: 'STAIRS TO FLOOR 4', down4: 'STAIRS TO FLOOR 3' }
  const route: AnchorId = target.floor > s.floor ? s.floor === 2 ? 'up2' : 'up3' : s.floor === 4 ? 'down4' : 'down3'
  return target.floor === s.floor ? { floor: s.floor, point: target, label: names[id] }
    : { floor: s.floor, point: ANCHORS[route], label: names[route] }
}
export function objective(s: GameState): [string, string] {
  if (!s.doorsTried) return ['Try the main entrance.', 'Floor 2 · Main Atrium. The glass entrance doors are ahead of your waking spot.']
  if (!s.directoryRead) return ['Find the information desk.', 'Floor 2 · Main Atrium. The lockdown display says backup power must be restored.']
  if (!s.powerNoticeRead) return ['Read the backup service notice.', 'Floor 2 · West side of the atrium. Learn the safe restart order before using the cabinet.']
  if (!s.power) return ['Restore emergency power.', 'Floor 2 · Backup cabinet beside the service notice. This reopens the upper-floor stairs.']
  if (!s.badge && s.floor === 2) return ['Go to the Floor 3 lounge.', 'Take the white east stair. The override badge was checked in after the last ballroom event.']
  if (!s.boardRead) return ['Reveal tonight’s event venue.', 'Floor 3 · Ballroom corridor. Your phone light reveals the Night Owl entry on the event board.']
  if (!s.badge) return ['Recover the security override badge.', 'Floor 3 · Badge loan box beside the event board. Match the saved event venue.']
  if (!s.authorized && s.floor !== 4) return ['Take the badge to Floor 4.', 'The white west stair leads to the fictional emergency control station.']
  if (!s.authorized) return ['Activate the emergency exit release.', 'Floor 4 · Student organization corridor. Use your badge at the marked control station.']
  if (s.floor !== 2) return ['Return to the Floor 2 entrance.', `MAIN ENTRANCE UNLOCKED. Take the marked stairs down${s.floor === 4 ? ' through Floor 3' : ''}.`]
  return ['Leave through the main entrance.', 'Floor 2 · Main Atrium. The doors are released. Put the phone away and get outside.']
}
export function act(s: GameState) { return s.badge ? 'III · THE LAST ANNOUNCEMENT' : s.power ? 'II · SOMEONE’S STILL HERE' : 'I · THE EMPTY ATRIUM' }
export function hintLevel(s: GameState) { const idle = runtime.time - runtime.lastProgress; return s.hint || idle > 95 ? 2 : idle > 50 || s.difficulty === 'story' ? 1 : 0 }
export function contextualHint(s: GameState) {
  const target = currentLandmark(s), detailed = hintLevel(s) > 1
  if (target.label.startsWith('STAIRS')) return `${target.label}. ${target.point.x > 0 ? 'East / right' : 'West / left'} side of the atrium; look for the large white stair and its destination sign. Press E at the landing.`
  if (!s.doorsTried) return 'The glass doors beneath MAIN ENTRANCE are on the south side. Walk close enough for the E prompt.'
  if (!s.powerNoticeRead && s.directoryRead) return 'Follow the red BACKUP POWER signs to the west wall. Read the notice just south of the cabinet.'
  if (!s.power && s.powerNoticeRead) return 'The notice is saved in Messages. Use the named switches in that order; their positions may change.'
  if (s.power && !s.boardRead && s.floor === 3) return detailed ? 'West ballroom corridor: stand near the NIGHT OWL event board, aim at its center, open Q and leave F flashlight ON for short glances totaling five seconds. Close Q when footsteps approach.' : 'The ballroom event board has faded emergency ink. Aim your phone light at it; your progress is saved between glances.'
  if (!s.badge && s.boardRead) return 'Check the saved NIGHT OWL venue in Messages, then open its compartment in the nearby BADGE LOANS box.'
  if (!s.authorized && s.floor === 4) return 'The control station is in the northeast corridor. Scan your badge, arm the doors, then release the main entrance.'
  if (s.authorized) return 'Follow the descending floor signs. On Floor 2, use the same main doors you tried first. You do not need to keep your phone open.'
  return `Look for ${target.label}${detailed ? ` on the ${target.point.x < 0 ? 'west' : 'east'} side` : ''}. Your phone map marks the current destination.`
}
export function messages(s: GameState): { from: string; text: string }[] {
  const result = [{ from: 'PA / 02:13', text: 'Talley Student Union is now closed. All guests must leave through the main entrance. Thank you for staying with us.' }]
  if (s.doorsTried) result.push({ from: 'ENTRANCE / LOCKDOWN', text: 'Emergency power offline. Information desk → backup power → security override badge → exit release. This emergency system is fictional.' })
  if (s.directoryRead) result.push({ from: 'INFORMATION DESK', text: 'BACKUP POWER: Floor 2, west wall. BADGE LOANS: Floor 3, ballroom corridor. EXIT RELEASE: Floor 4, student organizations.' })
  if (s.powerNoticeRead) result.push({ from: 'SAVED / SERVICE NOTICE', text: 'ISOLATE DINING → PRIME BATTERY → CONNECT ATRIUM. Operate by name, not switch position.' })
  if (s.phoneTaught) result.push({ from: 'UNKNOWN / YOUR NUMBER', text: 'I can hear your screen. Phone open: it approaches. Phone closed: it stops. Put it away before it reaches you.' })
  if (s.power) result.push({ from: 'PA / BACKUP RESTORED', text: 'Upper-floor access restored. Staff override badges are checked in by the event venue on Floor 3. Phone light reveals faded event-board ink.' })
  if (s.notification) result.push({ from: 'ME / NO SIGNAL', text: 'You were sitting right here a minute ago. Who is holding your phone?' })
  if (s.boardRead) result.push({ from: 'SAVED / NIGHT OWL', text: `Last event: NIGHT OWL. Venue: ${s.run.venue}. The badge loan box has a matching venue compartment.` })
  if (s.badge) result.push({ from: 'SAVED / OVERRIDE BADGE', text: 'Recovered security override badge. Take it to the Floor 4 fictional emergency control station.' })
  if (s.authorized) result.push({ from: 'PA / EXIT RELEASE', text: 'MAIN ENTRANCE UNLOCKED. RETURN TO FLOOR 2. Please do not wait for the person behind you.' })
  return result
}
export function promptText(s: GameState) {
  const text: Record<AnchorId, string> = { entrance: s.authorized ? 'Open the main doors / escape' : 'Try the main entrance', directory: 'Read information desk directory', powerNotice: 'Read backup service order', power: s.power ? 'Backup power restored' : 'Operate backup power cabinet', eventBoard: s.boardRead ? 'Event venue saved in Messages' : 'Illuminate event board / Q phone + F light', badge: s.badge ? 'Override badge recovered' : 'Open event badge loan box', release: s.authorized ? 'Main entrance released' : 'Authorize emergency exit release', up2: 'Ascend white stair → FLOOR 3', down3: 'Descend white stair → FLOOR 2', up3: 'Ascend white stair → FLOOR 4', down4: 'Descend white stair → FLOOR 3' }
  return s.prompt ? text[s.prompt] : ''
}

export const useGame = create<GameState>((set, get) => ({
  ...freshProgress, phase: 'title', run: createRun(213), attempts: storage.get('attempts'), best: storage.get('best-talley-v3'),
  muted: storage.get('muted') === 1, volume: Math.max(0, Math.min(1, storage.get('volume', 65) / 100)),
  reducedFlashing: storage.get('reduced-flashing') === 1, difficulty: 'standard', graphics: storage.get('graphics-high') ? 'high' : 'low',
  start: seed => {
    audio.unlock(); runtime.unlock?.(); resetRuntime(); runtime.checkpointTime = 0
    const attempts = get().attempts + 1
    storage.set('attempts', attempts)
    set({ ...freshProgress, discovered: [2], phase: 'intro', run: createRun(seed ?? Math.floor(Math.random() * 0xffffffff)), attempts })
    audio.ambience(true); audio.announcement('closing')
  },
  enter: () => {
    if (get().phase !== 'intro') return
    progress(); set({ phase: 'playing', floorOverlayUntil: runtime.time + 3, notice: 'WASD move · mouse look · E interact. Try the main entrance.', noticeUntil: runtime.time + 10 })
    audio.unlock(); audio.ambience(true)
  },
  retry: () => {
    if (get().phase !== 'caught') return
    const { checkpoint, run } = get(), attempts = get().attempts + 1, time = checkpoint ? runtime.checkpointTime : 0
    resetRuntime(time); storage.set('attempts', attempts)
    const floor: Floor = checkpoint === 2 ? 3 : 2
    runtime.player = checkpoint === 2 ? { x: -16, z: -14 } : checkpoint === 1 ? { x: 16, z: 14 } : { ...SPAWN }
    set({ ...freshProgress, phase: 'playing', floor, run, attempts, elapsed: time, checkpoint,
      doorsTried: checkpoint > 0, directoryRead: checkpoint > 0, powerNoticeRead: checkpoint > 0,
      power: checkpoint > 0, powerStep: checkpoint ? 3 : 0, phoneTaught: checkpoint > 0,
      boardRead: checkpoint === 2, exposure: checkpoint === 2 ? 5 : 0, badge: checkpoint === 2,
      discovered: checkpoint === 2 ? [2, 3] : [2], graceUntil: time + 18, floorOverlayUntil: time + 3 })
    if (checkpoint) { placeEntity(floor, runtime.player); runtime.triggers.add('notification') }
    announce(checkpoint ? 'Chapter checkpoint restored. The phone is closed. Take a breath, then follow your objective.' : 'Try the main entrance. Learn the phone rule before the night begins.', 10)
    audio.unlock(); audio.ambience(true)
  },
  pause: () => {
    if (get().phase !== 'playing') return
    putPhoneAway(); set({ phase: 'paused', phone: false, panel: null, help: false, prompt: null }); runtime.unlock?.(); audio.ambience(false)
  },
  resume: () => { if (get().phase === 'paused') { set({ phase: 'playing' }); audio.unlock(); audio.ambience(true) } },
  togglePhone: () => {
    const s = get(); if (s.phase !== 'playing') return
    if (s.phone) { putPhoneAway(); set({ phone: false, panel: null, panelError: '' }); return }
    if (!s.doorsTried) { announce('Try normal movement first. The main entrance is directly ahead; approach it and press E.'); return }
    set({ phone: true, phoneTaught: true }); audio.phone(true)
    if (!s.phoneTaught) { progress(); announce('Look at the upper balcony. PHONE OPEN = IT APPROACHES. Q CLOSE = IT STOPS. You are safe while learning.', 14) }
  },
  interact: () => {
    const s = get(), id = s.prompt
    if (s.phase !== 'playing' || s.panel || !id) return
    const anchor = ANCHORS[id]
    if (anchor.floor !== s.floor || distance(anchor, runtime.player) > 3.2 || !lineClear(runtime.player, anchor, s.floor)) return
    audio.click()
    if (id === 'entrance') {
      if (s.authorized) { putPhoneAway(); set({ phase: 'escaping', phone: false, prompt: null }); runtime.escapeClock = 0; runtime.unlock?.(); audio.ambience(false); audio.escaped(); return }
      if (!s.doorsTried) { progress(); set({ doorsTried: true }) }
      announce('EMERGENCY LOCKDOWN ACTIVE. Restore backup power. The information desk has a floor directory.', 12); audio.announcement('closing'); return
    }
    if (id === 'directory') {
      if (!s.doorsTried) { announce('The main entrance is ahead. Try the doors first.'); return }
      if (!s.directoryRead) { progress(); set({ directoryRead: true }) }
      announce('BACKUP POWER → west wall, Floor 2. Read the service notice beside the cabinet. Q opens a map. Look up before you look down.', 13); return
    }
    if (id === 'powerNotice') {
      if (!s.doorsTried) { announce('The main doors have a lockdown display. Try them first.'); return }
      if (!s.powerNoticeRead) { progress(); set({ directoryRead: true, powerNoticeRead: true }) }
      announce('ORDER SAVED: ISOLATE DINING → PRIME BATTERY → CONNECT ATRIUM. The backup cabinet is just north of this notice.', 13); return
    }
    if (id === 'up2') {
      if (!s.power) announce('UPPER-FLOOR ACCESS CLOSED. Restore the Floor 2 backup power first.')
      else beginStairs(3, ANCHORS.down3)
      return
    }
    if (id === 'down3') { beginStairs(2, ANCHORS.up2); return }
    if (id === 'up3') {
      if (!s.badge) announce('FLOOR 4 CONTROL ACCESS requires an override badge. Recover it from the Floor 3 event loan box.')
      else beginStairs(4, ANCHORS.down4)
      return
    }
    if (id === 'down4') { beginStairs(3, ANCHORS.up3); return }
    if (id === 'eventBoard') {
      announce(s.boardRead ? `NIGHT OWL → ${s.run.venue}. Saved in Messages. Match the venue at BADGE LOANS.` : 'Faded ink: aim the open phone flashlight at the board. Short glances add up; Q closes the phone to stop the figure.', 12); return
    }
    if (id === 'power' && !s.power) {
      if (!s.powerNoticeRead) { announce('Read the service notice immediately south of this cabinet. The order is saved to your phone.'); return }
      set({ panel: 'power', panelError: '', phone: true, phoneTaught: true })
    } else if (id === 'badge' && !s.badge) {
      if (!s.boardRead) { announce('The last event was NIGHT OWL. Reveal its venue on the nearby ballroom event board with phone light first.'); return }
      set({ panel: 'badge', panelError: '', phone: true })
    } else if (id === 'release' && !s.authorized) {
      if (!s.badge) { announce('Override badge missing. Recover it on Floor 3 before using this station.'); return }
      set({ panel: 'release', panelError: '', phone: true })
    } else return
    runtime.phoneUi = false; audio.phone(true); runtime.unlock?.()
  },
  choose: value => {
    const s = get(); if (s.phase !== 'playing' || !s.panel) return
    audio.click()
    if (s.panel === 'power') {
      if (!s.powerNoticeRead) { set({ panelError: 'Read the posted service notice first.' }); return }
      if (value !== s.powerStep) { set({ powerStep: 0, panelError: 'Sequence tripped safely. Check the named service order; positions are rearranged.' }); return }
      if (s.powerStep < 2) { set({ powerStep: s.powerStep + 1, panelError: '' }); progress(); return }
      putPhoneAway(); progress(); runtime.checkpointTime = runtime.time
      set({ power: true, powerStep: 3, panel: null, phone: false, panelError: '', checkpoint: 1,
        graceUntil: runtime.time + 18, flickerUntil: runtime.time + 3 })
      placeEntity(2, runtime.player); audio.clue(); audio.announcement('power')
      announce('CHAPTER II · BACKUP POWER RESTORED. Take the east white stair to Floor 3. The override badge is filed by the last event’s venue. Checkpoint saved.', 16); return
    }
    if (s.panel === 'badge') {
      if (!s.boardRead || s.run.venues[value] !== s.run.venue) { set({ panelError: 'No badge in that compartment. Match the saved NIGHT OWL venue from the event board.' }); return }
      putPhoneAway(); progress(); runtime.checkpointTime = runtime.time
      set({ badge: true, panel: null, phone: false, panelError: '', checkpoint: 2, graceUntil: Math.max(s.graceUntil, runtime.time + 6) })
      audio.clue(); audio.announcement('badge'); announce('CHAPTER III · OVERRIDE BADGE RECOVERED. Take the west white stair to the Floor 4 control station. Checkpoint saved.', 14); return
    }
    if (!s.badge) { set({ panelError: 'Override badge missing.' }); return }
    if (value !== s.releaseStep) { set({ panelError: 'Use the terminal in order: scan badge, arm doors, release main.' }); return }
    if (s.releaseStep < 2) { set({ releaseStep: s.releaseStep + 1, panelError: '' }); progress(); return }
    putPhoneAway(); progress(); set({ authorized: true, releaseStep: 3, panel: null, phone: false, panelError: '',
      graceUntil: Math.max(s.graceUntil, runtime.time + 8), climaxUntil: runtime.time + 8, notification: true })
    audio.climax(); audio.announcement('release'); announce('MAIN ENTRANCE UNLOCKED. RETURN TO FLOOR 2. Follow the descending white stairs. You do not need to keep the phone open.', 17)
  },
  closePanel: () => { putPhoneAway(); set({ panel: null, phone: false, panelError: '' }) },
  setVolume: volume => { const value = Math.max(0, Math.min(1, volume)); set({ volume: value }); storage.set('volume', value * 100); audio.configure(value, get().muted) },
  toggleMute: () => { const muted = !get().muted; set({ muted }); storage.set('muted', +muted); audio.configure(get().volume, muted) },
  toggleFlashing: () => { const reducedFlashing = !get().reducedFlashing; set({ reducedFlashing }); storage.set('reduced-flashing', +reducedFlashing) },
  setGraphics: graphics => { set({ graphics }); storage.set('graphics-high', +(graphics === 'high')) },
}))

function updatePrompt() {
  const s = useGame.getState(); let prompt: Prompt = null, nearest = 3.1
  for (const [id, anchor] of Object.entries(ANCHORS) as [AnchorId, typeof ANCHORS[AnchorId]][]) {
    if (anchor.floor !== s.floor || (id === 'power' && s.power) || (id === 'powerNotice' && s.powerNoticeRead) ||
      (id === 'directory' && s.directoryRead) || (id === 'badge' && s.badge) || (id === 'eventBoard' && s.boardRead) || (id === 'release' && s.authorized)) continue
    const d = distance(runtime.player, anchor)
    if (d < nearest && lineClear(runtime.player, anchor, s.floor)) { nearest = d; prompt = id }
  }
  useGame.setState({ elapsed: runtime.time, prompt })
}
export function tick(dt: number, input: Point, sprint: boolean) {
  if (!Number.isFinite(dt) || dt <= 0) return
  let remaining = Math.min(dt, 1)
  while (remaining > .000001) {
    const step = Math.min(remaining, .05), s = useGame.getState()
    if (s.phase === 'intro') { runtime.introClock += step; if (runtime.introClock >= 24) s.enter() }
    else if (s.phase === 'scare') { runtime.scareClock += step; if (runtime.scareClock >= 1.65) useGame.setState({ phase: 'caught' }) }
    else if (s.phase === 'escaping') {
      runtime.escapeClock += step
      if (runtime.escapeClock >= 5) {
        const best = s.best ? Math.min(s.best, runtime.time) : runtime.time
        storage.set('best-talley-v3', best); useGame.setState({ phase: 'escaped', elapsed: runtime.time, best, threat: 0 })
      }
    } else if (s.phase === 'stairs' && s.transition) {
      const transition = { ...s.transition, progress: Math.min(1, s.transition.progress + step / 2.8) }
      runtime.time += step
      if (transition.progress < 1) useGame.setState({ transition, elapsed: runtime.time })
      else {
        const dz = Math.sign(transition.end.z - transition.start.z) || 1
        runtime.player = { x: transition.end.x, z: transition.end.z + dz * 1.3 }; runtime.resetId++
        if (isBlocked(runtime.player.x, runtime.player.z, .3, transition.to)) runtime.player = { ...transition.end }
        placeEntity(transition.to, runtime.player, s.authorized && transition.to === 2)
        progress(); useGame.setState({ phase: 'playing', floor: transition.to, transition: null, phone: false,
          graceUntil: runtime.time + 12, floorOverlayUntil: runtime.time + 3, elapsed: runtime.time,
          discovered: s.discovered.includes(transition.to) ? s.discovered : [...s.discovered, transition.to] })
        if (transition.to === 4 && !runtime.triggers.has('last-announcement')) {
          runtime.triggers.add('last-announcement'); audio.announcement('closing'); announce('PA: The fourth floor is closed. There is no one at the control station. Please ignore the footsteps.', 12)
        }
        updatePrompt()
      }
    } else if (s.phase === 'playing') tickStep(step, input, sprint)
    else break
    remaining -= step
  }
}
function tickStep(dt: number, input: Point, sprint: boolean) {
  const s = useGame.getState(); runtime.time += dt
  runtime.moving = !s.panel && !runtime.phoneUi && Math.hypot(input.x, input.z) > .01
  if (runtime.moving) {
    const length = Math.max(1, Math.hypot(input.x, input.z)), speed = sprint ? 3.9 : 2.5
    runtime.player = moveWithCollision(runtime.player, input.x / length * speed * dt, input.z / length * speed * dt, .3, s.floor)
    if (runtime.time > runtime.stepAt) { audio.step(); runtime.stepAt = runtime.time + (sprint ? .32 : .48) }
  }
  if (s.phone) runtime.phoneSeconds += dt
  if (!s.power && s.phone) runtime.entity.x = Math.max(0, runtime.entity.x - dt * .55)
  if (s.power && s.phone && runtime.entityFloor === s.floor) {
    if (runtime.time > runtime.pathAt || runtime.path.length === 0) { runtime.path = findPath(runtime.entity, runtime.player, s.floor); runtime.pathAt = runtime.time + .8 }
    const target = travelClear(runtime.entity, runtime.player, s.floor) ? runtime.player : runtime.path[0]
    const d = distance(runtime.entity, runtime.player), safe = runtime.time < s.graceUntil
    if (target && !(safe && d < 5)) {
      const dist = distance(runtime.entity, target), speed = (s.difficulty === 'story' ? .7 : 1.1) + (s.badge ? .2 : .1) + (s.authorized ? .1 : 0)
      const travel = Math.min(dist, speed * dt)
      if (dist > .001) runtime.entity = moveWithCollision(runtime.entity, (target.x - runtime.entity.x) / dist * travel, (target.z - runtime.entity.z) / dist * travel, .32, s.floor)
      if (dist < .24) runtime.path.shift()
    }
    if (runtime.time > runtime.entityStepAt && d < 25) {
      const side = (runtime.entity.x - runtime.player.x) * -runtime.direction.z + (runtime.entity.z - runtime.player.z) * runtime.direction.x
      audio.step(true, Math.max(-1, Math.min(1, side / 8))); runtime.entityStepAt = runtime.time + (d < 8 ? .6 : .85)
    }
  }
  const d = distance(runtime.entity, runtime.player), sameFloor = runtime.entityFloor === s.floor
  const threat = s.power && sameFloor ? Math.max(0, 1 - d / 18) : 0
  runtime.contact = s.power && sameFloor && d < 1.05 && runtime.time > s.graceUntil && runtime.time > runtime.closedUntil && lineClear(runtime.entity, runtime.player, s.floor) ? runtime.contact + dt : 0
  if (runtime.contact > (s.difficulty === 'story' ? 1.3 : .9)) {
    putPhoneAway(); runtime.scareClock = 0
    useGame.setState({ phase: 'scare', phone: false, panel: null, threat: 1, elapsed: runtime.time, prompt: null })
    runtime.unlock?.(); audio.ambience(false); audio.caught(); return
  }
  if (s.floor === 3 && !s.boardRead && s.phone && s.flashlight && !s.panel) {
    const board = ANCHORS.eventBoard, dist = distance(runtime.player, board)
    const facing = ((board.x - runtime.player.x) * runtime.direction.x + (board.z - runtime.player.z) * runtime.direction.z) / Math.max(.01, dist)
    if (dist < 3.2 && facing > .68 && lineClear(runtime.player, board, 3)) {
      const exposure = Math.min(5, s.exposure + dt)
      useGame.setState({ exposure, boardRead: exposure >= 5 })
      if (exposure >= 5) { progress(); audio.clue(); announce(`NIGHT OWL → ${s.run.venue}. Venue saved in Messages. The badge loan box nearby has matching compartments.`, 13) }
    }
  }
  if (s.floor >= 3 && s.power && !runtime.triggers.has('own-number') && runtime.phoneSeconds > 9) {
    runtime.triggers.add('own-number'); useGame.setState({ notification: true }); audio.notification(); announce('NEW MESSAGE · YOUR OWN NUMBER: “Who is holding your phone?”', 10)
  }
  if (s.authorized && s.floor === 2 && !runtime.triggers.has('final-entrance')) {
    runtime.triggers.add('final-entrance'); audio.climax(); announce('MAIN ENTRANCE RELEASED. It is still when the phone is closed. Keep moving; the same doors are ahead.', 12)
    useGame.setState({ climaxUntil: runtime.time + 6 })
  }
  if (s.phone && s.power) audio.danger(threat)
  if (runtime.time < runtime.publishAt) return
  runtime.publishAt = runtime.time + .1; useGame.setState({ threat }); updatePrompt()
}
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` }
