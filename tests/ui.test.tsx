import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { Keypad } from '../src/components/Keypad'
import { PuzzlePanel } from '../src/components/PuzzlePanel'
import { Phone } from '../src/components/Phone'
import { createRun } from '../src/game/world'
import { Box } from '../src/game/Library'
import type { GameState } from '../src/game/store'

const state = vi.hoisted(() => ({ value: {} as GameState }))
vi.mock('../src/game/store', async importOriginal => ({ ...await importOriginal<typeof import('../src/game/store')>(), useGame: () => state.value }))

it('creates untextured world materials without undefined-map warnings', () => {
  const warnings = vi.spyOn(console, 'warn')
  try {
    const box = Box({ at: [0, 0, 0], size: [1, 1, 1], color: '#112233' })
    expect(box.props.material.map).toBeNull()
    expect(warnings).not.toHaveBeenCalled()
  } finally {
    warnings.mockRestore()
  }
})

beforeEach(async () => {
  const store = await vi.importActual<typeof import('../src/game/store')>('../src/game/store')
  store.useGame.getState().start(2); store.useGame.getState().enter()
  state.value = { ...store.useGame.getState() }
})

it('shows record status, never record digits or the full solution on the keypad', () => {
  for (const clues of [[], [0], [0, 1, 2], [0, 1, 2, 3]]) {
    state.value = { ...state.value, keypad: true, clues }
    const html = renderToStaticMarkup(<Keypad />)
    const notes = html.match(/<div class="keypad-notes".*?<\/div><\/div>/)?.[0] ?? ''
    expect(notes).toContain('Record discovery status')
    expect(notes).not.toMatch(/[0-9]/)
    expect(html).not.toContain(state.value.run.code)
    expect((notes.match(/SAVED/g) ?? []).length).toBe(clues.length)
  }
})

it('does not reveal unread narrative records on the phone', () => {
  state.value = { ...state.value, phone: true, clues: [] }
  const html = renderToStaticMarkup(<Phone />)
  for (const record of state.value.run.records) expect(html).not.toContain(record.text)
  expect(html).toContain('NO RECORDS YET')
  expect(html).not.toContain(state.value.run.code)
})

it('offers one matching archive answer at every button index over seeded runs', () => {
  const correctIndices = new Set<number>()
  for (let seed = 0; seed < 64; seed++) {
    const run = createRun(seed)
    state.value = { ...state.value, run, panel: 'cabinet', rubbingRead: true, power: true }
    const html = renderToStaticMarkup(<PuzzlePanel />)
    const labels = [...html.matchAll(/<span>ROOM 740([2-9])<\/span>/g)].map(match => Number(match[1]))
    expect(labels).toHaveLength(4)
    expect(new Set(labels).size).toBe(4)
    expect(labels.filter(digit => digit === run.roomDigit)).toHaveLength(1)
    correctIndices.add(labels.indexOf(run.roomDigit))
  }
  expect([...correctIndices].sort()).toEqual([0, 1, 2, 3])
})
