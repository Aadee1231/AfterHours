export type Point = { x: number; z: number }
export type Floor = 2 | 3 | 4
export type Zone = 'atrium' | 'lounge' | 'offices'
export type Obstacle = Point & { w: number; d: number; h: number; kind: 'wall' | 'desk' | 'column' | 'sofa' | 'void' | 'stair'; curved?: boolean }
export const ROOM = { w: 44, d: 44, h: 18 }
export const FLOORS: Floor[] = [2, 3, 4]
export const FLOOR_NAMES: Record<Floor, string> = { 2: 'MAIN ATRIUM', 3: 'LOUNGE / BALLROOM', 4: 'STUDENT ORGANIZATIONS' }
export const floorY = (floor: Floor) => (floor - 2) * 5
export const zoneAt = (floor: Floor): Zone => floor === 2 ? 'atrium' : floor === 3 ? 'lounge' : 'offices'
export const SPAWN: Point = { x: 4, z: 15 }
export const EXIT: Point = { x: 0, z: 20.5 }
export const ANCHORS = {
  entrance: { ...EXIT, floor: 2 }, directory: { x: -9, z: 14, floor: 2 },
  powerNotice: { x: -17, z: 8, floor: 2 }, power: { x: -17, z: 4, floor: 2 },
  up2: { x: 16, z: 12, floor: 2 }, down3: { x: 16, z: -4, floor: 3 },
  eventBoard: { x: -15, z: -16, floor: 3 }, badge: { x: -18, z: -10, floor: 3 },
  up3: { x: -16, z: -12, floor: 3 }, down4: { x: -16, z: 4, floor: 4 },
  release: { x: 15, z: -14, floor: 4 },
} satisfies Record<string, Point & { floor: Floor }>
export type AnchorId = keyof typeof ANCHORS
export const STAIRS = [
  { from: 2 as Floor, to: 3 as Floor, bottom: ANCHORS.up2, top: ANCHORS.down3 },
  { from: 3 as Floor, to: 4 as Floor, bottom: ANCHORS.up3, top: ANCHORS.down4 },
]
export const SOFAS = [{ x: -6, z: 3 }, { x: 6, z: -5 }]
export const TABLES = [{ x: -16, z: -15 }, { x: -11, z: -15 }, { x: 15, z: -17 }, { x: 11, z: -17 }]
export const COLUMNS = [-11, 11].flatMap(x => [-11.5, 11.5].map(z => ({ x, z })))
const walls: Obstacle[] = [
  ...[-22.2, 22.2].map(x => ({ x, z: 0, w: .4, d: 44.8, h: 18, kind: 'wall' as const })),
  ...[-22.2, 22.2].map(z => ({ x: 0, z, w: 44.8, d: .4, h: 18, kind: 'wall' as const })),
  ...COLUMNS.map(p => ({ ...p, w: .9, d: .9, h: 18, kind: 'column' as const })),
]
const voidSpace: Obstacle = { x: 0, z: 0, w: 18, d: 20, h: .9, kind: 'void' }
const eastStair: Obstacle = { x: 16, z: 4, w: 3.4, d: 14, h: 5, kind: 'stair' }
const westStair: Obstacle = { x: -16, z: -4, w: 3.4, d: 14, h: 5, kind: 'stair' }
export const OBSTACLES: Record<Floor, Obstacle[]> = {
  2: [...walls, eastStair,
    ...SOFAS.map(p => ({ ...p, w: 5.7, d: 4.4, h: 1.1, kind: 'sofa' as const, curved: true })),
    ...SOFAS.map(p => ({ ...p, w: .68, d: .68, h: .41, kind: 'desk' as const })),
    ...TABLES.map(p => ({ ...p, w: 2.4, d: 1.3, h: .8, kind: 'desk' as const })),
    { x: -9, z: 16, w: 5, d: 1.1, h: 1.1, kind: 'desk' },
    { x: -18.9, z: 4, w: .37, d: 1.48, h: 2.13, kind: 'desk' },
    { x: -18.83, z: 8, w: .22, d: 2, h: 2, kind: 'desk' },
    { x: 0, z: -20, w: 18, d: 1.5, h: 1.3, kind: 'desk' }],
  3: [...walls, voidSpace, eastStair, westStair,
    { x: -18.8, z: 10, w: 3, d: 5, h: 1.1, kind: 'sofa' },
    { x: 15, z: 16, w: 5, d: 2, h: .8, kind: 'desk' }],
  4: [...walls, voidSpace, westStair,
    { x: 18.8, z: 8, w: 3, d: 5, h: 1, kind: 'sofa' },
    { x: 0, z: -18, w: 6, d: 2, h: .85, kind: 'desk' }],
}

