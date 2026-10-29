import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { PuzzlePanel } from '../src/components/PuzzlePanel'
import { Phone } from '../src/components/Phone'
import { Box } from '../src/game/primitives'
import type { GameState } from '../src/game/store'

const state = vi.hoisted(() => ({ value: {} as GameState }))
vi.mock('../src/game/store', async original => ({ ...await original<typeof import('../src/game/store')>(), useGame: () => state.value }))
vi.mock('../src/game/audio', () => ({ audio: new Proxy({}, { get: () => vi.fn() }) }))
beforeEach(async () => {
  const store = await vi.importActual<typeof import('../src/game/store')>('../src/game/store')
  store.useGame.getState().start(213); store.useGame.getState().enter()
  state.value = { ...store.useGame.getState() }
})
it('creates untextured materials without undefined-map warnings', () => {
  const warning = vi.spyOn(console, 'warn')
  try { expect(Box({ at: [0, 0, 0], size: [1, 1, 1], color: '#112233' }).props.material.map).toBeNull(); expect(warning).not.toHaveBeenCalled() }
  finally { warning.mockRestore() }
})
it('hides the posted service order until it is actually read', () => {
  state.value = { ...state.value, panel: 'power', powerNoticeRead: false }
  expect(renderToStaticMarkup(<PuzzlePanel />)).toContain('READ THE SERVICE NOTICE NEAR THIS CABINET FIRST')
  state.value.powerNoticeRead = true
  expect(renderToStaticMarkup(<PuzzlePanel />)).toContain('ISOLATE DINING → PRIME BATTERY → CONNECT ATRIUM')
})
it('does not reveal the correct event venue on phone or loan panel before phone-light exposure', () => {
  state.value = { ...state.value, panel: 'badge', phone: true, tab: 'notes', boardRead: false }
  const panel = renderToStaticMarkup(<PuzzlePanel />), phone = renderToStaticMarkup(<Phone />)
  expect(panel).toContain('NOT YET REVEALED'); expect(phone).not.toContain(`Venue: ${state.value.run.venue}`)
  expect(panel).not.toContain(`NIGHT OWL · ${state.value.run.venue}`)
  state.value.boardRead = true
  expect(renderToStaticMarkup(<PuzzlePanel />)).toContain(`NIGHT OWL · ${state.value.run.venue}`)
  expect(renderToStaticMarkup(<Phone />)).toContain(`Venue: ${state.value.run.venue}`)
})
it('shows only discovered floor tabs and no entity position on the phone map', () => {
  state.value = { ...state.value, phone: true, tab: 'map', discovered: [2] }
  const html = renderToStaticMarkup(<Phone />)
  expect(html).toContain('Floor 2 map'); expect(html).not.toContain('FLOOR 4</button>')
  expect(html).toContain('The figure is never shown')
})
it('provides the three straightforward release actions and an explicit live-danger warning', () => {
  state.value = { ...state.value, panel: 'release', badge: true, threat: .8 }
  const html = renderToStaticMarkup(<PuzzlePanel />)
  for (const label of ['SCAN BADGE', 'ARM DOORS', 'RELEASE MAIN', 'TOO CLOSE', 'PUT PHONE AWAY / STOP IT']) expect(html).toContain(label)
  expect(html).not.toContain('keypad')
})
