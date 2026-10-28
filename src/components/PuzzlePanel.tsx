import { useEffect, useRef } from 'react'
import { runtime, useGame } from '../game/store'

const order = ['ISOLATE DINING', 'PRIME BATTERY', 'CONNECT ATRIUM']
const release = ['SCAN BADGE', 'ARM DOORS', 'RELEASE MAIN']

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
  const reading = s.panel === 'release' && runtime.triggers.has('release-reading') && s.graceUntil > s.elapsed
  const danger = reading ? `FIRST CONNECTION · ${Math.ceil(s.graceUntil - s.elapsed)}s SAFE READING. IT CAN STILL APPROACH — CLOSE THE PHONE BEFORE TIME RUNS OUT.` : s.threat > .7 ? 'TOO CLOSE — CLOSE THE PANEL AND PHONE NOW' : s.threat > .4 ? 'FOOTSTEPS NEAR. PUT THE PHONE AWAY TO STOP IT.' : 'THE PHONE IS OPEN. IT CAN APPROACH.'
  const title = s.panel === 'power' ? 'Restore backup power.' : s.panel === 'badge' ? 'Find the override badge.' : 'Release the main doors.'
  return <div className="modal-backdrop puzzle-backdrop"><section ref={dialog} className="puzzle-panel panel" role="dialog" aria-modal="true" aria-labelledby="puzzle-heading" onKeyDown={event => {
    if ((event.key === 'Escape' || event.code === 'KeyQ') && !event.repeat) { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key !== 'Tab') return
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
  }}>
    <div className="eyebrow">TALLEY / FLOOR {s.panel === 'power' ? '2 · EMERGENCY POWER' : s.panel === 'badge' ? '3 · BADGE LOAN' : '4 · EXIT RELEASE'}</div>
    <h2 id="puzzle-heading">{title}</h2>
    <p className="puzzle-instruction">{s.panel === 'power' ? 'Restore the backup circuit to reopen upper-floor access. The posted service notice gives the order; the switches have been rearranged.' : s.panel === 'badge' ? 'The badge loan box is sorted by event venue. Illuminate the Floor 3 event board with your phone light, then choose the matching venue.' : 'The security override badge authorizes this fictional emergency terminal. Complete each labeled action in order to unlock the main entrance.'}</p>

    {s.panel === 'power' && <><div className="puzzle-readout"><span>POSTED SERVICE ORDER</span><strong>{s.powerNoticeRead ? order.join(' → ') : 'READ THE SERVICE NOTICE NEAR THIS CABINET FIRST'}</strong></div><div className="breaker-progress" aria-label={`Backup circuits connected: ${s.powerStep} of 3`}>{order.map((name, i) => <span key={name} className={s.powerStep > i ? 'complete' : ''}>{i + 1}</span>)}</div><div className="puzzle-choices" aria-label="Rearranged backup switches">{s.run.switches.map(({ id, name }) => <button key={id} disabled={!s.powerNoticeRead} onClick={() => choose(id)}><span>{name}</span><b>OPERATE ↗</b></button>)}</div></>}

    {s.panel === 'badge' && <><div className="puzzle-readout"><span>EVENT BOARD INFORMATION</span><strong>{s.boardRead ? `NIGHT OWL · ${s.run.venue}` : 'NOT YET REVEALED · USE PHONE LIGHT ON THE EVENT BOARD'}</strong></div><div className="puzzle-choices" aria-label="Badge loan event venues">{s.run.venues.map((venue, index) => <button key={venue} disabled={!s.boardRead} onClick={() => choose(index)}><span>{venue}</span><b>OPEN LOAN BOX ↗</b></button>)}</div>{!s.boardRead && <p className="puzzle-unavailable">The venue is hidden on the event board by the ballroom corridor. Phone light reveals it in short glances; what you see is saved in Messages.</p>}</>}

    {s.panel === 'release' && <><div className="puzzle-readout"><span>AUTHORIZED BADGE</span><strong>{s.badge ? 'OVERRIDE BADGE PRESENT' : 'NO OVERRIDE BADGE · FLOOR 3'}</strong></div><div className="breaker-progress" aria-label={`Exit release actions completed: ${s.releaseStep} of 3`}>{release.map((name, i) => <span key={name} className={s.releaseStep > i ? 'complete' : ''}>{i + 1}</span>)}</div><div className="puzzle-choices" aria-label="Exit release actions">{release.map((name, index) => <button key={name} disabled={!s.badge || index < s.releaseStep} onClick={() => choose(index)}><span>{index + 1}. {name}</span><b>{index < s.releaseStep ? 'COMPLETE' : 'AUTHORIZE ↗'}</b></button>)}</div></>}

    {s.panelError && <div className="puzzle-error" role="alert">{s.panelError}</div>}
    <div className="puzzle-danger" role="status"><div className="puzzle-danger-bar"><span style={{ width: `${Math.round(s.threat * 100)}%` }} /></div><strong>{danger}</strong></div>
    <button className="puzzle-close" onClick={close}>PUT PHONE AWAY / STOP IT <kbd>ESC</kbd> <kbd>Q</kbd></button>
  </section></div>
}
