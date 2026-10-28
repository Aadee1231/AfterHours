import { Component, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Scene } from './game/Scene'
import { Phone } from './components/Phone'
import { Keypad } from './components/Keypad'
import { CLUES } from './game/world'
import { audio } from './game/audio'
import { formatTime, runtime, useGame } from './game/store'

function SoundSettings({ compact = false }: { compact?: boolean }) {
  const s = useGame()
  return <div className={`sound-settings ${compact ? 'compact' : ''}`}>
    <button className="sound-toggle" onClick={() => { audio.unlock(); s.toggleMute() }} aria-label={s.muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={!s.muted}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" />{s.muted ? <path d="m17 9 5 6m0-6-5 6" /> : <><path d="M16 8c3 2 3 6 0 8" /><path d="M19 5c5 4 5 10 0 14" /></>}</svg>
      <span>SOUND {s.muted ? 'OFF' : 'ON'}</span>
    </button>
    {!compact && <input aria-label="Sound volume" type="range" min="0" max="1" step=".01" value={s.volume} onChange={e => s.setVolume(Number(e.target.value))} />}
  </div>
}

function Tutorial({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><section className="tutorial panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <div className="eyebrow">READ THIS BEFORE YOU LOOK DOWN.</div><h2 id="tutorial-title">Your light.<br />Its invitation.</h2>
    <div className="tutorial-rule"><span className="rule-number">01</span><div><h3>Open the phone. It moves.</h3><p>Your phone gives you a brighter flashlight, a rough map, and your clue log. It also lets something in the stacks approach you.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">02</span><div><h3>Close the phone. It freezes.</h3><p>Use short glances. Listen for heavy footsteps. If it gets close, put the phone away and walk around it. Don’t touch the figure.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">03</span><div><h3>Four records. One exit.</h3><p>Read the marked papers with <kbd>Q</kbd> then <kbd>E</kbd>. Each saves a numbered digit. Enter them in order at the north emergency stairwell.</p></div></div>
    <div className="controls-grid"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>MOUSE</kbd> LOOK</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>E</kbd> INTERACT</span><span><kbd>Q</kbd> PHONE</span><span><kbd>TAB</kbd> NOTES / MAP</span><span><kbd>← →</kbd> RECORDS</span><span><kbd>F</kbd> PHONE LIGHT</span><span><kbd>ESC</kbd> PAUSE</span><span><kbd>H</kbd> CAPTURE MODE</span></div>
    <p className="advisory">Headphones recommended. Contains flashing lights, sudden sounds, and sustained dread.</p>
    <button className="primary-button" onClick={onClose}>UNDERSTOOD <span>→</span></button>
  </section></div>
}

function Title({ ready, mobile }: { ready: boolean; mobile: boolean }) {
  const s = useGame()
  return <section className="title-screen">
    <div className="title-top"><span className="wordmark">AN AFTER-MIDNIGHT EXPERIENCE</span><span className="title-location">RALEIGH, NORTH CAROLINA <i /> FICTIONALIZED</span></div>
    <div className="title-content"><div className="eyebrow title-eyebrow"><span className="status-dot" /> D. H. HILL / FLOOR 7</div>
      <h1>AFTER<br /><span>HOURS</span><i>.</i></h1>
      <div className="title-time"><span>02</span><b>:</b><span>13</span><small>AM<br />NO SIGNAL</small></div>
      <p className="tagline">The library is closed.<br />You’re still inside.</p>
      {mobile ? <div className="desktop-notice"><strong>THIS FLOOR NEEDS A KEYBOARD.</strong><p>Play on a desktop or laptop with a mouse.<br />Touch controls aren’t available.</p></div> : <button className="start-button" onClick={s.start} disabled={!ready}><span>{ready ? 'ENTER THE LIBRARY' : 'OPENING THE STACKS…'}</span><b>↗</b></button>}
      <div className="title-actions"><button className="text-button" onClick={() => useGame.setState({ help: true })}>HOW TO SURVIVE <span>+</span></button><SoundSettings compact /></div>
      <div className="title-duration">FIRST-PERSON HORROR <i /> A SHORT NIGHTMARE <i /> HEADPHONES ON</div>
    </div>
    <div className="title-side"><div className="side-number">07</div><p>BOOKSTACKS<br />QUIET STUDY<br />NO WAY DOWN</p><span className="side-rule" /><small>EVERY TIME YOU CHECK YOUR PHONE,<br />IT GETS CLOSER.</small></div>
    <footer className="title-footer"><span>AN UNOFFICIAL FAN PROJECT.<br />NO UNIVERSITY AFFILIATION. NO REAL FLOOR PLANS.</span><span>DON’T STAY TOO LATE. <span className="tiny-cross">+</span></span></footer>
  </section>
}

function Intro() {
  const s = useGame()
  return <div className="modal-backdrop intro-backdrop"><section className="intro panel">
    <div className="eyebrow">02:13 AM / THE SEVENTH FLOOR</div><h2>You only meant<br />to close your eyes.</h2>
    <p>The last thing you remember is a page you couldn’t finish.<br />Now the elevators are dead. Every clock says 2:13.</p><p>On your desk, a checkout slip.<br />In the stacks, something that wasn’t there before.</p>
    <div className="intro-mechanic"><div><span className="mechanic-dot moving" /><b>PHONE OPEN</b><span>IT MOVES.</span></div><div><span className="mechanic-dot" /><b>PHONE CLOSED</b><span>IT STOPS.</span></div></div>
    <p className="intro-task">Find four marked records. Read them with your phone.<br />Their digits unlock the north emergency stairwell.</p>
    <div className="intro-keys"><kbd>WASD</kbd> MOVE <kbd>Q</kbd> PHONE <kbd>E</kbd> READ <kbd>ESC</kbd> PAUSE</div>
    <button className="primary-button" onClick={() => { s.enter(); runtime.lock?.() }}>WAKE UP <span>→</span></button>
    <button className="text-button" onClick={() => useGame.setState({ help: true })}>FULL CONTROLS & SURVIVAL GUIDE</button>
  </section></div>
}

function Pause() {
  const s = useGame()
  return <div className="modal-backdrop"><section className="pause-panel panel">
    <div className="eyebrow">THE NIGHT CAN WAIT.</div><h2>Take a breath.</h2><p>Time and the figure are paused.</p>
    <div className="pause-stats"><span>RECORDS <b>{s.clues.length} / 4</b></span><span>TIME <b>{formatTime(s.elapsed)}</b></span></div>
    <button className="primary-button" onClick={() => { s.resume(); runtime.lock?.() }}>BACK INTO THE STACKS <span>→</span></button>
    <button className="menu-row" onClick={() => useGame.setState({ help: true })}>How to survive <span>↗</span></button>
    <button className="menu-row" onClick={s.start}>Restart the night <span>↺</span></button>
    <button className="menu-row" onClick={() => { useGame.setState({ phase: 'title', phone: false, keypad: false }); audio.ambience(false) }}>Return to title <span>↗</span></button>
    <SoundSettings />
  </section></div>
}

function Results() {
  const s = useGame(), [copied, setCopied] = useState('')
  const escaped = s.phase === 'escaped'
  if (!escaped && s.phase !== 'caught') return null
  const copy = async () => {
    const result = `AFTER HOURS / FLOOR 7\nI escaped in ${formatTime(s.elapsed)}.\nAttempt ${s.attempts} · Best ${formatTime(s.best)}\nDon't stay too late.`
    try { await navigator.clipboard.writeText(result); setCopied('COPIED') } catch { setCopied('COPY UNAVAILABLE — SCREENSHOT THIS RESULT') }
  }
  return <section className={`results ${escaped ? 'escaped' : 'caught'}`}>
    <div className="result-top eyebrow">{escaped ? 'EMERGENCY STAIRWELL / ACCESS GRANTED' : 'CONNECTION LOST / FLOOR 07'}</div>
    <div className="result-body"><div className="result-symbol">{escaped ? '↗' : '×'}</div>
      <h2>{escaped ? <>YOU MADE<br />IT OUT<span>.</span></> : <>IT FOUND<br />YOU<span>.</span></>}</h2>
      <p>{escaped ? 'Cold air. A door that opens. A clock that finally moves.' : 'You looked down for a little too long.'}</p>
      <div className="result-stats"><div><span>{escaped ? 'ESCAPE TIME' : 'TIME SURVIVED'}</span><b>{formatTime(s.elapsed)}</b></div><div><span>ATTEMPTS</span><b>{s.attempts.toString().padStart(2, '0')}</b></div>{s.best > 0 && <div><span>PERSONAL BEST</span><b>{formatTime(s.best)}</b></div>}</div>
      {!escaped && <p className="death-tip">Close your phone when you hear footsteps.<br />It can’t follow. You can move.</p>}
      <button className="primary-button" onClick={s.start}>{escaped ? 'ONE MORE NIGHT' : 'TRY AGAIN'} <span>↺</span></button>
      {escaped && <button className="text-button" onClick={() => void copy()}>{copied || 'COPY RESULTS'} <span>↗</span></button>}
      <button className="text-button muted-button" onClick={() => useGame.setState({ phase: 'title' })}>RETURN TO TITLE</button>
    </div><footer>{escaped ? 'YOU WILL NEVER STUDY HERE AGAIN.' : 'THE LIBRARY IS STILL OPEN FOR YOU.'}</footer>
  </section>
}

function HUD({ locked }: { locked: boolean }) {
  const s = useGame()
  if (s.phase !== 'playing') return null
  const prompt = s.prompt === 'exit' ? 'Use stairwell keypad' : s.prompt !== null ? s.phone ? `Read ${CLUES[s.prompt].title.toLowerCase()}` : 'Open phone to read this record' : null
  const moving = s.phone
  return <div className={`hud ${s.phone ? 'phone-raised' : ''} ${s.capture ? 'capture-mode' : ''}`}>
    <header className="hud-top nonessential"><div><div className="eyebrow">D. H. HILL / FLOOR 07</div><h2>{s.clues.length === 4 ? 'Reach the emergency stairwell.' : 'Find a way out.'}</h2><p>{s.clues.length === 4 ? 'North wall. Four digits. Don’t look back.' : 'Four records. One emergency stairwell.'}</p></div>
      <div className="hud-records"><span>RECORDS</span><div>{CLUES.map(c => <i key={c.id} className={s.clues.includes(c.id) ? 'found' : ''}>{['I', 'II', 'III', 'IV'][c.id]}</i>)}</div><small>{formatTime(s.elapsed)}</small></div>
    </header>
    <div className={`entity-status ${moving ? 'active' : ''}`}><i />{moving ? 'PHONE OPEN / IT IS MOVING' : 'PHONE CLOSED / IT IS STILL'}</div>
    {!s.keypad && <><div className="crosshair" />{prompt && <div className="interaction" role="status"><kbd>{s.prompt !== 'exit' && !s.phone ? 'Q' : 'E'}</kbd><span>{prompt}</span></div>}</>}
    {s.notice && runtime.time < s.noticeUntil && !s.keypad && <div className="notice nonessential" key={s.notice}>{s.notice}</div>}
    <div className="hud-bottom nonessential"><div><kbd>Q</kbd> {s.phone ? 'CLOSE PHONE' : 'OPEN PHONE'}<span className="hud-divider" /> <kbd>E</kbd> INTERACT</div><div><kbd>SHIFT</kbd> SPRINT <span className="hud-divider" /><kbd>ESC</kbd> PAUSE <span className="hud-divider" /><kbd>H</kbd> CAPTURE</div></div>
    {!locked && !s.keypad && <button id="look-capture" className="capture-pointer" onClick={() => runtime.lock?.()}><span>CLICK TO LOOK AROUND</span><small>WASD move · Q phone · E interact · Esc pause</small></button>}
  </div>
}

class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="fatal-screen"><div className="eyebrow">AFTER HOURS</div><h2>This window won’t open.</h2><p>A WebGL-capable desktop browser is required. Enable hardware acceleration, then reload.</p><button onClick={() => location.reload()}>Try again</button></div>
    return this.props.children
  }
}

