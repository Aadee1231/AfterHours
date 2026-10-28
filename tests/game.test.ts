import { beforeEach, describe, expect, it } from 'vitest'
import { CLUES, ENTITY_SPAWN, ESCAPE_CODE, EXIT, OBSTACLES, SPAWN, distance, findPath, isBlocked, lineClear, moveWithCollision, travelClear, type Point } from '../src/game/world'
import { runtime, tick, useGame } from '../src/game/store'

const advance = (seconds: number, input = { x: 0, z: 0 }) => { for (let i = 0; i < seconds * 60; i++) tick(1 / 60, input, false) }

beforeEach(() => { useGame.getState().start(); useGame.getState().enter() })

describe('collision and navigation', () => {
  it('keeps every wall solid even for a large movement', () => {
    for (const [dx, dz] of [[100, 0], [-100, 0], [0, 100], [0, -100]]) {
      const p = moveWithCollision({ x: 0, z: 12 }, dx, dz)
      expect(Math.abs(p.x)).toBeLessThan(16)
      expect(Math.abs(p.z)).toBeLessThan(20)
      expect(isBlocked(p.x, p.z)).toBe(false)
    }
  })
  it('prevents walking through each shelf from either side', () => {
    for (const o of OBSTACLES.filter(o => o.kind === 'shelf')) for (const side of [-1, 1]) {
      const p = moveWithCollision({ x: o.x + side * 2, z: o.z }, -side * 4, 0)
      expect(Math.abs(p.x - o.x)).toBeGreaterThan(1)
      expect(isBlocked(p.x, p.z)).toBe(false)
    }
  })
  it('allows wall sliding and never tunnels in 10,000 deterministic movements', () => {
    let p: Point = { ...SPAWN }, seed = 17
    for (let i = 0; i < 10000; i++) {
      seed = seed * 16807 % 2147483647
      const angle = seed / 2147483647 * Math.PI * 2
      p = moveWithCollision(p, Math.cos(angle) * 0.4, Math.sin(angle) * 0.4)
      expect(isBlocked(p.x, p.z)).toBe(false)
    }
  })
  it('has a reachable interaction approach for every clue and the exit', () => {
    for (const c of [...CLUES, EXIT]) {
      const approaches: Point[] = []
      for (let a = 0; a < 32; a++) {
        const p = { x: c.x + Math.cos(a * Math.PI / 16) * 1.8, z: c.z + Math.sin(a * Math.PI / 16) * 1.8 }
        if (!isBlocked(p.x, p.z) && lineClear(p, c)) approaches.push(p)
      }
      expect(approaches.some(p => findPath(SPAWN, p).length > 0)).toBe(true)
    }
  })
  it('finds collision-free paths connecting every aisle to the spawn', () => {
    for (const x of [-14, -6, 0, 6, 14]) for (const z of [-17, -2, 11]) {
      const path = findPath(SPAWN, { x, z })
      expect(path.length).toBeGreaterThan(0)
      expect(path.every(p => !isBlocked(p.x, p.z, .38))).toBe(true)
      expect(path.every((p, i) => i === 0 || travelClear(path[i - 1], p))).toBe(true)
    }
  })
})

describe('phone / stalker rule', () => {
  it('freezes the entity exactly when the phone is closed', () => {
    advance(20)
    expect(runtime.entity).toEqual(ENTITY_SPAWN)
    useGame.getState().togglePhone(); advance(5)
    const moved = { ...runtime.entity }
    expect(distance(moved, ENTITY_SPAWN)).toBeGreaterThan(1)
    useGame.getState().togglePhone(); advance(15)
    expect(runtime.entity).toEqual(moved)
  })
  it('navigates from the back through shelving and desks to catch the player', () => {
    useGame.getState().togglePhone()
    for (let i = 0; i < 120 * 60 && useGame.getState().phase === 'playing'; i++) {
      tick(1 / 60, { x: 0, z: 0 }, false)
      expect(isBlocked(runtime.entity.x, runtime.entity.z, .3)).toBe(false)
    }
    expect(useGame.getState().phase).toBe('caught')
  })
  it('does not catch through a shelf, and pauses both time and approach', () => {
    runtime.player = { x: -10.2, z: 4 }
    runtime.entity = { x: -7.8, z: 4 }
    runtime.time = 10
    useGame.getState().togglePhone()
    expect(lineClear(runtime.entity, runtime.player)).toBe(false)
    useGame.getState().pause()
    const entity = { ...runtime.entity }, time = runtime.time
    advance(15)
    expect(runtime.entity).toEqual(entity); expect(runtime.time).toBe(time)
    expect(useGame.getState().phase).toBe('paused')
  })
})

