import { useEffect, useRef } from 'react'
import { runtime, useGame } from '../game/store'

export function Keypad() {
  const s = useGame()
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => { if (s.keypad) dialog.current?.querySelector<HTMLButtonElement>('button')?.focus() }, [s.keypad])
  if (!s.keypad || s.phase !== 'playing') return null
  return <div className="modal-backdrop keypad-backdrop"><section ref={dialog} className="keypad-panel" role="dialog" aria-modal="true" aria-labelledby="keypad-heading" onKeyDown={event => {
    if (event.key === 'Enter') {
      event.preventDefault(); event.stopPropagation()
      if (!event.repeat) s.submit()
      return
    }
    if (event.key === 'Tab') {
      const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
    }
    if (!event.repeat && (/^\d$/.test(event.key) || event.key === 'Backspace')) { event.preventDefault(); event.stopPropagation(); s.digit(event.key) }
  }}>
    <div className="eyebrow">SOUTH TOWER / EMERGENCY ACCESS</div>
    <h2 id="keypad-heading">One way out.</h2>
    <p>Interpret your saved records in order I–IV. No digits are shown here.</p>
    <div className="keypad-notes" aria-label="Record discovery status">{['I', 'II', 'III', 'IV'].map((roman, id) => <div key={roman}><span>{roman}</span><b>{s.clues.includes(id) ? 'SAVED' : 'MISSING'}</b></div>)}</div>
    <div className={`code-display ${s.codeError ? 'denied' : ''}`} aria-label={`Code entered: ${s.code || 'empty'}`}><span>{[0, 1, 2, 3].map(i => <b key={i}>{s.code[i] ?? '·'}</b>)}</span><small>{s.codeError || 'SYSTEM READY / LOCAL AUTHENTICATION'}</small></div>
    <div className="keypad-buttons">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'].map(key => <button key={key} onClick={() => key === 'ENTER' ? s.submit() : s.digit(key)} aria-label={key}>{key === 'ENTER' ? '↵' : key}</button>)}</div>
    <button className="primary-button" onClick={s.submit}>BREAK THE LOOP <span>→</span></button>
    <button className="text-button" onClick={() => { s.closeKeypad(); runtime.lock?.() }}>BACK TO THE LIBRARY <kbd>ESC</kbd></button>
    <small className="safe-notice">The phone is put away while you use the keypad.</small>
  </section></div>
}
