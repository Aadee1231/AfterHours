import { useEffect, useRef } from 'react'
import { runtime, useGame } from '../game/store'

const otherTitles = ['Borrowed Days', 'The Last Reading', 'A History of Silence', 'Night Catalogue']
const serviceOrder = ['AIR', 'LAMPS', 'CATALOGUE', 'ACCESS']

export function PuzzlePanel() {
  const s = useGame()
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => { if (s.panel) dialog.current?.querySelector<HTMLButtonElement>('.puzzle-choices button:not(:disabled), .puzzle-close')?.focus() }, [s.panel])
  if (!s.panel || s.phase !== 'playing') return null

  const close = () => { s.closePanel(); runtime.lock?.() }
  const choose = (value: number) => {
    s.choose(value)
    if (!useGame.getState().panel) runtime.lock?.()
  }
  // The correct item is the only matching title; all call numbers are plausible alternatives.
  const catalogue = [
    { title: otherTitles[0], value: s.run.callDigit % 8 + 1 },
    { title: 'Borrowed Time', value: s.run.callDigit },
    { title: otherTitles[1], value: (s.run.callDigit + 2) % 8 + 1 },
    { title: otherTitles[2], value: (s.run.callDigit + 4) % 8 + 1 },
    { title: otherTitles[3], value: (s.run.callDigit + 6) % 8 + 1 },
  ]
  const rooms = Array.from({ length: 8 }, (_, i) => i + 2).filter(room => room !== s.run.roomDigit).sort((a, b) => ((a * 17 + s.run.seed) % 13) - ((b * 17 + s.run.seed) % 13)).slice(0, 3)
  rooms.splice(s.run.seed % 4, 0, s.run.roomDigit)
  const danger = s.threat > .7 ? 'TOO CLOSE — CLOSE THIS PANEL NOW' : s.threat > .4 ? 'FOOTSTEPS NEAR. CLOSE THE PHONE TO STOP IT.' : 'THE PHONE IS OPEN. IT IS APPROACHING.'

  return <div className="modal-backdrop puzzle-backdrop"><section ref={dialog} className="puzzle-panel panel" role="dialog" aria-modal="true" aria-labelledby="puzzle-heading" onKeyDown={event => {
    if (event.key !== 'Tab') return
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
  }}>
    <div className="eyebrow">D. H. HILL / FLOOR 07 · {s.panel === 'catalogue' ? 'CENTRAL STACKS' : 'SOUTH TOWER'}</div>
    <h2 id="puzzle-heading">{s.panel === 'catalogue' ? 'Folio index.' : s.panel === 'breaker' ? 'Circuit restart.' : 'Room archive.'}</h2>
    <p className="puzzle-instruction">{s.panel === 'catalogue' ? 'Find Borrowed Time. Match its entire call number to unlock its folio drawer.' : s.panel === 'breaker' ? 'Follow the posted maintenance order. The switches are not in sequence.' : 'Select the full room number recovered with your phone light.'}</p>

    {s.panel === 'catalogue' && <div className="puzzle-choices" aria-label="Catalogue entries">{catalogue.map(({ title, value }) => <button key={title} onClick={() => choose(value)}><span>{title}</span><b>PN 72{value}</b></button>)}</div>}

    {s.panel === 'breaker' && <><div className="puzzle-readout"><span>SERVICE ORDER</span><strong>{s.scheduleRead ? serviceOrder.join(' → ') : 'READ THE SERVICE NOTICE FIRST'}</strong></div><div className="breaker-progress" aria-label={`Circuits restored: ${s.breakerStep} of 4`}>{serviceOrder.map((name, step) => <span key={name} className={s.breakerStep > step ? 'complete' : ''}>{step + 1}</span>)}</div><div className="puzzle-choices breaker-choices" aria-label="Shuffled circuit switches">{s.run.switches.map(({ id, name }) => <button key={id} disabled={!s.scheduleRead} onClick={() => choose(id)}><span>CIRCUIT {name}</span><b>RESET ↗</b></button>)}</div></>}

    {s.panel === 'cabinet' && (s.rubbingRead ? <><div className="puzzle-readout"><span>RECOVERED NAMEPLATE</span><strong>ROOM 740{s.run.roomDigit}</strong></div><div className="puzzle-choices archive-choices" aria-label="Archive room drawers">{rooms.map(room => <button key={room} onClick={() => choose(room)}><span>ROOM 740{room}</span><b>OPEN DRAWER ↗</b></button>)}</div></> : <p className="puzzle-unavailable">The archive numbers are erased. Recover the nameplate in the east stacks with powered phone light first.</p>)}

    {s.panelError && <div className="puzzle-error" role="alert">{s.panelError}</div>}
    <div className="puzzle-danger" role="status"><div className="puzzle-danger-bar"><span style={{ width: `${Math.round(s.threat * 100)}%` }} /></div><strong>{danger}</strong></div>
    <button className="puzzle-close" onClick={close}>CLOSE PHONE / STOP IT <kbd>ESC</kbd> <kbd>Q</kbd></button>
  </section></div>
}
