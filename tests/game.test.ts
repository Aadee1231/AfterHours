import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANCHORS, ENTITY_SPAWN, EXIT, OBSTACLES, RECORD_POSITIONS, ROOM, SPAWN, createRun, distance, findPath, isBlocked, lineClear, moveWithCollision, travelClear, zoneAt, type Point } from '../src/game/world'
import { act, objective, promptText, recordAvailable, runtime, tick, useGame } from '../src/game/store'

const still = { x: 0, z: 0 }
const advance = (seconds: number, input = still, fps = 30) => { for (let i = 0; i < seconds * fps && useGame.getState().phase === 'playing'; i++) tick(1 / fps, input, false) }
const near = (p: Point, dz = 2.25) => { runtime.player = { x: p.x, z: p.z + dz }; tick(.12, still, false) }
const hint = (p: Point, id: number | keyof typeof ANCHORS) => { near(p, id === 'exit' ? -2.25 : 2.25); expect(useGame.getState().prompt).toBe(id) }
const teach = () => {
  hint(ANCHORS.laptop, 'laptop'); useGame.getState().interact()
  hint(ANCHORS.stair, 'stair'); useGame.getState().interact()
  expect(runtime.player).toEqual(SPAWN)
  hint(useGame.getState().run.positions[0], 0)
  useGame.getState().interact(); expect(useGame.getState().clues).toEqual([])
  useGame.getState().togglePhone(); useGame.getState().interact()
  expect(useGame.getState().clues).toEqual([0])
  advance(3.2); useGame.getState().togglePhone()
  expect(useGame.getState().phoneTaught).toBe(true)
}

beforeEach(() => { useGame.getState().start(2); useGame.getState().enter() })

describe('fictional three-zone layout and randomized solvability', () => {
  it('has solid walls with a usable portal and distinct spatial zones', () => {
    expect(ROOM).toEqual({ w: 40, d: 88, h: 3.6 })
    expect([zoneAt(SPAWN), zoneAt({ x: 0, z: 0 }), zoneAt(EXIT)]).toEqual(['north', 'stacks', 'south'])
    expect(isBlocked(0, -19)).toBe(false)
    expect(isBlocked(12, -19)).toBe(true)
    for (const p of [SPAWN, EXIT, { x: 0, z: -17 }, { x: 0, z: 0 }, { x: 0, z: 22 }]) expect(isBlocked(p.x, p.z)).toBe(false)
    expect(moveWithCollision({ x: 0, z: -19.8 }, 0, 3).z).toBeGreaterThan(-18)
  })
  it('keeps physical collision valid under 10,000 random movement vectors', () => {
    let p: Point = { ...SPAWN }, seed = 17
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    for (let i = 0; i < 10000; i++) {
      p = moveWithCollision(p, (random() - .5) * 5, (random() - .5) * 5)
      expect(isBlocked(p.x, p.z)).toBe(false)
      expect(p.x).toBeGreaterThan(-20); expect(p.x).toBeLessThan(20)
      expect(p.z).toBeGreaterThan(-44); expect(p.z).toBeLessThan(44)
    }
    expect(OBSTACLES.filter(o => o.kind === 'shelf').length).toBe(10)
    expect(lineClear({ x: -13.5, z: -8 }, { x: -10, z: -8 })).toBe(false)
    expect(travelClear({ x: -13.5, z: -8 }, { x: -10, z: -8 })).toBe(false)
  })
  it('connects every interactable and every randomized record location to the starting zone', () => {
    const candidates = [...Object.entries(ANCHORS), ...RECORD_POSITIONS.flatMap((positions, id) => positions.map((p, index) => [`${id}.${index}`, p] as const))]
    for (const [name, anchor] of candidates) {
      const approaches = [
        { x: anchor.x, z: anchor.z + 2.2 }, { x: anchor.x, z: anchor.z - 2.2 },
        { x: anchor.x + 2.2, z: anchor.z }, { x: anchor.x - 2.2, z: anchor.z },
      ].filter(p => !isBlocked(p.x, p.z) && lineClear(p, anchor))
      expect(approaches.length, name).toBeGreaterThan(0)
      expect(approaches.some(p => findPath(SPAWN, p).length > 0), name).toBe(true)
    }
  })
  it('generates reproducible and varied codes, labels, circuit order, and locations across 1,000 seeds', () => {
    const positions = new Set<string>(), codes = new Set<string>(), shuffled = new Set<string>()
    for (let seed = 0; seed < 1000; seed++) {
      const run = createRun(seed)
      expect(run).toEqual(createRun(seed))
      expect(run.code).toBe(run.records.map(r => r.digit).join(''))
      expect(run.code).toMatch(/^2[1-8][3-6][2-9]$/)
      expect(run.switches.map(s => s.id).sort()).toEqual([0, 1, 2, 3])
      run.positions.forEach((point, i) => expect(RECORD_POSITIONS[i]).toContainEqual(point))
      positions.add(run.positions.map(p => `${p.x},${p.z}`).join('|')); codes.add(run.code)
      shuffled.add(run.switches.map(s => s.name).join('|'))
    }
    expect(positions.size).toBe(16); expect(codes.size).toBeGreaterThan(30); expect(shuffled.size).toBeGreaterThan(12)
  })
})

