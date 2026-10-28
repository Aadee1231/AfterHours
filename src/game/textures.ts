import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }
function canvas(size: number) {
  const c = document.createElement('canvas'); c.width = c.height = size
  return { c, ctx: c.getContext('2d')! }
}
export function surfaceTexture(kind: 'floor' | 'ceiling' | 'brick' | 'wall') {
  const { c, ctx } = canvas(512), rand = seeded(71)
  ctx.fillStyle = { floor: '#b0afa0', ceiling: '#8e9282', brick: '#6d4d3e', wall: '#9b9e88' }[kind]
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 12000; i++) {
    const v = rand() > 0.5 ? 220 : 12
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * (kind === 'ceiling' ? 0.16 : 0.07)})`
    ctx.fillRect(rand() * 512, rand() * 512, rand() * 3 + 1, rand() * 2 + 1)
  }
  if (kind === 'floor' || kind === 'ceiling') {
    ctx.strokeStyle = kind === 'ceiling' ? '#555e51' : '#888b7e'; ctx.lineWidth = kind === 'ceiling' ? 4 : 1
    ctx.strokeRect(0, 0, 512, 512)
    if (kind === 'ceiling') { ctx.strokeRect(256, 0, 256, 512) }
    else for (let i = 0; i < 25; i++) {
      ctx.strokeStyle = 'rgba(34,40,25,.09)'; ctx.beginPath()
      const x = rand() * 512, y = rand() * 512
      ctx.moveTo(x, y); ctx.lineTo(x + rand() * 55, y + rand() * 20); ctx.stroke()
    }
  }
  if (kind === 'brick') {
    ctx.strokeStyle = '#343c32'; ctx.lineWidth = 6
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
      for (let x = y % 128 === 0 ? 0 : -128; x < 512; x += 256) {
        ctx.strokeRect(x, y, 256, 64)
        ctx.fillStyle = `rgba(20,12,8,${rand() * 0.13})`; ctx.fillRect(x + 4, y + 4, 248, 56)
      }
    }
  }
  const texture = new CanvasTexture(c); texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(kind === 'floor' ? 16 : kind === 'ceiling' ? 12 : 5, kind === 'brick' ? 1 : 16)
  texture.anisotropy = 4
  return texture
}

export function signTexture(text: string, options: { bg?: string; fg?: string; width?: number; height?: number; small?: string; serif?: boolean } = {}) {
  const c = document.createElement('canvas'); c.width = options.width ?? 768; c.height = options.height ?? 192
  const ctx = c.getContext('2d')!
  ctx.fillStyle = options.bg ?? '#28352d'; ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = options.fg ?? '#c8cfb6'; ctx.lineWidth = 2; ctx.strokeRect(9, 9, c.width - 18, c.height - 18)
  ctx.fillStyle = options.fg ?? '#d2d7c2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `${options.serif ? '' : '500 '}${c.height * (options.small ? 0.34 : 0.42)}px ${options.serif ? 'Georgia' : 'monospace'}`
  ctx.fillText(text, c.width / 2, c.height * (options.small ? 0.4 : 0.52), c.width - 40)
  if (options.small) { ctx.font = `${c.height * 0.13}px monospace`; ctx.fillText(options.small, c.width / 2, c.height * 0.78, c.width - 40) }
  const texture = new CanvasTexture(c); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}
