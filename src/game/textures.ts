import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

type Surface = 'terrazzo' | 'plaster' | 'glass' | 'pavers' | 'floor' | 'ceiling' | 'brick' | 'wall' | 'wood' | 'carpet' | 'metal'
type SignOptions = { bg?: string; fg?: string; width?: number; height?: number; small?: string; serif?: boolean; border?: boolean }
const surfaceCache = new Map<string, CanvasTexture>()
const signCache = new Map<string, CanvasTexture>()
function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } }

/** Small procedural, cached surfaces: no downloaded building imagery or oversized per-mesh canvases. */
export function surfaceTexture(kind: Surface, repeat: [number, number] = [1, 1]) {
  const key = `${kind}/${repeat[0]}/${repeat[1]}`
  const existing = surfaceCache.get(key)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = kind === 'glass' ? 512 : 256
  const ctx = canvas.getContext('2d')!, size = canvas.width
  const rand = seeded(kind.split('').reduce((n, c) => n * 33 + c.charCodeAt(0), 71))
  const backgrounds: Record<Surface, string> = {
    terrazzo: '#c8cdcc', plaster: '#efeee5', glass: '#20313f', pavers: '#97968b',
    floor: '#e9e4d7', ceiling: '#ecede6', brick: '#ae9d8c', wall: '#efeee5',
    wood: '#b9a287', carpet: '#686c70', metal: '#899396',
  }
  ctx.fillStyle = backgrounds[kind]; ctx.fillRect(0, 0, size, size)
  if (kind === 'glass') {
    const sky = ctx.createLinearGradient(0, 0, 0, size)
    sky.addColorStop(0, '#344755'); sky.addColorStop(.57, '#526875'); sky.addColorStop(.7, '#8d8690'); sky.addColorStop(1, '#1e2c35')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, size, size)
    // Distant, fictional campus massing viewed through the atrium windows.
    for (let x = -6; x < size; x += 11 + Math.floor(rand() * 30)) {
      const h = 27 + rand() * 120
      ctx.fillStyle = rand() > .43 ? '#263741' : '#344751'
      ctx.fillRect(x, size - h, 18 + rand() * 38, h)
      if (rand() > .5) {
        ctx.fillStyle = '#c6a78b'
        for (let y = size - h + 14; y < size - 12; y += 19) for (let dx = 7; dx < 23; dx += 9) if (rand() > .68) ctx.fillRect(x + dx, y, 2, 3)
      }
    }
    ctx.fillStyle = 'rgba(214,205,193,.14)'
    for (let i = 0; i < 90; i++) ctx.fillRect(rand() * size, rand() * size * .68, 1, 1)
  } else {
    for (let i = 0; i < 1300; i++) {
      const bright = rand() > .49
      ctx.fillStyle = bright ? 'rgba(255,251,239,.20)' : 'rgba(61,61,55,.08)'
      const x = rand() * size, y = rand() * size
      ctx.fillRect(x, y, 1 + rand() * (kind === 'terrazzo' || kind === 'floor' ? 5 : 2), 1 + rand() * 3)
    }
    if (kind === 'terrazzo' || kind === 'floor' || kind === 'pavers') {
      ctx.strokeStyle = 'rgba(106,104,95,.25)'; ctx.lineWidth = 1
      ctx.strokeRect(.5, .5, size - 1, size - 1)
      for (let i = 0; i < 2; i++) {
        const p = (i + 1) * size / 3
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke()
      }
    }
    if (kind === 'wood') for (let i = 0; i < 65; i++) {
      ctx.strokeStyle = 'rgba(69,51,42,.12)'; ctx.lineWidth = 1
      const y = rand() * size
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(90, y - 3, 170, y + 4, size, y); ctx.stroke()
    }
    if (kind === 'carpet') {
      for (let y = 0; y < size; y += 4) {
        ctx.strokeStyle = y % 12 ? 'rgba(20,25,29,.15)' : 'rgba(220,223,218,.10)'
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
      }
      ctx.fillStyle = 'rgba(148,36,47,.50)'; ctx.fillRect(16, 0, 9, size)
      ctx.fillStyle = 'rgba(38,42,46,.25)'; ctx.fillRect(60, 0, 30, size)
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 2
  surfaceCache.set(key, texture)
  return texture
}

/** Keep the public signTexture(text, {small,bg,fg}) API used by primitives. */
export function signTexture(text: string, options: SignOptions = {}) {
  const key = `${text}\u0000${JSON.stringify(options)}`
  const existing = signCache.get(key)
  if (existing) return existing
  const canvas = document.createElement('canvas')
  canvas.width = options.width ?? 768
  canvas.height = options.height ?? 192
  const ctx = canvas.getContext('2d')!
  if (options.bg !== 'transparent') { ctx.fillStyle = options.bg ?? '#9e2835'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  if (options.border !== false) {
    ctx.strokeStyle = options.fg ?? '#fff2df'; ctx.lineWidth = 2
    ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18)
  }
  ctx.fillStyle = options.fg ?? '#fff7e8'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const lines = text.split('\n'), family = options.serif ? 'Georgia, serif' : 'Arial, sans-serif'
  const lineHeight = canvas.height * (options.small ? .58 : .76) / lines.length
  const fit = (line: string, preferred: number) => {
    let size = Math.round(preferred)
    do { ctx.font = `700 ${size}px ${family}`; if (ctx.measureText(line).width <= canvas.width - 42) break; size-- } while (size > 11)
  }
  lines.forEach((line, i) => {
    fit(line, Math.min(lineHeight * .8, canvas.height * .43))
    ctx.fillText(line, canvas.width / 2, canvas.height * (options.small ? .11 : .12) + lineHeight * (i + .5))
  })
  if (options.small) { fit(options.small, canvas.height * .17); ctx.fillText(options.small, canvas.width / 2, canvas.height * .84) }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 2
  signCache.set(key, texture)
  return texture
}