describe('three acts, interactive instruction and puzzles', () => {
  it('teaches laptop, impossible stairs, phone reading, chase and phone freeze in order', () => {
    expect(objective(useGame.getState())[0]).toBe('Check your laptop.')
    expect(act(useGame.getState())).toContain('SOMETHING')
    hint(ANCHORS.laptop, 'laptop'); useGame.getState().interact()
    expect(objective(useGame.getState())[0]).toContain('stairwell')
    hint(ANCHORS.stair, 'stair'); useGame.getState().interact()
    expect(runtime.player).toEqual(SPAWN)
    expect(objective(useGame.getState())[0]).toContain('checkout receipt')
    hint(useGame.getState().run.positions[0], 0)
    expect(promptText(useGame.getState())).toContain('Q')
    useGame.getState().interact(); expect(useGame.getState().clues).toEqual([])
    useGame.getState().togglePhone(); useGame.getState().interact()
    expect(useGame.getState().clues).toEqual([0]); expect(runtime.phoneSeconds).toBe(0)
    const entity = { ...runtime.entity }; advance(3.2)
    expect(distance(entity, runtime.entity)).toBeGreaterThan(1)
    useGame.getState().togglePhone(); expect(useGame.getState().phoneTaught).toBe(true)
    const stopped = { ...runtime.entity }; advance(12)
    expect(runtime.entity).toEqual(stopped)
    expect(act(useGame.getState())).toContain('CHANGES')
    expect(runtime.time).toBeGreaterThan(15)
  })
  it('requires matching the full catalogue title, not just finding a loose numbered page', () => {
    teach()
    expect(recordAvailable(useGame.getState(), 1)).toBe(false)
    hint(ANCHORS.catalogue, 'catalogue'); useGame.getState().interact()
    expect(useGame.getState().panel).toBe('catalogue')
    expect(useGame.getState().phone).toBe(true)
    useGame.getState().choose((useGame.getState().run.callDigit % 8) + 1)
    expect(useGame.getState().catalogueSolved).toBe(false)
    expect(useGame.getState().panelError).toMatch(/Wrong folio/)
    useGame.getState().choose(useGame.getState().run.callDigit)
    expect(useGame.getState().catalogueSolved).toBe(true)
    expect(recordAvailable(useGame.getState(), 1)).toBe(true)
    hint(useGame.getState().run.positions[1], 1)
    useGame.getState().togglePhone(); useGame.getState().interact()
    expect(useGame.getState().clues).toEqual([0, 1])
    expect(useGame.getState().run.records[1].text).toContain(`PN 72${useGame.getState().run.callDigit}`)
  })
  it('makes the service notice necessary for a recoverable ordered breaker puzzle', () => {
    teach()
    hint(ANCHORS.breaker, 'breaker'); useGame.getState().interact()
    useGame.getState().choose(0)
    expect(useGame.getState().scheduleRead).toBe(false)
    expect(useGame.getState().power).toBe(false)
    useGame.getState().closePanel()
    hint(ANCHORS.schedule, 'schedule'); useGame.getState().interact()
    expect(useGame.getState().scheduleRead).toBe(true)
    hint(ANCHORS.breaker, 'breaker'); useGame.getState().interact()
    useGame.getState().choose(0); useGame.getState().choose(2)
    expect(useGame.getState().breakerStep).toBe(0)
    for (let i = 0; i < 4; i++) useGame.getState().choose(i)
    expect(useGame.getState().power).toBe(true)
    expect(recordAvailable(useGame.getState(), 2)).toBe(true)
    hint(useGame.getState().run.positions[2], 2)
    useGame.getState().togglePhone(); useGame.getState().interact()
    expect(useGame.getState().clues).toContain(2)
    expect(useGame.getState().run.records[2].text).toContain(`${useGame.getState().run.circuits} emergency circuits`)
  })
  it('requires powered phone light aimed at the nameplate for six seconds across glances', () => {
    teach()
    useGame.setState({ power: true })
    runtime.player = { x: ANCHORS.rubbing.x - 2.2, z: ANCHORS.rubbing.z }
    runtime.entity = { x: -15.5, z: -35 }
    runtime.direction = { x: 1, z: 0 }
    useGame.getState().togglePhone(); useGame.setState({ flashlight: false })
    advance(7); expect(useGame.getState().exposure).toBe(0)
    useGame.setState({ flashlight: true }); runtime.direction = { x: 0, z: -1 }
    advance(7); expect(useGame.getState().exposure).toBe(0)
    runtime.direction = { x: 1, z: 0 }
    advance(3); expect(useGame.getState().exposure).toBeGreaterThan(2)
    useGame.getState().togglePhone(); advance(4); expect(useGame.getState().rubbingRead).toBe(false)
    useGame.getState().togglePhone(); advance(3.2)
    expect(useGame.getState().rubbingRead).toBe(true)
    expect(useGame.getState().exposure).toBe(6)
    expect(useGame.getState().notice).toContain(`740${useGame.getState().run.roomDigit}`)
  })
  it('lets every random cabinet-record placement be collected, including its shared anchor', () => {
    for (const seed of [2, 3, 40, 66]) {
      useGame.getState().start(seed); useGame.getState().enter()
      useGame.setState({ phoneTaught: true, power: true, rubbingRead: true })
      hint(ANCHORS.cabinet, 'cabinet'); useGame.getState().interact()
      expect(useGame.getState().panel).toBe('cabinet')
      useGame.getState().choose(useGame.getState().run.roomDigit)
      expect(useGame.getState().cabinetSolved).toBe(true)
      hint(useGame.getState().run.positions[3], 3)
      useGame.getState().togglePhone(); useGame.getState().interact()
      expect(useGame.getState().clues).toEqual([3])
    }
  })
  it('returns to the original stair door before enabling the final keypad, rejects incomplete or wrong codes, then escapes', () => {
    teach()
    hint(EXIT, 'exit'); useGame.getState().interact()
    expect(useGame.getState().keypad).toBe(false)
    useGame.setState({ clues: [3, 0, 2, 1], power: true, rubbingRead: true, cabinetSolved: true })
    hint(EXIT, 'exit'); useGame.getState().interact(); expect(useGame.getState().keypad).toBe(false)
    hint(ANCHORS.stair, 'stair'); useGame.getState().interact()
    expect(useGame.getState().loopBroken).toBe(true)
    expect(act(useGame.getState())).toContain('GET OUT')
    hint(EXIT, 'exit'); useGame.getState().interact()
    expect(useGame.getState().keypad).toBe(true)
    useGame.setState({ clues: [0], code: useGame.getState().run.code }); useGame.getState().submit()
    expect(useGame.getState().phase).toBe('playing')
    expect(useGame.getState().codeError).toContain('four records')
    useGame.setState({ clues: [3, 1, 0, 2], code: '0000' }); useGame.getState().submit()
    expect(useGame.getState().phase).toBe('playing')
    expect(useGame.getState().codeError).toContain('ACCESS DENIED')
    for (const digit of useGame.getState().run.code) useGame.getState().digit(digit)
    useGame.getState().submit(); expect(useGame.getState().phase).toBe('escaped')
    expect(useGame.getState().best).toBeGreaterThan(0)
  })
})

