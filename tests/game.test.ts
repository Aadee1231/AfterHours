import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANCHORS, FLOORS, OBSTACLES, SPAWN, createRun, distance, findPath, isBlocked, lineClear, moveWithCollision, type AnchorId, type Floor, type Point } from '../src/game/world'
import { act, contextualHint, currentLandmark, hintLevel, messages, objective, runtime, tick, useGame } from '../src/game/store'

vi.mock('../src/game/audio', () => ({ audio: new Proxy({}, { get: () => vi.fn() }) }))
const still = { x: 0, z: 0 }
function advance(seconds: number, input = still, fps = 30) { for (let time = 0; time < seconds - .00001; time += 1 / fps) tick(Math.min(1 / fps, seconds - time), input, false) }
function at(id: AnchorId) {
  const a = ANCHORS[id]
  runtime.player = { x: a.x, z: a.z }
  useGame.setState({ floor: a.floor, prompt: id })
  useGame.getState().interact()
}
function power() { at('entrance'); at('directory'); at('powerNotice'); at('power'); for (const value of [0, 1, 2]) useGame.getState().choose(value) }
function climb(id: 'up2' | 'up3' | 'down3' | 'down4') { at(id); expect(useGame.getState().phase).toBe('stairs'); advance(2.9); expect(useGame.getState().phase).toBe('playing') }
function reveal() {
  runtime.player = { x: -15, z: -14 }; runtime.direction = { x: 0, z: -1 }
  useGame.setState({ phone: true, flashlight: true }); advance(5.1)
  useGame.getState().togglePhone()
}
function badge() { reveal(); at('badge'); useGame.getState().choose(useGame.getState().run.venues.indexOf(useGame.getState().run.venue)) }
beforeEach(() => { useGame.getState().start(213); useGame.getState().enter() })

