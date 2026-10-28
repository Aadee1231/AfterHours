import { ANCHORS, ROOM, SHELF_X, SHELF_Z, zoneAt, type Point, type Zone } from '../game/world'
import { act, objective, runtime, useGame, type GameState, type PhoneTab } from '../game/store'

const ROMAN = ['I', 'II', 'III', 'IV']
const zoneNames: Record<Zone, string> = { north: 'NORTH TOWER', stacks: 'CENTRAL STACKS', south: 'SOUTH TOWER' }

function currentLandmark(s: GameState): { label: string; point: Point } | null {
  if (s.onboarding === 0) return { label: 'LAPTOP', point: ANCHORS.laptop }
  if (s.onboarding === 1 || (s.clues.length === 4 && !s.loopBroken)) return { label: 'STAIRS', point: ANCHORS.stair }
  if (s.onboarding === 2) return { label: 'RECEIPT', point: s.run.positions[0] }
  if (!s.phoneTaught) return null
  if (!s.catalogueSolved) return { label: 'CATALOGUE', point: ANCHORS.catalogue }
  if (!s.clues.includes(1)) return { label: 'FOLIO', point: s.run.positions[1] }
  if (!s.scheduleRead) return { label: 'SCHEDULE', point: ANCHORS.schedule }
  if (!s.power) return { label: 'BREAKER', point: ANCHORS.breaker }
  if (!s.clues.includes(2)) return { label: 'REPORT', point: s.run.positions[2] }
  if (!s.rubbingRead) return { label: 'NAMEPLATE', point: ANCHORS.rubbing }
  if (!s.cabinetSolved) return { label: 'ARCHIVE', point: ANCHORS.cabinet }
  if (!s.clues.includes(3)) return { label: 'RECORD', point: s.run.positions[3] }
  return { label: 'ACCESS', point: ANCHORS.exit }
}

export function FloorMap({ large = false }: { large?: boolean }) {
  const s = useGame()
  const landmark = currentLandmark(s)
  const visibleLandmark = landmark && s.discovered.includes(zoneAt(landmark.point)) ? landmark : null
  return <div className={`map-frame ${large ? 'large' : ''}`}>
    <div className="map-compass">N ↑ <span>FLOOR 07 · ROUGH SKETCH</span> ↓ S</div>
    <svg className={`floor-map ${large ? 'large' : ''}`} viewBox="-25 -46 50 92" role="img" aria-label="Rough map of discovered zones, your live position, and the known objective; the entity is not shown">
      <rect x="-20" y="-44" width={ROOM.w} height={ROOM.d} fill="#101a15" stroke="#66765d" strokeWidth=".5" />
      {([['north', -44, 25], ['stacks', -19, 38], ['south', 19, 25]] as [Zone, number, number][]).map(([zone, y, height]) => <g key={zone}>
        <rect x="-19.5" y={y + .5} width="39" height={height - 1} fill={s.discovered.includes(zone) ? (zone === 'stacks' ? '#29382e' : '#314236') : '#101a15'} />
        <text x="0" y={y + (zone === 'stacks' ? 18 : 10)} className={`map-zone ${s.discovered.includes(zone) ? '' : 'unknown'}`} textAnchor="middle">{s.discovered.includes(zone) ? zoneNames[zone] : 'UNEXPLORED'}</text>
      </g>)}
      <path d="M-20 -19h40M-20 19h40" stroke="#8a9c7e" strokeWidth=".5" strokeDasharray="2 1" />
      {s.discovered.includes('north') && <><path d="M-17 -36h6m-6 7h6m18-7h7m-7 7h7" stroke="#788a6f" strokeWidth="2.4" /><text x="-15" y="-30" className="map-small">STUDY CARRELS</text><text x="-19" y="-24" className="map-small">STAIRS</text></>}
      {s.discovered.includes('stacks') && SHELF_X.flatMap(x => SHELF_Z.map(z => <rect key={`${x}-${z}`} x={x - .72} y={z - 5} width="1.44" height="10" fill="#697662" />))}
      {s.discovered.includes('south') && <><path d="M-17 27h7m20 0h7M-4 39h8" stroke="#839276" strokeWidth="2" /><text x="-17" y="38" className="map-small">ARCHIVE</text><text x="7" y="38" className="map-small">MAINTENANCE</text><text x="0" y="43" className="map-small" textAnchor="middle">ACCESS</text></>}
      {visibleLandmark && <g><circle cx={visibleLandmark.point.x} cy={visibleLandmark.point.z} r="1.2" fill="#d9bc83" stroke="#102017" strokeWidth=".5" /><text x={visibleLandmark.point.x} y={visibleLandmark.point.z - 2.2} className="map-landmark" textAnchor="middle">{visibleLandmark.label}</text></g>}
      <circle cx={runtime.player.x} cy={runtime.player.z} r="1.1" fill="#c8eacb" stroke="#14251d" strokeWidth=".5" />
      <path d={`M${runtime.player.x} ${runtime.player.z}l${runtime.direction.x * 2.7} ${runtime.direction.z * 2.7}`} stroke="#d6eed5" strokeWidth=".65" />
    </svg>
    <div className="map-legend"><b>● YOU</b><b>● CURRENT KNOWN OBJECTIVE</b></div>
  </div>
}

