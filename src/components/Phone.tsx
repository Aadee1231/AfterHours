import { CLUES, EXIT, SHELF_X, SHELF_Z } from '../game/world'
import { runtime, useGame } from '../game/store'

const ROMAN = ['I', 'II', 'III', 'IV']
export function FloorMap({ large = false }: { large?: boolean }) {
  const clues = useGame(s => s.clues)
  const px = (x: number) => x + 16, pz = (z: number) => z + 20
  return <svg className={`floor-map ${large ? 'large' : ''}`} viewBox="-2 -4 36 48" aria-label="Rough floor map with clue locations, stairs, elevators, and your live position" role="img">
    <rect x="0" y="0" width="32" height="40" fill="#18241e" stroke="#7e8b72" strokeWidth=".25" />
    {SHELF_X.flatMap(x => SHELF_Z.map(z => <rect key={`${x}-${z}`} x={px(x) - 0.8} y={pz(z) - 4} width="1.6" height="8" fill="#4f5b46" />))}
    <path d="M1 6h3v22H1M8 38h5M24 34h5" fill="none" stroke="#68755b" strokeWidth=".6" />
    <text x="16" y="-1.3" textAnchor="middle" className="map-label">N ↑ / EMERGENCY STAIRS</text>
    <path d="M14.6 0h2.8" stroke="#d5a16f" strokeWidth=".9" />
    <text x="7" y="43" className="map-label">ELEVATORS / NO POWER</text>
    <text x="17" y="38" className="map-tiny">READING</text>
    <text x="1.8" y="5" className="map-tiny">CARRELS</text>
    <text x="10" y="20" className="map-tiny">STACKS</text>
    {CLUES.map(c => <g key={c.id}>
      <circle cx={px(c.x)} cy={pz(c.z)} r="1.25" fill={clues.includes(c.id) ? '#667357' : '#c4b88b'} />
      <text x={px(c.x)} y={pz(c.z) + .48} textAnchor="middle" fill="#152018" fontSize="1.5" fontFamily="monospace">{clues.includes(c.id) ? '✓' : ROMAN[c.id]}</text>
    </g>)}
    <circle cx={px(EXIT.x)} cy={pz(EXIT.z)} r=".5" fill="#d4a472" />
    <circle cx={px(runtime.player.x)} cy={pz(runtime.player.z)} r="1.5" fill="#a9d7b9" opacity=".15" />
    <circle cx={px(runtime.player.x)} cy={pz(runtime.player.z)} r=".65" fill="#c5e4cc" />
    <path d={`M${px(runtime.player.x)} ${pz(runtime.player.z)}l${runtime.direction.x * 1.8} ${runtime.direction.z * 1.8}`} stroke="#c5e4cc" strokeWidth=".28" />
  </svg>
}

export function Phone() {
  const s = useGame()
  const note = CLUES[s.selectedNote]
  if (!s.phone || s.phase !== 'playing' || s.keypad) return null
  return <aside className={`phone ${s.threat > .55 ? 'phone-danger' : ''}`} aria-label="In-game phone">
    <div className="phone-hardware"><i className="phone-camera" />
      <div className="phone-screen">
        <div className="phone-status"><span>02:13</span><span>NO SERVICE <b>▰</b></span></div>
        <div className="phone-brand">OFFLINE / PERSONAL DEVICE</div>
        <div className="phone-tabs"><span className={s.tab === 'notes' ? 'active' : ''}>NOTES <small>{s.clues.length}/4</small></span><span className={s.tab === 'map' ? 'active' : ''}>MAP</span><kbd>TAB</kbd></div>
        {s.notification && <div className="notification"><span>MESSAGES · FROM: ME</span><strong>DON’T TURN AROUND.</strong><small>+1 (919) 555-0213 · your number</small></div>}
        {s.tab === 'notes' ? <div className="phone-notes">
          <div className="note-index">{CLUES.map(c => <span key={c.id} className={`${s.clues.includes(c.id) ? 'found' : ''} ${s.selectedNote === c.id && s.clues.includes(c.id) ? 'selected' : ''}`}>{ROMAN[c.id]}</span>)}</div>
          {s.clues.includes(s.selectedNote) ? <article className="note-content" key={s.selectedNote}>
            <div className="note-source">RECORD {ROMAN[note.id]} / {note.place.toUpperCase()}</div>
            <h3>{note.title}</h3><p>“{note.text}”</p>
            <p className="note-hint">{note.hint}</p>
            <div className="record-digit"><span>CODE POSITION {note.order}</span><b>{note.digit}</b></div>
          </article> : <div className="empty-notes"><span>NO RECORDS YET</span><h3>Someone was here before you.</h3><p>Find four marked records. Use the phone’s light to read them with <kbd>E</kbd>.</p><p>Check the MAP for their last known locations.</p></div>}
          <div className="phone-tip">← → BROWSE RECORDS</div>
        </div> : <div className="phone-map"><FloorMap /><p>● YOU &nbsp; I—IV RECORDS</p><small>A rough sketch. Not to scale.<br />Nothing on this map shows where it is.</small></div>}
        <div className="phone-light"><span className={s.flashlight ? 'lit' : ''}>●</span> FLASHLIGHT {s.flashlight ? 'ON' : 'OFF'} <kbd>F</kbd></div>
        <div className="phone-warning"><i />IT MOVES WHILE YOU LOOK.</div>
        <div className="phone-home" />
      </div>
    </div>
    <div className="phone-close-hint"><kbd>Q</kbd> PUT IT AWAY. MAKE IT STOP.</div>
  </aside>
}
