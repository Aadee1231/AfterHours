export type Point = { x: number; z: number }
export type Obstacle = Point & { w: number; d: number; h: number; kind: 'wall' | 'shelf' | 'desk' | 'column' }
export const ROOM = { w: 32, d: 40, h: 3.6 }
export const SPAWN = { x: 11, z: 16.8 }
export const ENTITY_SPAWN = { x: 0, z: -15.5 }
export const EXIT = { x: 0, z: -18.8 }
export const SHELF_X = [-9, -3, 3, 9]
export const SHELF_Z = [-8.5, 4.5]
export const CARRELS = [-10, -5, 0, 5]

export const CLUES = [
  { id: 0, order: 1, digit: '2', x: 10.6, z: 13.7, y: 0.94, place: 'Reading desk', title: 'The checkout slip', label: 'CHECKOUT RECEIPT', text: 'I woke up at 2:13. So did the clock. I watched it for an hour. It never changed.', hint: 'The first digit is the hour. Not the time. Just the hour.', color: '#ddd6b7' },
  { id: 1, order: 2, digit: '1', x: -13.4, z: -9.7, y: 1.02, place: 'West study carrels', title: 'A margin note', label: 'SOMEONE LEFT THIS', text: 'The building has seven floors. Tonight, it only has one. I keep taking the stairs. I keep coming back.', hint: 'The second digit is how many floors remain.', color: '#bfc8ad' },
  { id: 2, order: 3, digit: '3', x: 0, z: -8.8, y: 1.10, place: 'Returns trolley', title: 'The missing pages', label: 'DO NOT RESHELVE', text: 'Pages 3, 13, and 23 were torn from this book. Three pages. Three warnings. The same handwriting. Mine.', hint: 'The third digit is the number of missing pages.', color: '#cfb48e' },
  { id: 3, order: 4, digit: '7', x: -11.4, z: 16.9, y: 0.99, place: 'Elevator lobby', title: 'Maintenance record', label: 'SERVICE RECORD / 0213', text: 'All calls now terminate on Floor 7. Do not answer the phone. Do not wait for the elevator. Use the emergency stairs.', hint: 'The fourth digit is the floor that won’t let you leave.', color: '#d4c6af' },
] as const

export const OBSTACLES: Obstacle[] = [
  { x: -16.2, z: 0, w: 0.4, d: 40.8, h: 3.6, kind: 'wall' },
  { x: 16.2, z: 0, w: 0.4, d: 40.8, h: 3.6, kind: 'wall' },
  { x: 0, z: 20.2, w: 32.8, d: 0.4, h: 3.6, kind: 'wall' },
  { x: 0, z: -20.2, w: 32.8, d: 0.4, h: 3.6, kind: 'wall' },
  ...SHELF_X.flatMap(x => SHELF_Z.map(z => ({ x, z, w: 1.45, d: 8.1, h: 2.85, kind: 'shelf' as const }))),
  ...CARRELS.map(z => ({ x: -13.55, z, w: 2.6, d: 1.4, h: 1.5, kind: 'desk' as const })),
  { x: 10.8, z: 13.7, w: 4.2, d: 1.5, h: 0.94, kind: 'desk' },
  { x: -11.4, z: 17, w: 2.6, d: 1.2, h: 0.98, kind: 'desk' },
  { x: 0, z: -8.8, w: 1.55, d: 0.85, h: 1.1, kind: 'desk' },
  { x: 13.7, z: -7, w: 2.5, d: 1.4, h: 0.96, kind: 'desk' },
  { x: 13.7, z: 1, w: 2.5, d: 1.4, h: 0.96, kind: 'desk' },
  ...[...CARRELS.map(z => ({ x: -13.25, z: z + 1.4 })), { x: 11.1, z: 15.1 }, { x: -11.1, z: 18.4 }, { x: 14, z: -5.6 }, { x: 14, z: 2.4 }].map(p => ({ ...p, w: 0.64, d: 0.64, h: 1.2, kind: 'desk' as const })),
  ...[-12, 12].flatMap(x => [-15, 10].map(z => ({ x, z, w: 0.6, d: 0.6, h: 3.6, kind: 'column' as const }))),
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
const STEP = 0.7
const NX = 45
const NZ = 56
const pointAt = (n: number): Point => ({ x: -15.4 + (n % NX) * STEP, z: -19.25 + Math.floor(n / NX) * STEP })
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