export function createRun(seed: number) {
  let n = seed >>> 0
  const random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
  const venues = ['RED OAK', 'SKYLINE', 'OAK ROOM']
  const venue = venues[Math.floor(random() * venues.length)]
  const switches = ['ISOLATE DINING', 'PRIME BATTERY', 'CONNECT ATRIUM'].map((name, id) => ({ name, id, sort: random() })).sort((a, b) => a.sort - b.sort)
  return { seed: seed >>> 0, venue, venues, switches }
}
export type Run = ReturnType<typeof createRun>
export function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z) }
export function isBlocked(x: number, z: number, radius = .3, floor: Floor = 2): boolean {
  if (Math.abs(x) > 22 - radius || Math.abs(z) > 22 - radius) return true
  return OBSTACLES[floor].some(o => {
    if (o.curved) {
      const nx = (x - o.x) / 1.27, nz = z - o.z, theta = Math.atan2(nz, nx)
      const angle = Math.abs(theta) < .43 ? (theta < 0 ? -.43 : .43) : theta
      const radial = Math.max(1.27, Math.min(2.12, Math.hypot(nx, nz)))
      return Math.hypot(x - o.x - 1.27 * radial * Math.cos(angle), z - o.z - radial * Math.sin(angle)) < radius
    }
    const dx = x - Math.max(o.x - o.w / 2, Math.min(x, o.x + o.w / 2))
    const dz = z - Math.max(o.z - o.d / 2, Math.min(z, o.z + o.d / 2))
    return dx * dx + dz * dz < radius * radius
  })
}
export function moveWithCollision(point: Point, dx: number, dz: number, radius = .3, floor: Floor = 2): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .12))
  let { x, z } = point
  for (let i = 0; i < steps; i++) {
    if (!isBlocked(x + dx / steps, z, radius, floor)) x += dx / steps
    if (!isBlocked(x, z + dz / steps, radius, floor)) z += dz / steps
  }
  return { x, z }
}
export function lineClear(a: Point, b: Point, floor: Floor = 2): boolean {
  const steps = Math.ceil(distance(a, b) / .18)
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps
    if (OBSTACLES[floor].some(o => o.h > 1.5 && o.kind !== 'stair' && Math.abs(x - o.x) < o.w / 2 && Math.abs(z - o.z) < o.d / 2)) return false
  }
  return true
}
export function travelClear(a: Point, b: Point, floor: Floor = 2): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / .15))
  for (let i = 1; i <= steps; i++) if (isBlocked(a.x + (b.x - a.x) * i / steps, a.z + (b.z - a.z) * i / steps, .34, floor)) return false
  return true
}
const STEP = .67, N = 65
const pointAt = (n: number): Point => ({ x: -21.5 + n % N * STEP, z: -21.5 + Math.floor(n / N) * STEP })
const grids = Object.fromEntries(FLOORS.map(f => [f, Array.from({ length: N * N }, (_, i) => { const p = pointAt(i); return !isBlocked(p.x, p.z, .38, f) })])) as Record<Floor, boolean[]>
export function findPath(from: Point, to: Point, floor: Floor = 2): Point[] {
  const walkable = grids[floor]
  const nearest = (p: Point) => { let best = -1, min = Infinity; for (let i = 0; i < walkable.length; i++) if (walkable[i]) { const d = distance(p, pointAt(i)); if (d < min) { min = d; best = i } } return best }
  const start = nearest(from), goal = nearest(to), queue = [start], prev = new Int32Array(N * N).fill(-1)
  if (start < 0 || goal < 0) return []
  prev[start] = start
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head]
    if (n === goal) break
    for (const next of [n - 1, n + 1, n - N, n + N]) {
      if (next < 0 || next >= prev.length || !walkable[next] || prev[next] !== -1) continue
      if (Math.abs(next % N - n % N) + Math.abs(Math.floor(next / N) - Math.floor(n / N)) !== 1) continue
      prev[next] = n; queue.push(next)
    }
  }
  if (prev[goal] === -1) return []
  const path: Point[] = []
  for (let n = goal; n !== start; n = prev[n]) path.push(pointAt(n))
  return path.reverse()
}