describe('monster, pause, reset, and accessibility controls', () => {
  it('preserves real elapsed time through 1/5/15/30/60 FPS, caps stalls and ignores invalid deltas', () => {
    for (const fps of [1, 5, 15, 30, 60]) {
      useGame.getState().start(5); useGame.getState().enter()
      advance(10, still, fps); expect(runtime.time).toBeCloseTo(10, 1)
    }
    tick(NaN, still, false); tick(-1, still, false); expect(runtime.time).toBeCloseTo(10, 1)
    tick(10, still, false); expect(runtime.time).toBeCloseTo(11, 1)
  })
  it('cannot catch until the phone lesson is completed and grace time ends, then shows the cinematic before death', () => {
    useGame.setState({ clues: [0], phone: true, phoneTaught: false, graceUntil: 0 })
    runtime.entity = { ...SPAWN }
    advance(4); expect(useGame.getState().phase).toBe('playing')
    useGame.setState({ phoneTaught: true, graceUntil: runtime.time + 20 })
    advance(5); expect(useGame.getState().phase).toBe('playing')
    useGame.setState({ graceUntil: 0 })
    advance(1.1); expect(useGame.getState().phase).toBe('scare')
    expect(useGame.getState().phone).toBe(false)
    tick(1, still, false); tick(.8, still, false); expect(useGame.getState().phase).toBe('caught')
  })
  it('pursues through legal aisles only when the phone is open and stops exactly when closed', () => {
    useGame.setState({ clues: [0], phoneTaught: true, graceUntil: runtime.time + 100 })
    expect(runtime.entity).toEqual(ENTITY_SPAWN)
    useGame.getState().togglePhone(); advance(4)
    const moved = { ...runtime.entity }
    expect(distance(moved, ENTITY_SPAWN)).toBeGreaterThan(1)
    expect(isBlocked(moved.x, moved.z, .3)).toBe(false)
    useGame.getState().togglePhone(); advance(10)
    expect(runtime.entity).toEqual(moved)
    expect(useGame.getState().phase).toBe('playing')
  })
  it('resets ALL puzzle/act/phone positions, flags and warnings after death and retries with a new run', () => {
    teach()
    const old = useGame.getState().run.seed
    useGame.setState({ catalogueSolved: true, scheduleRead: true, breakerStep: 3, power: true, exposure: 4.2, rubbingRead: true, cabinetSolved: true, loopBroken: true, clues: [0, 1, 2, 3], phone: true, keypad: true, panel: 'breaker', notification: true, hint: true })
    runtime.player = { ...EXIT }; runtime.entity = { x: 0, z: 10 }; runtime.triggers.add('chair')
    useGame.getState().start(901); useGame.getState().enter()
    const s = useGame.getState()
    expect(s.run.seed).toBe(901); expect(s.run.seed).not.toBe(old)
    expect(runtime.player).toEqual(SPAWN); expect(runtime.entity).toEqual(ENTITY_SPAWN)
    expect(runtime.triggers.size).toBe(0)
    expect([s.catalogueSolved, s.scheduleRead, s.power, s.rubbingRead, s.cabinetSolved, s.loopBroken, s.phoneTaught, s.notification, s.keypad, s.phone, s.hint]).toEqual(Array(11).fill(false))
    expect([s.breakerStep, s.exposure, s.onboarding, s.clues.length]).toEqual([0, 0, 0, 0])
    expect(s.panel).toBe(null)
  })
  it('pauses simulation/audio threat and safely discards open panels on blur', () => {
    teach(); useGame.setState({ panel: 'breaker', phone: true, keypad: true })
    const before = runtime.time, entity = { ...runtime.entity }
    useGame.getState().pause(); advance(12)
    expect(runtime.time).toBe(before); expect(runtime.entity).toEqual(entity)
    expect(useGame.getState().panel).toBe(null); expect(useGame.getState().keypad).toBe(false)
    expect(useGame.getState().phone).toBe(false)
    useGame.getState().resume(); expect(useGame.getState().phase).toBe('playing')
  })
  it('persists zero volume and safely restores absent or malformed values', async () => {
    try {
      for (const [saved, expected] of [[null, .65], ['', .65], ['invalid', .65], ['Infinity', .65], ['0', 0], ['20', .2]] as const) {
        vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'after-hours:volume' ? saved : null })
        vi.resetModules()
        const { useGame: restored } = await import('../src/game/store')
        expect(restored.getState().volume).toBe(expected)
      }
    } finally { vi.unstubAllGlobals(); vi.resetModules() }
  })
})
