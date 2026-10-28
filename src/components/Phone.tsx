import { useEffect, useState } from 'react'
import { ANCHORS, FLOOR_NAMES, FLOORS, ROOM, type Floor } from '../game/world'
import { act, contextualHint, currentLandmark, hintLevel, messages, objective, runtime, useGame, type PhoneTab } from '../game/store'

const landmarks = {
  2: [
    { label: 'MAIN ENTRANCE', point: ANCHORS.entrance, known: () => true },
    { label: 'INFO DESK', point: ANCHORS.directory, known: () => true },
    { label: 'SERVICE NOTICE', point: ANCHORS.powerNotice, known: (s: ReturnType<typeof useGame.getState>) => s.doorsTried },
    { label: 'POWER', point: ANCHORS.power, known: (s: ReturnType<typeof useGame.getState>) => s.powerNoticeRead },
  ],
  3: [
    { label: 'EVENT BOARD', point: ANCHORS.eventBoard, known: () => true },
    { label: 'BADGE LOAN', point: ANCHORS.badge, known: (s: ReturnType<typeof useGame.getState>) => s.boardRead },
  ],
  4: [
    { label: 'EXIT RELEASE', point: ANCHORS.release, known: () => true },
  ],
}

export function FloorMap({ large = false }: { large?: boolean }) {
  const s = useGame()
  const [floor, setFloor] = useState<Floor>(s.floor)
  useEffect(() => setFloor(s.floor), [s.floor])
  const selected: Floor = s.discovered.includes(floor) ? floor : s.floor
  const target = currentLandmark(s)
  return <div className={`map-frame ${large ? 'large' : ''}`}>
    <div className="map-compass">N ↑ <span>FLOOR {selected} · {FLOOR_NAMES[selected]}</span> ↓ S</div>
    <nav className="map-floor-selector" aria-label="Discovered floors">{FLOORS.filter(f => s.discovered.includes(f)).map(f => <button type="button" key={f} className={selected === f ? 'selected' : ''} aria-pressed={selected === f} onClick={() => setFloor(f)}>FLOOR {f}</button>)}</nav>
    <svg className={`floor-map ${large ? 'large' : ''}`} viewBox="-25 -25 50 50" role="img" aria-label={`Floor ${selected} map: entrance, atrium, stairs, discovered locations${selected === s.floor ? ', and your current position' : ''}. The figure is not shown.`}>
      <rect x="-22" y="-22" width={ROOM.w} height={ROOM.d} fill="#19291f" stroke="#b5c5a7" strokeWidth=".5" />
      {selected === 2 ? <>
        <rect x="-8" y="-9" width="16" height="18" rx="8" fill="#344c3b" stroke="#91a487" strokeWidth=".4" />
        <text x="0" y="0" textAnchor="middle" className="map-zone">MAIN ATRIUM</text>
        <path d="M-20 -20h16m8 0h16" stroke="#a88772" strokeWidth="1" />
        <text x="0" y="-16" textAnchor="middle" className="map-small">DINING COUNTERS</text>
        <text x="0" y="19" textAnchor="middle" className="map-small">MAIN DOORS</text>
        <circle cx="-6" cy="3" r="2.5" fill="#963d36" /><circle cx="6" cy="-5" r="2.5" fill="#963d36" />
      </> : <>
        <rect x="-9" y="-10" width="18" height="20" fill="#101a15" stroke="#afd0b9" strokeWidth=".65" />
        <text x="0" y="-1" textAnchor="middle" className="map-zone">OPEN TO</text><text x="0" y="2" textAnchor="middle" className="map-zone">ATRIUM BELOW</text>
        <text x="0" y="-16" textAnchor="middle" className="map-small">{selected === 3 ? 'BALLROOM CORRIDOR' : 'STUDENT ORGANIZATIONS'}</text>
      </>}
      {(selected === 2 || selected === 3) && <g><path d="M14.3 -3h3.4v14h-3.4z" fill="#576c56" stroke="#d2dbc5" strokeWidth=".35" /><circle cx="16" cy={selected === 2 ? 12 : -4} r="1.1" fill="#d8c293" /><text x="16" y={selected === 2 ? 16 : -7} textAnchor="middle" className="map-stair">STAIRS {selected === 2 ? '↑ 3' : '↓ 2'}</text></g>}
      {(selected === 3 || selected === 4) && <g><path d="M-17.7 -11h3.4V3h-3.4z" fill="#576c56" stroke="#d2dbc5" strokeWidth=".35" /><circle cx="-16" cy={selected === 3 ? -12 : 4} r="1.1" fill="#d8c293" /><text x="-16" y={selected === 3 ? -15 : 8} textAnchor="middle" className="map-stair">STAIRS {selected === 3 ? '↑ 4' : '↓ 3'}</text></g>}
      {landmarks[selected].filter(item => item.known(s)).map(({ label, point }) => <g key={label}><circle cx={point.x} cy={point.z} r=".85" fill="#e0b383" stroke="#1a271b" strokeWidth=".3" /><text x={point.x} y={point.z - 1.7} className="map-landmark" textAnchor="middle">{label}</text></g>)}
      {target?.floor === selected && <circle cx={target.point.x} cy={target.point.z} r="1.7" fill="none" stroke="#f4d394" strokeWidth=".55" />}
      {selected === s.floor && <g><circle cx={runtime.player.x} cy={runtime.player.z} r="1.1" fill="#daf8d2" stroke="#122019" strokeWidth=".4" /><path d={`M${runtime.player.x} ${runtime.player.z}l${runtime.direction.x * 2.8} ${runtime.direction.z * 2.8}`} stroke="#e6ffe0" strokeWidth=".65" /></g>}
    </svg>
    <div className="map-legend"><b>● YOU (CURRENT FLOOR ONLY)</b><b>◎ NEXT KNOWN PLACE</b></div>
    <p className="map-note">FLOOR {selected} · {FLOOR_NAMES[selected]}. {selected === 2 ? 'Entrance and information desk on the south side.' : selected === 3 ? 'The balcony circles an open atrium; the event board is by the ballroom.' : 'Organization corridor and fictional exit release terminal.'}</p>
  </div>
}