export default function App() {
  const s = useGame(), [locked, setLocked] = useState(false), [ready, setReady] = useState(false), [fullscreenError, setFullscreenError] = useState('')
  const [mobile] = useState(() => matchMedia('(pointer: coarse)').matches && innerWidth < 1024)
  const onReady = useCallback(() => setReady(true), [])
  useEffect(() => { audio.configure(s.volume, s.muted) }, [s.volume, s.muted])
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); setFullscreenError('') } catch { setFullscreenError('Fullscreen is unavailable in this window. Open the game in its own tab.') }
  }
  return <main className={`app phase-${s.phase}`} style={{ '--danger': s.phone ? s.threat : 0 } as CSSProperties}>
    <div className="world"><GameBoundary><Scene onLocked={setLocked} onReady={onReady} /></GameBoundary></div>
    <div className="vignette" /><div className="grain" /><div className="danger-wash" />
    {s.phase === 'title' && <Title ready={ready} mobile={mobile} />}
    {s.phase === 'intro' && <Intro />}
    <HUD locked={locked} /><Phone /><Keypad />
    {s.phase === 'paused' && <Pause />}
    {(s.phase === 'caught' || s.phase === 'escaped') && <Results />}
    {s.help && <Tutorial onClose={() => useGame.setState({ help: false })} />}
    {(s.phase === 'title' || s.phase === 'paused') && <div className="fullscreen-control"><button onClick={() => void fullscreen()} aria-label="Toggle fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>{fullscreenError && <small role="status">{fullscreenError}</small>}</div>}
  </main>
}
