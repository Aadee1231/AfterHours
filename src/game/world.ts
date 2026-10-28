export type Point = { x: number; z: number }
export type Obstacle = Point & { w: number; d: number; h: number; kind: 'wall' | 'shelf' | 'desk' | 'column' }
export const ROOM = { w: 40, d: 88, h: 3.6 }
export const SPAWN = { x: -11, z: -34.4 }
export const ENTITY_SPAWN = { x: 15.5, z: 0 }
export const EXIT = { x: 0, z: 42 }
export const SHELF_X = [-12, -6, 0, 6, 12]
export const SHELF_Z = [-8, 8]
export const CARRELS = [-38, -33, -28, -23]
export type Zone = 'north' | 'stacks' | 'south'
export const zoneAt = (p: Point): Zone => p.z < -19 ? 'north' : p.z > 19 ? 'south' : 'stacks'
export const ANCHORS = {
  laptop: { x: -11, z: -37 }, stair: { x: -18, z: -24 },
  directory: { x: 0, z: -20.5 }, catalogue: { x: -17.5, z: -14 },
  breaker: { x: 16.7, z: 30 }, schedule: { x: 12, z: 24 },
  rubbing: { x: 17.5, z: 10 }, cabinet: { x: -15, z: 31 },
  return: { x: 0, z: 24 }, exit: EXIT,
} satisfies Record<string, Point>
export const RECORD_POSITIONS = [
  [{ x: -7, z: -37 }, { x: -7, z: -28 }],
  [{ x: -17, z: -8 }, { x: -17, z: 8 }],
  [{ x: 16.7, z: 33 }, { x: 12, z: 33 }],
  [{ x: -15, z: 31 }, { x: -10, z: 31 }],
] as const
export const DESKS = [
  ...[-16, -7, 7, 16].flatMap(x => [-37, -28].map(z => ({ x, z }))),
  { x: -11, z: -37 }, { x: -11, z: -23 },
  { x: -17, z: -8 }, { x: -17, z: 8 },
  { x: 16.7, z: 33 }, { x: 12, z: 33 }, { x: -15, z: 31 }, { x: -10, z: 31 },
]

export const CLUES = [
  { id: 0, order: 1, digit: '2', x: 10.6, z: 13.7, y: 0.94, place: 'Reading desk', title: 'The checkout slip', label: 'CHECKOUT RECEIPT', text: 'I woke up at 2:13. So did the clock. I watched it for an hour. It never changed.', hint: 'The first digit is the hour. Not the time. Just the hour.', color: '#ddd6b7' },
  { id: 1, order: 2, digit: '1', x: -13.4, z: -9.7, y: 1.02, place: 'West study carrels', title: 'A margin note', label: 'SOMEONE LEFT THIS', text: 'The building has seven floors. Tonight, it only has one. I keep taking the stairs. I keep coming back.', hint: 'The second digit is how many floors remain.', color: '#bfc8ad' },
  { id: 2, order: 3, digit: '3', x: 0, z: -8.8, y: 1.10, place: 'Returns trolley', title: 'The missing pages', label: 'DO NOT RESHELVE', text: 'Pages 3, 13, and 23 were torn from this book. Three pages. Three warnings. The same handwriting. Mine.', hint: 'The third digit is the number of missing pages.', color: '#cfb48e' },
  { id: 3, order: 4, digit: '7', x: -11.4, z: 16.9, y: 0.99, place: 'Elevator lobby', title: 'Maintenance record', label: 'SERVICE RECORD / 0213', text: 'All calls now terminate on Floor 7. Do not answer the phone. Do not wait for the elevator. Use the emergency stairs.', hint: 'The fourth digit is the floor that won’t let you leave.', color: '#d4c6af' },
] as const

export function createRun(seed: number) {
  let n = seed >>> 0
  const random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
  const callDigit = 1 + Math.floor(random() * 8), circuits = 3 + Math.floor(random() * 4), roomDigit = 2 + Math.floor(random() * 8)
  const positions = RECORD_POSITIONS.map(options => ({ ...options[Math.floor(random() * options.length)] }))
  const switches = ['AIR', 'LAMPS', 'CATALOGUE', 'ACCESS'].map((name, i) => ({ name, id: i, sort: random() })).sort((a, b) => a.sort - b.sort)
  const records = [
    { id: 0, title: 'The checkout receipt', label: 'I / THE HOUR', place: 'North Tower study desk', text: 'The laptop and the desk clock stopped at 02:13 AM. I have tried the stairs twice. Both times I returned to my own chair.', hint: 'First position: the hour on the clock. Ignore the minutes.', digit: '2' },
    { id: 1, title: 'Borrowed Time', label: 'II / THE CALL NUMBER', place: 'Central stacks / folio drawer', text: `The catalogue lists Borrowed Time at PN 72${callDigit}. The book is checked out to my name. Its due date is tomorrow. Every day is tomorrow.`, hint: 'Second position: the last digit of its three-digit call number.', digit: String(callDigit) },
    { id: 2, title: 'The load report', label: 'III / THE LIVING CIRCUITS', place: 'South Tower maintenance desk', text: `${circuits} emergency circuits came back green. The red indicator belongs to the elevator. Do not count it. Someone was maintaining this place after closing. Someone is still here.`, hint: 'Third position: count only the restored green circuits.', digit: String(circuits) },
    { id: 3, title: 'A room that remembers', label: 'IV / THE ROOM', place: 'South Tower archive cabinet', text: `The nameplate hidden under the old ink read 740${roomDigit}. I found my own handwriting in that room's archive. It says: return to the first stair door before you try the last.`, hint: 'Fourth position: the final digit of the room revealed by phone light.', digit: String(roomDigit) },
  ]
  return { seed, positions, switches, callDigit, circuits, roomDigit, records, code: records.map(r => r.digit).join('') }
}
export type Run = ReturnType<typeof createRun>

