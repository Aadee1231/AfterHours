import { Component, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Scene } from './game/Scene'
import { Phone } from './components/Phone'
import { Keypad } from './components/Keypad'
import { PuzzlePanel } from './components/PuzzlePanel'
import { audio } from './game/audio'
import { act, formatTime, objective, promptText, runtime, useGame } from './game/store'

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

function GameSettings() {
  const s = useGame()
  return <div className="game-settings">
    <button onClick={s.toggleFlashing} aria-pressed={s.reducedFlashing}>REDUCED FLASHING <b>{s.reducedFlashing ? 'ON' : 'OFF'}</b></button>
    <label>DIFFICULTY <select aria-label="Difficulty" value={s.difficulty} onChange={e => useGame.setState({ difficulty: e.target.value === 'story' ? 'story' : 'standard' })}><option value="standard">Standard</option><option value="story">Story · gentler pursuit</option></select></label>
  </div>
}

function Tutorial({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><section className="tutorial panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <div className="eyebrow">READ THIS BEFORE YOU LOOK DOWN.</div><h2 id="tutorial-title">Your light.<br />Its invitation.</h2>
    <div className="tutorial-rule"><span className="rule-number">01</span><div><h3>Open the phone. It moves.</h3><p>Your phone gives you a brighter flashlight, a rough map, and your clue log. It also lets something in the stacks approach you.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">02</span><div><h3>Close the phone. It freezes.</h3><p>Use short glances. Listen for heavy footsteps. If it gets close, put the phone away and walk around it. Don’t touch the figure.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">03</span><div><h3>A catalogue. A circuit. A room.</h3><p>Check your laptop, then try the North Tower stairs. Follow your objective log through three zones. Interpret four saved records, return to the first stair door, then unlock the South Tower access panel.</p></div></div>
    <div className="controls-grid"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>MOUSE</kbd> LOOK</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>E</kbd> INTERACT</span><span><kbd>Q</kbd> PHONE / CLOSE PANEL</span><span><kbd>TAB</kbd> PHONE TABS</span><span><kbd>X</kbd> USE PHONE CONTROLS</span><span><kbd>← →</kbd> RECORDS</span><span><kbd>F</kbd> PHONE LIGHT</span><span><kbd>?</kbd> CONTEXTUAL HINT</span><span><kbd>ESC</kbd> CLOSE PANEL / PAUSE</span><span><kbd>H</kbd> CAPTURE MODE</span></div>
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
      {mobile ? <div className="desktop-notice"><strong>THIS FLOOR NEEDS A KEYBOARD.</strong><p>Play on a desktop or laptop with a mouse.<br />Touch controls aren’t available.</p></div> : <button className="start-button" onClick={() => s.start()} disabled={!ready}><span>{ready ? 'ENTER THE LIBRARY' : 'OPENING THE STACKS…'}</span><b>↗</b></button>}
      <div className="title-actions"><button className="text-button" onClick={() => useGame.setState({ help: true })}>HOW TO SURVIVE <span>+</span></button><SoundSettings compact /></div>
      <GameSettings />
      <div className="title-duration">FIRST-PERSON HORROR <i /> THREE ACTS <i /> HEADPHONES ON</div>
    </div>
    <div className="title-side"><div className="side-number">07</div><p>BOOKSTACKS<br />QUIET STUDY<br />NO WAY DOWN</p><span className="side-rule" /><small>EVERY TIME YOU CHECK YOUR PHONE,<br />IT GETS CLOSER.</small></div>
    <footer className="title-footer"><span>AN UNOFFICIAL FAN PROJECT.<br />NO UNIVERSITY AFFILIATION. NO REAL FLOOR PLANS.</span><span>DON’T STAY TOO LATE. <span className="tiny-cross">+</span></span></footer>
  </section>
}

function Intro() {
  const s = useGame()
  return <div className="modal-backdrop intro-backdrop"><section className="intro panel">
    <div className="eyebrow">02:13 AM / THE SEVENTH FLOOR</div><h2>You only meant<br />to close your eyes.</h2>
    <p>The last thing you remember is a page you couldn’t finish.<br />Your laptop is still awake. Both clocks say 02:13.</p><p>North Tower. Central stacks. South Tower.<br />Three parts of a familiar library. A stairwell that remembers you.</p>
    <div className="intro-mechanic"><div><span className="mechanic-dot moving" /><b>PHONE OPEN</b><span>IT MOVES.</span></div><div><span className="mechanic-dot" /><b>PHONE CLOSED</b><span>IT STOPS.</span></div></div>
    <p className="intro-task">Start with your laptop. Try the stairs.<br />A borrowed book, a dead circuit, and an erased nameplate will matter before the night is over.</p>
    <div className="intro-keys"><kbd>WASD</kbd> MOVE <kbd>MOUSE</kbd> LOOK <kbd>E</kbd> INSPECT <kbd>Q</kbd> PHONE</div>
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
    <button className="menu-row" onClick={() => s.start()}>Restart the night <span>↺</span></button>
    <button className="menu-row" onClick={() => { s.closePanel(); s.closeKeypad(); useGame.setState({ phase: 'title', phone: false }); audio.ambience(false) }}>Return to title <span>↗</span></button>
    <GameSettings />
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
    <div className="result-top eyebrow">{escaped ? 'SOUTH TOWER / ACCESS GRANTED' : 'CONNECTION LOST / FLOOR 07'}</div>
    <div className="result-body"><div className="result-symbol">{escaped ? '↗' : '×'}</div>
      <h2>{escaped ? <>YOU MADE<br />IT OUT<span>.</span></> : <>IT FOUND<br />YOU<span>.</span></>}</h2>
      <p>{escaped ? 'Cold air. A door that opens. A clock that finally moves.' : 'You looked down for a little too long.'}</p>
      <div className="result-stats"><div><span>{escaped ? 'ESCAPE TIME' : 'TIME SURVIVED'}</span><b>{formatTime(s.elapsed)}</b></div><div><span>ATTEMPTS</span><b>{s.attempts.toString().padStart(2, '0')}</b></div>{s.best > 0 && <div><span>PERSONAL BEST</span><b>{formatTime(s.best)}</b></div>}</div>
      {!escaped && <p className="death-tip">Close your phone when you hear footsteps.<br />It can’t follow. You can move.</p>}
      <button className="primary-button" onClick={() => s.start()}>{escaped ? 'ONE MORE NIGHT' : 'TRY AGAIN'} <span>↺</span></button>
      {escaped && <button className="text-button" onClick={() => void copy()}>{copied || 'COPY RESULTS'} <span>↗</span></button>}
      <button className="text-button muted-button" onClick={() => useGame.setState({ phase: 'title' })}>RETURN TO TITLE</button>
    </div><footer>{escaped ? 'YOU WILL NEVER STUDY HERE AGAIN.' : 'THE LIBRARY IS STILL OPEN FOR YOU.'}</footer>
  </section>
}

function HUD({ locked }: { locked: boolean }) {
  const s = useGame()
  if (s.phase !== 'playing') return null
  const [currentObjective, hint] = objective(s)
  const prompt = promptText(s)
  const moving = s.phone
  const overlay = s.keypad || s.panel !== null
  const hintVisible = s.hint || s.difficulty === 'story'
  return <div className={`hud ${s.phone ? 'phone-raised' : ''} ${s.capture ? 'capture-mode' : ''}`}>
    <header className="hud-top nonessential"><div className="hud-objective"><div className="eyebrow">D. H. HILL / FLOOR 07 · {act(s)}</div><h2>{currentObjective}</h2>{s.onboarding === 0 && <p className="onboarding-controls">WASD move · mouse look · E inspect</p>}{hintVisible && <p className="contextual-hint">{hint}</p>}<button className="hint-toggle" aria-pressed={s.hint} onClick={() => useGame.setState({ hint: !s.hint })}><kbd>?</kbd> {s.hint ? 'HIDE HINT' : 'SHOW HINT'}</button></div>
      <div className="hud-records"><span>RECORDS</span><div>{['I', 'II', 'III', 'IV'].map((roman, id) => <i key={roman} className={s.clues.includes(id) ? 'found' : ''}>{roman}</i>)}</div><small>{formatTime(s.elapsed)}</small></div>
    </header>
    <div className={`entity-status ${moving ? 'active' : ''}`}><i />{moving ? 'PHONE OPEN / IT IS MOVING' : 'PHONE CLOSED / IT IS STILL'}</div>
    {!overlay && <><div className="crosshair" />{prompt && <div className="interaction" role="status"><kbd>{typeof s.prompt === 'number' && !s.phone ? 'Q' : 'E'}</kbd><span>{prompt}</span>{s.prompt === 'rubbing' && s.power && !s.rubbingRead && <span className="exposure-progress">LIGHT EXPOSURE {Math.round(s.exposure / 6 * 100)}%</span>}</div>}</>}
    {s.notice && runtime.time < s.noticeUntil && !overlay && <div className="notice nonessential" key={s.notice}>{s.notice}</div>}
    <div className="hud-bottom nonessential"><div><kbd>Q</kbd> {s.phone ? 'CLOSE PHONE' : 'OPEN PHONE'}<span className="hud-divider" /> <kbd>E</kbd> INTERACT</div><div><kbd>SHIFT</kbd> SPRINT <span className="hud-divider" /><kbd>ESC</kbd> PAUSE <span className="hud-divider" /><kbd>H</kbd> CAPTURE</div></div>
    {!locked && !overlay && !(s.phone && runtime.phoneUi) && <button id="look-capture" className="capture-pointer" onClick={() => runtime.lock?.()}><span>CLICK TO LOOK AROUND</span><small>WASD move · Q phone · E interact · Esc pause</small></button>}
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
  return <main className={`app phase-${s.phase} ${s.reducedFlashing ? 'reduced-flashing' : ''} ${s.panel ? 'panel-open' : ''}`} style={{ '--danger': s.phone ? s.threat : 0 } as CSSProperties}>
    <div className="world"><GameBoundary><Scene onLocked={setLocked} onReady={onReady} /></GameBoundary></div>
    <div className="vignette" /><div className="grain" /><div className="danger-wash" />
    {s.phase === 'title' && <Title ready={ready} mobile={mobile} />}
    {s.phase === 'intro' && <Intro />}
    <HUD locked={locked} /><Phone /><Keypad /><PuzzlePanel />
    {s.phase === 'playing' && runtime.time < s.loopUntil && <div className="loop-blackout" role="status"><span>FLOOR 07</span><p>The stairs remember.</p></div>}
    {s.phase === 'scare' && <div className="scare-cinematic" role="status" aria-label="The figure has caught you"><div className="scare-figure"><i /><b /></div><div className="scare-caption"><span>NO SERVICE</span><p>You looked down.</p></div></div>}
    {s.phase === 'paused' && <Pause />}
    {(s.phase === 'caught' || s.phase === 'escaped') && <Results />}
    {s.help && <Tutorial onClose={() => useGame.setState({ help: false })} />}
    {(s.phase === 'title' || s.phase === 'paused') && <div className="fullscreen-control"><button onClick={() => void fullscreen()} aria-label="Toggle fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>{fullscreenError && <small role="status">{fullscreenError}</small>}</div>}
  </main>
}