describe('floor-aware world and seeded puzzles', () => {
  it('has open spawn/landings, a real upper-floor atrium void, and solid stair bodies', () => {
    expect(isBlocked(SPAWN.x, SPAWN.z)).toBe(false)
    for (const floor of [3, 4] as Floor[]) expect(isBlocked(0, 0, .3, floor)).toBe(true)
    expect(isBlocked(0, 0, .3, 2)).toBe(false)
    expect(isBlocked(16, 5, .3, 2)).toBe(true)
    expect(isBlocked(-16, -4, .3, 3)).toBe(true)
    expect(OBSTACLES[3].some(o => o.kind === 'void')).toBe(true)
    expect(isBlocked(-5, 3, .3, 2)).toBe(false)
    expect(isBlocked(-3.5, 3, .3, 2)).toBe(false)
    expect(isBlocked(-6, 3, .3, 2)).toBe(true)
  })
  it('connects every interactable to its floor landing without traversing the void or stair body', () => {
    for (const [id, anchor] of Object.entries(ANCHORS)) {
      const floor = anchor.floor, origin = floor === 2 ? SPAWN : floor === 3 ? ANCHORS.down3 : ANCHORS.down4
      const approaches = [anchor, ...[1.6, 2.2].flatMap(d => [{ x: anchor.x + d, z: anchor.z }, { x: anchor.x - d, z: anchor.z }, { x: anchor.x, z: anchor.z + d }, { x: anchor.x, z: anchor.z - d }])]
        .filter(p => !isBlocked(p.x, p.z, .3, floor) && lineClear(p, anchor, floor))
      expect(approaches.length, id).toBeGreaterThan(0)
      expect(approaches.some(p => distance(p, origin) < .5 || findPath(origin, p, floor).length > 0), id).toBe(true)
    }
  })
  it('sweeps 10,000 movement vectors on each floor without crossing obstacles or world bounds', () => {
    let seed = 77
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    for (const floor of FLOORS) {
      let point: Point = floor === 2 ? { ...SPAWN } : floor === 3 ? { ...ANCHORS.down3 } : { ...ANCHORS.down4 }
      for (let i = 0; i < 10000; i++) {
        point = moveWithCollision(point, (random() - .5) * 7, (random() - .5) * 7, .3, floor)
        expect(isBlocked(point.x, point.z, .3, floor), `${floor}:${i}`).toBe(false)
      }
    }
  })
  it('reproduces 1,000 seeded runs with all switch permutations and all venues, without a keypad', () => {
    const venues = new Set<string>(), permutations = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const seed = Math.imul(i, 0x9e3779b9) >>> 0, run = createRun(seed)
      expect(run).toEqual(createRun(seed)); expect([...run.switches.map(s => s.id)].sort()).toEqual([0, 1, 2])
      expect(run.venues.filter(v => v === run.venue)).toHaveLength(1)
      expect(run).not.toHaveProperty('code'); venues.add(run.venue); permutations.add(run.switches.map(s => s.id).join(''))
    }
    expect(venues.size).toBe(3); expect(permutations.size).toBe(6)
  })
})
describe('the complete Talley story', () => {
  it('plays a 24-second skippable intro and teaches normal movement before the phone', () => {
    useGame.getState().start(4); expect(useGame.getState().phase).toBe('intro')
    advance(23); expect(useGame.getState().phase).toBe('intro')
    advance(1.1); expect(useGame.getState().phase).toBe('playing'); expect(useGame.getState().floor).toBe(2)
    expect(objective(useGame.getState())[0]).toBe('Try the main entrance.')
    useGame.getState().togglePhone(); expect(useGame.getState().phone).toBe(false)
    at('entrance'); expect(useGame.getState().doorsTried).toBe(true)
    expect(objective(useGame.getState())[0]).toBe('Find the information desk.')
    useGame.getState().togglePhone(); expect(useGame.getState().phoneTaught).toBe(true)
  })
  it('saves the service order, recovers from a wrong power choice, and creates checkpoint 1', () => {
    at('power'); expect(useGame.getState().panel).toBeNull()
    at('entrance'); at('directory'); at('powerNotice'); at('power')
    useGame.getState().choose(1); expect(useGame.getState().power).toBe(false); expect(useGame.getState().powerStep).toBe(0)
    expect(useGame.getState().panelError).toContain('Sequence tripped')
    for (const value of [0, 1, 2]) useGame.getState().choose(value)
    expect(useGame.getState()).toMatchObject({ checkpoint: 1, power: true, phone: false, panel: null })
    expect(currentLandmark(useGame.getState()).point).toEqual(ANCHORS.up2)
    expect(act(useGame.getState())).toContain('II ·')
  })
  it('requires phone light, proximity and aim; preserves partial exposure across safe glances', () => {
    power(); climb('up2')
    expect(useGame.getState().floor).toBe(3)
    runtime.player = { x: -15, z: -14 }; runtime.direction = { x: 0, z: -1 }
    useGame.setState({ phone: true, flashlight: false }); advance(2); expect(useGame.getState().exposure).toBe(0)
    useGame.setState({ flashlight: true }); runtime.direction = { x: 0, z: 1 }; advance(2); expect(useGame.getState().exposure).toBe(0)
    runtime.direction = { x: 0, z: -1 }; advance(2.5); expect(useGame.getState().exposure).toBeCloseTo(2.5, 1)
    useGame.getState().togglePhone(); advance(3); expect(useGame.getState().boardRead).toBe(false)
    useGame.getState().togglePhone(); advance(2.6); expect(useGame.getState().boardRead).toBe(true)
    expect(messages(useGame.getState()).some(m => m.text.includes(`Venue: ${useGame.getState().run.venue}`))).toBe(true)
  })
  it('gates the badge, rejects a wrong venue, and immediately points checkpoint 2 at Floor 4', () => {
    power(); climb('up2'); at('badge'); expect(useGame.getState().panel).toBeNull()
    reveal(); at('badge')
    const s = useGame.getState(), correct = s.run.venues.indexOf(s.run.venue)
    s.choose((correct + 1) % 3); expect(useGame.getState().badge).toBe(false)
    s.choose(correct); expect(useGame.getState()).toMatchObject({ checkpoint: 2, badge: true, panel: null, phone: false })
    expect(objective(useGame.getState())[0]).toContain('Floor 4'); expect(currentLandmark(useGame.getState()).point).toEqual(ANCHORS.up3)
  })
  it('completes all chapters, both descending stairs, and the actual cinematic ending', () => {
    power(); climb('up2'); badge(); climb('up3'); expect(useGame.getState().floor).toBe(4)
    at('release'); useGame.getState().choose(2); expect(useGame.getState().releaseStep).toBe(0)
    for (const value of [0, 1, 2]) useGame.getState().choose(value)
    expect(useGame.getState().authorized).toBe(true); expect(objective(useGame.getState())[0]).toContain('Floor 2')
    climb('down4'); expect(useGame.getState().floor).toBe(3)
    climb('down3'); expect(useGame.getState().floor).toBe(2)
    at('entrance'); expect(useGame.getState().phase).toBe('escaping')
    advance(5.1); expect(useGame.getState().phase).toBe('escaped'); expect(useGame.getState().best).toBeGreaterThan(0)
    expect(useGame.getState().discovered.sort()).toEqual([2, 3, 4])
  })
  it('offers timed contextual hints without leaking an unrevealed venue', () => {
    at('entrance'); expect(hintLevel(useGame.getState())).toBe(0)
    advance(51); expect(hintLevel(useGame.getState())).toBe(1)
    advance(45); expect(hintLevel(useGame.getState())).toBe(2)
    useGame.setState({ floor: 3, power: true })
    expect(contextualHint(useGame.getState())).not.toContain(`Venue: ${useGame.getState().run.venue}`)
    expect(messages(useGame.getState()).some(m => m.from.includes('NIGHT OWL'))).toBe(false)
  })
})
describe('fair pursuit, transitions and recovery', () => {
  it('gives a one-time readable release-terminal buffer without refreshing it or disabling later danger', () => {
    power(); climb('up2'); badge(); climb('up3'); at('release')
    const deadline = useGame.getState().graceUntil
    expect(deadline - runtime.time).toBe(20)
    runtime.entity = { x: 15, z: -7 }; runtime.entityFloor = 4
    const initial = { ...runtime.entity }; advance(5)
    expect(distance(initial, runtime.entity)).toBeGreaterThan(1)
    useGame.getState().closePanel(); at('release')
    expect(useGame.getState().graceUntil).toBe(deadline)
    useGame.getState().choose(2)
    expect(useGame.getState().graceUntil).toBe(deadline)
    advance(10); expect(useGame.getState().phase).toBe('playing')
    advance(14); expect(useGame.getState().phase).toBe('caught')
    useGame.getState().retry(); expect(runtime.triggers.has('release-reading')).toBe(false)
  })
  it('never catches the initial lesson even after prolonged phone use', () => {
    at('entrance'); useGame.getState().togglePhone(); runtime.entityFloor = 2; runtime.entity = { ...runtime.player }
    advance(120); expect(useGame.getState().phase).toBe('playing')
  })
  it('moves on an open phone and freezes exactly when closed, on every floor', () => {
    for (const floor of FLOORS) {
      useGame.getState().start(floor); useGame.getState().enter()
      useGame.setState({ power: true, doorsTried: true, phoneTaught: true, floor, graceUntil: 500 })
      runtime.player = { x: 18, z: -14 }; runtime.entity = { x: 12, z: 8 }; runtime.entityFloor = floor
      useGame.getState().togglePhone(); const before = { ...runtime.entity }; advance(3)
      expect(distance(before, runtime.entity), `floor ${floor}`).toBeGreaterThan(1)
      expect(isBlocked(runtime.entity.x, runtime.entity.z, .3, floor)).toBe(false)
      useGame.getState().togglePhone(); const frozen = { ...runtime.entity }; advance(5)
      expect(runtime.entity).toEqual(frozen)
    }
  })
  it('cannot pursue through the atrium void or change floor in normal pursuit', () => {
    useGame.setState({ power: true, doorsTried: true, phone: true, floor: 3, graceUntil: 200 })
    runtime.entityFloor = 3; runtime.entity = { x: 12, z: -8 }; runtime.player = { x: -12, z: 8 }
    for (let i = 0; i < 800; i++) { advance(.1); expect(isBlocked(runtime.entity.x, runtime.entity.z, .3, 3)).toBe(false) }
    expect(runtime.entity.x).toBeLessThan(-9)
    expect(runtime.entityFloor).toBe(3)
    const before = { ...runtime.entity }; useGame.setState({ floor: 4 }); advance(3); expect(runtime.entity).toEqual(before)
  })
  it('announces animated transitions, arrives outside the stair body, and gives safe spawn distance and grace', () => {
    at('up2'); expect(useGame.getState().phase).toBe('playing')
    power(); at('up2'); expect(useGame.getState().transition).toMatchObject({ from: 2, to: 3, progress: 0 })
    advance(1); expect(useGame.getState().transition?.progress).toBeGreaterThan(.3)
    advance(1.9); const s = useGame.getState()
    expect(s.floor).toBe(3); expect(s.graceUntil - runtime.time).toBeGreaterThan(11.8)
    expect(distance(runtime.entity, runtime.player)).toBeGreaterThanOrEqual(15)
    expect(isBlocked(runtime.player.x, runtime.player.z, .3, 3)).toBe(false)
  })
  it('requires sustained contact after grace, gives a closed-phone recovery window, then plays death', () => {
    power(); useGame.setState({ graceUntil: 0 }); runtime.entity = { ...runtime.player }; runtime.entityFloor = 2
    useGame.setState({ phone: true }); useGame.getState().togglePhone(); advance(1)
    expect(useGame.getState().phase).toBe('playing')
    advance(1.3); expect(useGame.getState().phase).toBe('scare')
    advance(1.7); expect(useGame.getState().phase).toBe('caught')
  })
  it('restores each chapter checkpoint with consistent seed, cleared panels and a safely distant entity', () => {
    power(); const seed = useGame.getState().run.seed
    for (const checkpoint of [1, 2] as const) {
      if (checkpoint === 2) { climb('up2'); badge() }
      useGame.setState({ phase: 'caught', authorized: true, panel: 'release', phone: true, releaseStep: 2 })
      useGame.getState().retry(); const s = useGame.getState()
      expect(s).toMatchObject({ phase: 'playing', checkpoint, power: true, badge: checkpoint === 2, floor: checkpoint === 2 ? 3 : 2, authorized: false, releaseStep: 0, panel: null, phone: false })
      expect(s.run.seed).toBe(seed); expect(distance(runtime.entity, runtime.player)).toBeGreaterThanOrEqual(15)
      expect(s.graceUntil - runtime.time).toBe(18)
    }
  })
  it('pauses time and threat, closes panels, and resets all chapter flags on new run', () => {
    power(); useGame.setState({ phone: true, panel: 'badge' }); const time = runtime.time, entity = { ...runtime.entity }
    useGame.getState().pause(); advance(5); expect(runtime.time).toBe(time); expect(runtime.entity).toEqual(entity)
    expect(useGame.getState()).toMatchObject({ phone: false, panel: null, phase: 'paused' })
    useGame.getState().resume(); expect(useGame.getState().phase).toBe('playing')
    useGame.getState().start(901); useGame.getState().enter()
    expect(useGame.getState()).toMatchObject({ floor: 2, power: false, badge: false, authorized: false, boardRead: false, powerNoticeRead: false, checkpoint: 0, exposure: 0, powerStep: 0, releaseStep: 0 })
    expect(runtime.player).toEqual(SPAWN); expect(runtime.triggers.size).toBe(0)
  })
  it('preserves elapsed time and movement through 1/5/15/30/60 FPS and ignores invalid deltas', () => {
    for (const fps of [1, 5, 15, 30, 60]) {
      useGame.getState().start(4); useGame.getState().enter(); advance(1, { x: 1, z: 0 }, fps)
      expect(runtime.player.x).toBeCloseTo(SPAWN.x + 2.5, 1)
      advance(9, still, fps)
      expect(runtime.time).toBeCloseTo(10, 1)
    }
    tick(NaN, still, false); tick(-1, still, false); expect(runtime.time).toBeCloseTo(10, 1)
    tick(10, still, false); expect(runtime.time).toBeCloseTo(11, 1)
  })
  it('makes Story pursuit slower and persists zero volume without interpreting it as a missing value', async () => {
    const movement: number[] = []
    for (const difficulty of ['standard', 'story'] as const) {
      useGame.getState().start(1); useGame.getState().enter()
      useGame.setState({ difficulty, power: true, phone: true, graceUntil: 100 })
      runtime.player = { x: 18, z: -14 }; runtime.entity = { x: 12, z: 8 }; runtime.entityFloor = 2
      const before = { ...runtime.entity }; advance(3); movement.push(distance(before, runtime.entity))
    }
    expect(movement[1]).toBeLessThan(movement[0])
    useGame.setState({ difficulty: 'standard' })
    try {
      for (const [saved, expected] of [[null, .65], ['', .65], ['invalid', .65], ['0', 0], ['20', .2]] as const) {
        vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'after-hours:volume' ? saved : null })
        vi.resetModules(); const restored = await import('../src/game/store')
        expect(restored.useGame.getState().volume).toBe(expected)
      }
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
})