export const OBSTACLES: Obstacle[] = [
  ...[-20.2, 20.2].map(x => ({ x, z: 0, w: .4, d: 88.8, h: 3.6, kind: 'wall' as const })),
  ...[-44.2, 44.2].map(z => ({ x: 0, z, w: 40.8, d: .4, h: 3.6, kind: 'wall' as const })),
  ...[-19, 19].flatMap(z => [-12, 12].map(x => ({ x, z, w: 16, d: .4, h: 3.6, kind: 'wall' as const }))),
  ...SHELF_X.flatMap(x => SHELF_Z.map(z => ({ x, z, w: 1.45, d: 10, h: 2.85, kind: 'shelf' as const }))),
  ...DESKS.map(p => ({ ...p, w: 2.6, d: 1.4, h: 1.5, kind: 'desk' as const })),
  ...[-12, 12].flatMap(x => [-22, 22].map(z => ({ x, z, w: .65, d: .65, h: 3.6, kind: 'column' as const }))),
  ...[-6, 6].map(x => ({ x, z: 36, w: 3.8, d: 1.2, h: 1.1, kind: 'desk' as const })),
]

export function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z) }

export function isBlocked(x: number, z: number, radius = 0.3): boolean {
  return OBSTACLES.some(o => {
    const dx = x - Math.max(o.x - o.w / 2, Math.min(x, o.x + o.w / 2))
    const dz = z - Math.max(o.z - o.d / 2, Math.min(z, o.z + o.d / 2))
    return dx * dx + dz * dz < radius * radius
  })
}

export function moveWithCollision(point: Point, dx: number, dz: number, radius = 0.3): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12))
  let { x, z } = point
  for (let i = 0; i < steps; i++) {
    if (!isBlocked(x + dx / steps, z, radius)) x += dx / steps
    if (!isBlocked(x, z + dz / steps, radius)) z += dz / steps
  }
  return { x, z }
}

export function lineClear(a: Point, b: Point): boolean {
  const steps = Math.ceil(distance(a, b) / 0.18)
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps
    const z = a.z + (b.z - a.z) * i / steps
    if (OBSTACLES.some(o => o.h > 1.5 && Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2)) return false
  }
  return true
}

export function travelClear(a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.15))
  for (let i = 1; i <= steps; i++) if (isBlocked(a.x + (b.x - a.x) * i / steps, a.z + (b.z - a.z) * i / steps, 0.34)) return false
  return true
}

// A shared, collision-aware grid keeps the stalker in the same aisles as the player.
const STEP = 0.65
const NX = 61
const NZ = 135
const pointAt = (n: number): Point => ({ x: -19.5 + (n % NX) * STEP, z: -43.5 + Math.floor(n / NX) * STEP })
const walkable = Array.from({ length: NX * NZ }, (_, i) => { const p = pointAt(i); return !isBlocked(p.x, p.z, 0.38) })
function nearest(p: Point): number {
  let best = -1, min = Infinity
  for (let i = 0; i < walkable.length; i++) if (walkable[i]) {
    const d = distance(p, pointAt(i))
    if (d < min) { min = d; best = i }
  }
  return best
}
export function findPath(from: Point, to: Point): Point[] {
  const start = nearest(from), goal = nearest(to)
  const queue = [start]
  const prev = new Int32Array(NX * NZ).fill(-1)
  prev[start] = start
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head]
    if (n === goal) break
    for (const next of [n - 1, n + 1, n - NX, n + NX]) {
      if (next < 0 || next >= prev.length || !walkable[next] || prev[next] !== -1) continue
      if (Math.abs(next % NX - n % NX) + Math.abs(Math.floor(next / NX) - Math.floor(n / NX)) !== 1) continue
      prev[next] = n
      queue.push(next)
    }
  }
  if (prev[goal] === -1) return []
  const path: Point[] = []
  for (let n = goal; n !== start; n = prev[n]) path.push(pointAt(n))
  return path.reverse()
}

export const ESCAPE_CODE = [...CLUES].sort((a, b) => a.order - b.order).map(c => c.digit).join('')