export function Phone() {
  const s = useGame()
  if (s.phase !== 'playing') return null
  const [task, context] = objective(s)
  const level = hintLevel(s)
  const inbox = messages(s)
  const setTab = (tab: PhoneTab) => useGame.setState({ tab })
  const close = () => { const usingControls = runtime.phoneUi; s.togglePhone(); if (usingControls) runtime.lock?.() }
  return <aside className={`phone ${s.phone ? 'phone-visible' : 'phone-lowered'} ${s.threat > .55 ? 'phone-danger' : ''}`} aria-label="In-game phone" aria-hidden={!s.phone || !!s.panel} inert={!s.phone || !!s.panel} onKeyDown={event => { if (event.code === 'KeyQ' && !event.repeat) { event.preventDefault(); event.stopPropagation(); close() } }}>
    <div className="phone-hardware"><i className="phone-camera" />
      <div className="phone-screen">
        <div className="phone-status"><span>2:13</span><span>NO SERVICE <b>▰</b></span></div>
        <div className="phone-brand">OFFLINE / PERSONAL DEVICE</div>
        <nav className="phone-tabs" aria-label="Phone sections">{(['notes', 'map', 'objectives'] as PhoneTab[]).map(tab => <button key={tab} type="button" aria-current={s.tab === tab ? 'page' : undefined} className={s.tab === tab ? 'active' : ''} onClick={() => setTab(tab)}>{tab === 'notes' ? 'MESSAGES' : tab.toUpperCase()}</button>)}</nav>
        {s.tab === 'notes' ? <div className="phone-notes">
          <span className="phone-act">SAVED / MESSAGES & NOTES</span>
          {inbox.map((message, i) => <article className="phone-message" key={`${i}-${message.from}`}><span>FROM: {message.from}</span><p>{message.text}</p></article>)}
          {s.powerNoticeRead && <article className="phone-message"><span>SAVED / SERVICE NOTICE · FLOOR 2</span><p>ISOLATE DINING → PRIME BATTERY → CONNECT ATRIUM. Labels matter, not switch positions.</p></article>}
          {s.boardRead && <article className="phone-message important"><span>SAVED / EVENT BOARD · FLOOR 3</span><p>Night Owl event venue: <strong>{s.run.venue}</strong>. The badge loan box sorts badges by event venue.</p></article>}
          {s.badge && <article className="phone-message"><span>SAVED / OVERRIDE BADGE</span><p>Take the security override badge to the fictional emergency control station on Floor 4.</p></article>}
          {s.authorized && <article className="phone-message important"><span>SAVED / EXIT RELEASE</span><p>MAIN ENTRANCE UNLOCKED. RETURN TO FLOOR 2.</p></article>}
          <p className="phone-tip">Messages and discovered instructions stay here. Close the phone to stop the figure.</p>
        </div> : s.tab === 'map' ? <div className="phone-map"><FloorMap /><small>The figure is never shown. Floor tabs appear only after you visit them.</small></div> : <div className="phone-objectives"><span className="phone-act">{act(s)} · FLOOR {s.floor}</span><h3>{task}</h3><p>{context}</p><p className="phone-progress">WHY: THE FICTIONAL EMERGENCY LOCKDOWN WON’T OPEN THE MAIN DOORS UNTIL BACKUP POWER, A SECURITY OVERRIDE BADGE, AND EXIT RELEASE ARE COMPLETE.</p><button className="phone-hint-toggle" onClick={() => useGame.setState({ hint: !s.hint })} aria-pressed={s.hint}>{s.hint ? 'HIDE EXTRA GUIDANCE' : 'NEED A HINT?'} <kbd>?</kbd></button>{(s.hint || level > 0) && <p className="phone-hint">{contextualHint(s)}</p>}<p className="phone-progress">POWER {s.power ? 'RESTORED' : 'OFFLINE'} · BADGE {s.badge ? 'RECOVERED' : 'MISSING'} · EXIT {s.authorized ? 'RELEASED' : 'LOCKED'}</p></div>}
        <button className="phone-light" onClick={() => useGame.setState({ flashlight: !s.flashlight })} aria-pressed={s.flashlight}><span className={s.flashlight ? 'lit' : ''}>●</span> FLASHLIGHT {s.flashlight ? 'ON' : 'OFF'} <kbd>F</kbd></button>
        <div className="phone-danger-meter" role="meter" aria-label="Nearby danger while the phone is open" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.threat * 100)}><span style={{ width: `${Math.round(s.threat * 100)}%` }} /></div>
        <div className="phone-warning"><i />{s.threat > .7 ? 'TOO CLOSE — CLOSE THE PHONE' : s.threat > .4 ? 'FOOTSTEPS NEAR — PUT IT AWAY' : 'PHONE OPEN / IT CAN MOVE'}</div>
        <div className="phone-home" />
      </div>
    </div>
    <button className="phone-close-hint" onClick={close}><kbd>Q</kbd> PUT IT AWAY. MAKE IT STOP.</button>
    <button className="phone-ui-toggle" onClick={() => { if (runtime.phoneUi) { runtime.phoneUi = false; runtime.lock?.() } else { runtime.phoneUi = true; runtime.unlock?.() } }}><kbd>X</kbd> {runtime.phoneUi ? 'RETURN TO LOOK' : 'USE PHONE CONTROLS'}</button>
  </aside>
}
