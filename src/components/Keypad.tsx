import { CLUES } from '../game/world'
import { useGame } from '../game/store'

export function Keypad() {
  const s = useGame()
  if (!s.keypad || s.phase !== 'playing') return null
  return <div className="modal-backdrop keypad-backdrop"><section className="keypad-panel" role="dialog" aria-modal="true" aria-labelledby="keypad-heading">
    <div className="eyebrow">EMERGENCY ACCESS / FLOOR 07</div>
    <h2 id="keypad-heading">One way out.</h2>
    <p>Enter the four digits in record order.</p>
    <div className="keypad-notes" aria-label="Collected code digits">{CLUES.map(c => <div key={c.id}><span>{['I', 'II', 'III', 'IV'][c.id]}</span><b>{s.clues.includes(c.id) ? c.digit : '—'}</b></div>)}</div>
    <div className={`code-display ${s.codeError ? 'denied' : ''}`} aria-label={`Code entered: ${s.code || 'empty'}`}><span>{[0, 1, 2, 3].map(i => <b key={i}>{s.code[i] ?? '·'}</b>)}</span><small>{s.codeError || 'SYSTEM READY / LOCAL AUTHENTICATION'}</small></div>
    <div className="keypad-buttons">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'].map(key => <button key={key} onClick={() => key === 'ENTER' ? s.submit() : s.digit(key)} aria-label={key}>{key === 'ENTER' ? '↵' : key}</button>)}</div>
    <button className="primary-button" onClick={s.submit}>UNLOCK STAIRWELL <span>→</span></button>
    <button className="text-button" onClick={s.closeKeypad}>BACK TO THE LIBRARY <kbd>ESC</kbd></button>
    <small className="safe-notice">The phone is put away while you use the keypad.</small>
  </section></div>
}