export function Phone() {
  const s = useGame()
  const collected = [...s.clues].sort((a, b) => a - b)
  const selected = collected.includes(s.selectedNote) ? s.selectedNote : collected[0]
  const note = selected === undefined ? null : s.run.records[selected]
  const [task, hint] = objective(s)
  if (s.phase !== 'playing' || s.keypad) return null
  const setTab = (tab: PhoneTab) => useGame.setState({ tab })
  return <aside className={`phone ${s.phone ? 'phone-visible' : 'phone-lowered'} ${s.threat > .55 ? 'phone-danger' : ''}`} aria-label="In-game phone" aria-hidden={!s.phone} inert={!s.phone} onKeyDown={event => { if (event.code === 'KeyQ' && !event.repeat) { event.preventDefault(); event.stopPropagation(); s.togglePhone() } }}>
    <div className="phone-hardware"><i className="phone-camera" />
      <div className="phone-screen">
        <div className="phone-status"><span>02:13</span><span>NO SERVICE <b>▰</b></span></div>
        <div className="phone-brand">OFFLINE / PERSONAL DEVICE</div>
        <nav className="phone-tabs" aria-label="Phone sections">{(['notes', 'map', 'objectives'] as PhoneTab[]).map(tab => <button key={tab} type="button" aria-current={s.tab === tab ? 'page' : undefined} className={s.tab === tab ? 'active' : ''} onClick={() => setTab(tab)}>{tab.toUpperCase()}{tab === 'notes' && <small> {collected.length}/4</small>}</button>)}</nav>
        {s.notification && <div className="notification"><span>MESSAGES · FROM: ME</span><strong>DON’T TURN AROUND.</strong><small>+1 (919) 555-0213 · your number</small></div>}
        {s.tab === 'notes' ? <div className="phone-notes">
          <div className="note-index" aria-label="Collected records">{ROMAN.map((roman, id) => <button key={roman} type="button" disabled={!collected.includes(id)} aria-label={`Record ${roman}: ${collected.includes(id) ? 'discovered' : 'undiscovered'}`} aria-current={selected === id && collected.includes(id) ? 'page' : undefined} className={`${collected.includes(id) ? 'found' : ''} ${selected === id && collected.includes(id) ? 'selected' : ''}`} onClick={() => useGame.setState({ selectedNote: id })}>{roman}</button>)}</div>
          {note ? <article className="note-content" key={selected}><div className="note-source">RECORD {ROMAN[selected]} / {note.place.toUpperCase()}</div><h3>{note.title}</h3><p>“{note.text}”</p><p className="note-hint">{note.hint}</p></article> : <div className="empty-notes"><span>NO RECORDS YET</span><h3>Someone was here before you.</h3><p>Start with your laptop and the stairwell. Open your phone <kbd>Q</kbd> to save a discovered record with <kbd>E</kbd>.</p></div>}
          <div className="phone-tip">← → BROWSE DISCOVERED RECORDS</div>
        </div> : s.tab === 'map' ? <div className="phone-map"><FloorMap /><p>Only visited areas are drawn.</p><small>No marker shows where the figure is. An unlocked record may appear as the next known objective.</small></div> : <div className="phone-objectives"><span className="phone-act">{act(s)}</span><h3>{task}</h3><p>Follow the traces through the towers. The records make sense in order I–IV.</p><button className="phone-hint-toggle" onClick={() => useGame.setState({ hint: !s.hint })} aria-pressed={s.hint}>{s.hint ? 'HIDE CONTEXTUAL HINT' : 'SHOW CONTEXTUAL HINT'} <kbd>?</kbd></button>{(s.hint || s.difficulty === 'story') && <p className="phone-hint">{hint}</p>}{s.scheduleRead && <p className="phone-progress">SERVICE ORDER<br />AIR → LAMPS → CATALOGUE → ACCESS</p>}{s.rubbingRead && <p className="phone-progress">RECOVERED NAMEPLATE<br />ROOM 740{s.run.roomDigit}</p>}<p className="phone-progress">RECORDS {ROMAN.map((roman, id) => `${roman} ${collected.includes(id) ? 'SAVED' : '—'}`).join(' · ')}</p></div>}
        <button className="phone-light" onClick={() => useGame.setState({ flashlight: !s.flashlight })} aria-pressed={s.flashlight}><span className={s.flashlight ? 'lit' : ''}>●</span> FLASHLIGHT {s.flashlight ? 'ON' : 'OFF'} <kbd>F</kbd></button>
        <div className="phone-danger-meter" role="meter" aria-label="Nearby danger while the phone is open" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.threat * 100)}><span style={{ width: `${Math.round(s.threat * 100)}%` }} /></div>
        <div className="phone-warning"><i />{s.threat > .7 ? 'TOO CLOSE — CLOSE THE PHONE' : s.threat > .4 ? 'FOOTSTEPS NEAR — PUT IT AWAY' : 'PHONE OPEN / IT CAN MOVE'}</div>
        <div className="phone-home" />
      </div>
    </div>
    <button className="phone-close-hint" onClick={s.togglePhone}><kbd>Q</kbd> PUT IT AWAY. MAKE IT STOP.</button>
    <button className="phone-ui-toggle" onClick={() => { if (runtime.phoneUi) { runtime.phoneUi = false; runtime.lock?.() } else { runtime.phoneUi = true; runtime.unlock?.() } }}><kbd>X</kbd> {runtime.phoneUi ? 'RETURN TO LOOK' : 'USE PHONE CONTROLS'}</button>
  </aside>
}