describe('records, keypad, replay, persistence state', () => {
  it('requires the phone to collect a record and does not duplicate it', () => {
    useGame.setState({ prompt: 0 })
    useGame.getState().interact(); expect(useGame.getState().clues).toEqual([])
    useGame.getState().togglePhone(); useGame.getState().interact(); useGame.getState().interact()
    expect(useGame.getState().clues).toEqual([0])
    expect(useGame.getState().flickerUntil).toBeGreaterThan(0)
  })
  it('denies both incomplete records and wrong codes, then escapes with the ordered code', () => {
    useGame.setState({ keypad: true, code: ESCAPE_CODE })
    useGame.getState().submit(); expect(useGame.getState().phase).toBe('playing')
    expect(useGame.getState().codeError).toContain('Four records')
    useGame.setState({ clues: [3, 1, 0, 2], code: '0000' })
    useGame.getState().submit(); expect(useGame.getState().phase).toBe('playing')
    expect(useGame.getState().codeError).toContain('DENIED')
    runtime.time = 123
    for (const digit of ESCAPE_CODE) useGame.getState().digit(digit)
    useGame.getState().submit()
    expect(useGame.getState().phase).toBe('escaped'); expect(useGame.getState().elapsed).toBe(123)
    expect(useGame.getState().best).toBeGreaterThan(0)
  })
  it('resets ALL run state while preserving attempts and personal best', () => {
    const attempts = useGame.getState().attempts
    runtime.time = 55; runtime.player = { x: -8, z: 9 }; runtime.entity = { x: 2, z: 4 }
    runtime.triggers.add('climax'); runtime.path = [{ x: 1, z: 2 }]
    useGame.setState({ clues: [0, 1], phone: true, keypad: true, code: '13', codeError: 'bad', elapsed: 55, threat: .8, notification: true, flickerUntil: 100, climaxUntil: 100, best: 100 })
    useGame.getState().start()
    const s = useGame.getState()
    expect(s.phase).toBe('intro'); expect(s.clues).toEqual([]); expect(s.phone).toBe(false); expect(s.keypad).toBe(false)
    expect(s.code).toBe(''); expect(s.codeError).toBe(''); expect(s.elapsed).toBe(0); expect(s.threat).toBe(0)
    expect(s.notification).toBe(false); expect(s.flickerUntil).toBe(0); expect(s.climaxUntil).toBe(0)
    expect(s.attempts).toBe(attempts + 1); expect(s.best).toBe(100)
    expect(runtime.time).toBe(0); expect(runtime.triggers.size).toBe(0); expect(runtime.path).toEqual([])
    expect(runtime.player).toEqual(SPAWN); expect(runtime.entity).toEqual(ENTITY_SPAWN)
  })
  it('shows each authored scare once with separation, resetting their cooldowns on replay', () => {
    useGame.setState({ prompt: 0 }); useGame.getState().togglePhone(); useGame.getState().interact(); useGame.getState().togglePhone()
    advance(17); expect(runtime.triggers.has('book')).toBe(true)
    useGame.setState({ phone: true, prompt: 1 }); useGame.getState().interact(); useGame.setState({ phone: false })
    advance(10); expect(useGame.getState().notification).toBe(true)
    useGame.setState({ clues: [0, 1, 2, 3] }); runtime.player = { x: 0, z: -17 }
    advance(6); expect(runtime.triggers.has('climax')).toBe(true)
    const count = runtime.triggers.size; advance(20); expect(runtime.triggers.size).toBe(count)
    useGame.getState().start(); expect(runtime.triggers.size).toBe(0)
  })
})
