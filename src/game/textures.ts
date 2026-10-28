import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

type Surface = 'floor' | 'ceiling' | 'brick' | 'wall' | 'wood' | 'carpet' | 'metal'

function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } }

/** Texture repeats are specified per mesh, not for the old fixed-size room. */
export function surfaceTexture(kind: Surface, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const ctx = c.getContext('2d')!, rand = seeded(71)
  ctx.fillStyle = { floor: '#c0bdac', ceiling: '#acb0a0', brick: '#91634e', wall: '#b6b8a4', wood: '#8a6848', carpet: '#6d7767', metal: '#778478' }[kind]
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 10000; i++) {
    const v = rand() > .5 ? 230 : 20
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * (kind === 'carpet' ? .16 : .055)})`
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1 + rand() * 2)
  }
  if (kind === 'floor' || kind === 'ceiling') {
    ctx.strokeStyle = kind === 'ceiling' ? '#747e6e' : '#9c9e8f'; ctx.lineWidth = kind === 'ceiling' ? 3 : 1.5
    ctx.strokeRect(0, 0, 512, 512)
    if (kind === 'ceiling') {
      ctx.strokeRect(256, 0, 256, 512)
      for (let i = 0; i < 1100; i++) {
        ctx.fillStyle = 'rgba(35,45,34,.12)'; ctx.fillRect(rand() * 512, rand() * 512, 1.5, 1)
      }
    } else for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = 'rgba(40,46,35,.065)'; ctx.beginPath()
      const x = rand() * 512, y = rand() * 512
      ctx.moveTo(x, y); ctx.lineTo(x + rand() * 48, y + rand() * 13); ctx.stroke()
    }
  }
  if (kind === 'brick') {
    for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
      const x = col * 256 + (row % 2) * 128, y = row * 64
      ctx.fillStyle = '#5e6255'; ctx.fillRect(x, y, 256, 4); ctx.fillRect(x, y, 4, 64)
      ctx.fillStyle = `rgba(45,22,14,${.03 + rand() * .1})`; ctx.fillRect(x + 5, y + 5, 250, 58)
    }
  }
  if (kind === 'wood') for (let i = 0; i < 130; i++) {
    const y = rand() * 512
    ctx.strokeStyle = `rgba(45,25,13,${.03 + rand() * .1})`; ctx.lineWidth = 1 + rand() * 2
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(140, y - 6, 350, y + 8, 512, y + 1); ctx.stroke()
  }
  if (kind === 'metal') for (let y = 0; y < 512; y += 3) {
    ctx.fillStyle = `rgba(210,220,202,${rand() * .04})`; ctx.fillRect(0, y, 512, 1)
  }
  if (kind === 'carpet') for (let x = 0; x < 512; x += 8) {
    ctx.fillStyle = 'rgba(28,46,32,.045)'; ctx.fillRect(x, 0, 2, 512)
  }
  const texture = new CanvasTexture(c); texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(...repeat); texture.anisotropy = 4
  return texture
}

export function signTexture(text: string, options: { bg?: string; fg?: string; width?: number; height?: number; small?: string; serif?: boolean; border?: boolean } = {}) {
  const c = document.createElement('canvas'); c.width = options.width ?? 1024; c.height = options.height ?? 256
  const ctx = c.getContext('2d')!
  if (options.bg !== 'transparent') { ctx.fillStyle = options.bg ?? '#263b31'; ctx.fillRect(0, 0, c.width, c.height) }
  if (options.border !== false) {
    ctx.strokeStyle = options.fg ?? '#c8cfb6'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, c.width - 20, c.height - 20)
  }
  ctx.fillStyle = options.fg ?? '#e2dfc9'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const lines = text.split('\n'), family = options.serif ? 'Georgia, serif' : 'monospace'
  const lineHeight = c.height * (options.small ? .55 : .76) / lines.length
  const fit = (line: string, max: number) => {
    let size = max
    ctx.font = `500 ${size}px ${family}`
    while (ctx.measureText(line).width > c.width - 64 && size > 12) { size--; ctx.font = `500 ${size}px ${family}` }
  }
  lines.forEach((line, i) => {
    fit(line, Math.min(lineHeight * .75, c.height * .43))
    ctx.fillText(line, c.width / 2, c.height * (options.small ? .13 : .12) + lineHeight * (i + .5))
  })
  if (options.small) { fit(options.small, c.height * .18); ctx.fillText(options.small, c.width / 2, c.height * .82) }
  const texture = new CanvasTexture(c); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}
