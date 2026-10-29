import { Component, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Scene } from './game/Scene'
import { Phone } from './components/Phone'
import { PuzzlePanel } from './components/PuzzlePanel'
import { audio } from './game/audio'
import { act, contextualHint, formatTime, hintLevel, objective, promptText, runtime, useGame } from './game/store'
import { FLOOR_NAMES } from './game/world'

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

function GameSettings({ capture = false }: { capture?: boolean }) {
  const s = useGame()
  return <div className="game-settings">
    <label>DIFFICULTY <select aria-label="Difficulty" value={s.difficulty} onChange={e => useGame.setState({ difficulty: e.target.value === 'story' ? 'story' : 'standard' })}><option value="standard">Standard</option><option value="story">Story · gentler pursuit</option></select></label>
    <label>GRAPHICS <select aria-label="Graphics quality" value={s.graphics} onChange={e => s.setGraphics(e.target.value === 'high' ? 'high' : 'low')}><option value="low">Low · lighter rendering</option><option value="high">High · finer detail</option></select></label>
    <button onClick={s.toggleFlashing} aria-pressed={s.reducedFlashing}>REDUCED FLASHING <b>{s.reducedFlashing ? 'ON' : 'OFF'}</b></button>
    {capture && <button onClick={() => useGame.setState({ capture: !s.capture })} aria-pressed={s.capture}>CAPTURE MODE <b>{s.capture ? 'ON' : 'OFF'}</b> <kbd>H</kbd></button>}
  </div>
}

function Tutorial({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><section className="tutorial panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}>
    <div className="eyebrow">READ THIS BEFORE YOU LOOK DOWN.</div><h2 id="tutorial-title">Your light.<br />Its invitation.</h2>
    <div className="tutorial-rule"><span className="rule-number">01</span><div><h3>Open the phone. It moves.</h3><p>Your phone holds messages, a floor map, and your objective. Its flashlight reveals what the event board conceals. Something else is watching the light.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">02</span><div><h3>Close the phone. It freezes.</h3><p>Use short glances. Listen for heavy footsteps. Put the phone away to stop the figure, then move around it. Closing a panel puts the phone away, too.</p></div></div>
    <div className="tutorial-rule"><span className="rule-number">03</span><div><h3>One way out. Three floors.</h3><p>Try the main entrance first. Restore power, recover an override badge, authorize the doors, then return to the entrance. Chapter checkpoints let you retry without starting over.</p></div></div>
    <div className="controls-grid"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>MOUSE</kbd> LOOK</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>E</kbd> INTERACT</span><span><kbd>Q</kbd> PHONE / CLOSE PANEL</span><span><kbd>TAB</kbd> PHONE TABS</span><span><kbd>X</kbd> PHONE MOUSE / LOOK</span><span><kbd>F</kbd> PHONE LIGHT</span><span><kbd>?</kbd> OPTIONAL GUIDANCE</span><span><kbd>ESC</kbd> CLOSE PANEL / PAUSE</span><span><kbd>H</kbd> CAPTURE MODE</span></div>
    <p className="advisory">Headphones recommended. Sustained dread, sudden sounds, and lighting changes. Reduced flashing and Story Mode are available.</p>
    <button autoFocus className="primary-button" onClick={onClose}>UNDERSTOOD <span>→</span></button>
  </section></div>
}

function Title({ ready, mobile }: { ready: boolean; mobile: boolean }) {
  const s = useGame()
  return <section className="title-screen">
    <div className="title-top"><span className="wordmark">AN AFTER-MIDNIGHT EXPERIENCE</span><span className="title-location">RALEIGH, NORTH CAROLINA <i /> FICTIONALIZED</span></div>
    <div className="title-content"><div className="eyebrow title-eyebrow"><span className="status-dot" /> TALLEY STUDENT UNION</div>
      <h1>AFTER<br /><span>HOURS</span><i>.</i></h1>
      <div className="title-time"><span>2</span><b>:</b><span>13</span><small>AM<br />NO SIGNAL</small></div>
      <p className="tagline">The union is empty.<br />You’re not alone.</p>
      {mobile ? <div className="desktop-notice"><strong>THIS NIGHT NEEDS A KEYBOARD.</strong><p>Play on a desktop or laptop with a mouse.<br />Touch controls aren’t available.</p></div> : <button className="start-button" onClick={() => s.start()} disabled={!ready}><span>{ready ? 'ENTER TALLEY' : 'OPENING THE ATRIUM…'}</span><b>↗</b></button>}
      <div className="title-actions"><button className="text-button" onClick={() => useGame.setState({ help: true })}>HOW TO SURVIVE <span>+</span></button><SoundSettings compact /></div>
      <GameSettings />
      <div className="title-duration">FIRST-PERSON HORROR <i /> THREE CHAPTERS <i /> HEADPHONES ON</div>
    </div>
    <div className="title-side"><div className="side-number">02<span>—04</span></div><p>MAIN ATRIUM<br />BALLROOM LOUNGE<br />ONE LAST ANNOUNCEMENT</p><span className="side-rule" /><small>EVERY TIME YOU CHECK YOUR PHONE,<br />IT GETS CLOSER.</small></div>
    <footer className="title-footer"><span>UNOFFICIAL FICTION. NO UNIVERSITY AFFILIATION.<br />FICTIONAL LAYOUT AND EMERGENCY SYSTEM — NOT REAL SAFETY GUIDANCE.</span><span>DON’T STAY TOO LATE. <span className="tiny-cross">+</span></span></footer>
  </section>
}

function Intro() {
  const s = useGame()
  return <section className="intro-lower-third" aria-label="Opening cinematic">
    <div><div className="eyebrow">TALLEY STUDENT UNION / 2:13 AM</div><h2>You only meant to close your eyes.</h2><p>The closing announcement is playing. Everyone is gone.<br /><strong>Try the main entrance.</strong></p></div>
    <button className="text-button" onClick={() => { s.enter(); runtime.lock?.() }}>SKIP INTRO <span>→</span></button>
  </section>
}

function Pause() {
  const s = useGame()
  return <div className="modal-backdrop"><section className="pause-panel panel" role="dialog" aria-modal="true" aria-labelledby="pause-heading">
    <div className="eyebrow">THE NIGHT CAN WAIT.</div><h2 id="pause-heading">Take a breath.</h2><p>Time and the figure are paused.</p>
    <div className="pause-stats"><span>LOCATION <b>FLOOR {s.floor}</b></span><span>TIME <b>{formatTime(s.elapsed)}</b></span></div>
    <button autoFocus className="primary-button" onClick={() => { s.resume(); runtime.lock?.() }}>BACK INTO TALLEY <span>→</span></button>
    <button className="menu-row" onClick={() => useGame.setState({ help: true })}>Controls & survival guide <span>↗</span></button>
    <button className="menu-row" onClick={() => s.start()}>New run · restart from the beginning <span>↺</span></button>
    <button className="menu-row" onClick={() => { s.closePanel(); useGame.setState({ phase: 'title', phone: false }); audio.ambience(false) }}>Return to title <span>↗</span></button>
    <GameSettings capture />
    <SoundSettings />
  </section></div>
}
function Results() {
  const s = useGame(), [copied, setCopied] = useState('')
  const escaped = s.phase === 'escaped'
  if (!escaped && s.phase !== 'caught') return null
  const copy = async () => {
    const result = `AFTER HOURS / TALLEY STUDENT UNION\nI escaped in ${formatTime(s.elapsed)}.\nAttempt ${s.attempts} · Best ${formatTime(s.best)}\nDon't stay too late.`
    try { await navigator.clipboard.writeText(result); setCopied('COPIED') } catch { setCopied('COPY UNAVAILABLE — SCREENSHOT THIS RESULT') }
  }
  return <section className={`results ${escaped ? 'escaped' : 'caught'}`}>
    <div className="result-top eyebrow">{escaped ? 'MAIN ENTRANCE / RELEASE COMPLETE' : `CONNECTION LOST / FLOOR ${s.floor}`}</div>
    <div className="result-body"><div className="result-symbol">{escaped ? '↗' : '×'}</div>
      <h2>{escaped ? <>YOU MADE<br />IT OUT<span>.</span></> : <>IT FOUND<br />YOU<span>.</span></>}</h2>
      <p>{escaped ? 'Cold air. A door that opens. A clock that finally moves.' : 'You looked down for a little too long.'}</p>
      <div className="result-stats"><div><span>{escaped ? 'ESCAPE TIME' : 'TIME SURVIVED'}</span><b>{formatTime(s.elapsed)}</b></div><div><span>ATTEMPTS</span><b>{s.attempts.toString().padStart(2, '0')}</b></div>{s.best > 0 && <div><span>PERSONAL BEST</span><b>{formatTime(s.best)}</b></div>}</div>
      {!escaped && <p className="death-tip">Close your phone to freeze it. Move before looking again.<br />{s.checkpoint ? 'Your chapter checkpoint is saved.' : 'Try the entrance first. You can learn the phone rule safely.'}</p>}
      <button className="primary-button" onClick={() => { if (escaped) s.start(); else { s.retry(); runtime.lock?.() } }}>{escaped ? 'ONE MORE NIGHT' : s.checkpoint ? 'RETRY CHAPTER CHECKPOINT' : 'RETRY FROM THE ATRIUM'} <span>↺</span></button>
      {!escaped && <button className="text-button" onClick={() => s.start()}>NEW RUN · START OVER <span>↺</span></button>}
      {escaped && <button className="text-button" onClick={() => void copy()}>{copied || 'COPY RESULTS'} <span>↗</span></button>}
      <button className="text-button muted-button" onClick={() => useGame.setState({ phase: 'title' })}>RETURN TO TITLE</button>
    </div><footer>{escaped ? 'YOUR PHONE LIGHTS UP. “ARE YOU STILL INSIDE?”' : 'THE UNION IS NOT FINISHED WITH YOU.'}</footer>
  </section>
}

function HUD({ locked }: { locked: boolean }) {
  const s = useGame()
  if (s.phase !== 'playing') return null
  const [currentObjective, context] = objective(s)
  const prompt = promptText(s), level = hintLevel(s), overlay = s.panel !== null
  return <div className={`hud ${s.phone ? 'phone-raised' : ''} ${s.capture ? 'capture-mode' : ''}`}>
    <header className="hud-top nonessential"><div className="hud-objective"><div className="eyebrow">CURRENT OBJECTIVE · {act(s)}</div><h2>{currentObjective}</h2><p className="objective-context">{context}</p>
      {!s.doorsTried && <p className="onboarding-controls"><kbd>WASD</kbd> move · mouse look · <kbd>E</kbd> interact</p>}
      {(s.hint || level > 0) && <p className="contextual-hint" role="status">{contextualHint(s)}</p>}
      <button className="hint-toggle" aria-pressed={s.hint} onClick={() => useGame.setState({ hint: !s.hint })}><kbd>?</kbd> {s.hint ? 'HIDE EXTRA GUIDANCE' : level > 0 ? 'MORE GUIDANCE' : 'NEED A HINT?'}</button>
    </div><div className="hud-location"><span>FLOOR {s.floor}</span><b>{FLOOR_NAMES[s.floor]}</b><small>{formatTime(s.elapsed)}</small></div></header>
    {s.phoneTaught && <div className={`entity-status ${s.phone ? 'active' : ''}`}><i />{s.phone ? 'PHONE OPEN / IT CAN MOVE' : 'PHONE CLOSED / IT IS STILL'}</div>}
    {!overlay && <><div className="crosshair" />{prompt && <div className={`interaction ${s.prompt === 'up2' || s.prompt === 'up3' || s.prompt === 'down3' || s.prompt === 'down4' ? 'stair-prompt' : ''}`} role="status"><kbd>E</kbd><span>{prompt}</span>{s.prompt === 'eventBoard' && !s.boardRead && <span className="exposure-progress">PHONE LIGHT REVEAL {Math.min(100, Math.round(s.exposure / 5 * 100))}% · SHORT GLANCES ARE SAVED</span>}</div>}</>}
    {s.notice && runtime.time < s.noticeUntil && !overlay && <div className="notice nonessential" role="status" key={s.notice}>{s.notice}</div>}
    {runtime.time < s.floorOverlayUntil && !overlay && <div className="floor-entry nonessential" role="status"><span>FLOOR {s.floor}</span><strong>{FLOOR_NAMES[s.floor]}</strong></div>}
    <div className="hud-bottom nonessential"><div><kbd>Q</kbd> {s.phone ? 'CLOSE PHONE' : 'PHONE'}<span className="hud-divider" /><kbd>E</kbd> INTERACT</div><div><kbd>SHIFT</kbd> SPRINT <span className="hud-divider" /><kbd>ESC</kbd> PAUSE <span className="hud-divider" /><kbd>H</kbd> CAPTURE</div></div>
    {!locked && !overlay && !(s.phone && runtime.phoneUi) && <button id="look-capture" className="capture-pointer" onClick={() => { audio.unlock(); runtime.lock?.() }}><span>CLICK TO LOOK AROUND</span><small>WASD move · Q phone · E interact · Esc pause</small></button>}
  </div>
}

function StairTransition() {
  const s = useGame()
  if (s.phase !== 'stairs' || !s.transition) return null
  const t = s.transition
  return <div className="stairs-overlay" role="status"><div className="eyebrow">{t.to > t.from ? 'ASCENDING' : 'DESCENDING'} · WHITE ATRIUM STAIR</div><h2>FLOOR {t.to}</h2><p>{FLOOR_NAMES[t.to]}</p><div className="stairs-progress" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(1, t.progress)) * 100}%` }} /></div><small>Floor {t.from} → Floor {t.to}</small></div>
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
  return <main className={`app phase-${s.phase} ${s.reducedFlashing ? 'reduced-flashing' : ''} ${s.panel ? 'panel-open' : ''} ${s.capture ? 'capture-enabled' : ''}`} style={{ '--danger': s.phone ? s.threat : 0 } as CSSProperties}>
    <div className="world"><GameBoundary><Scene onLocked={setLocked} onReady={onReady} /></GameBoundary></div>
    <div className="vignette" /><div className="grain" /><div className="danger-wash" />
    {s.phase === 'title' && <Title ready={ready} mobile={mobile} />}
    {s.phase === 'intro' && <Intro />}
    <HUD locked={locked} /><Phone /><PuzzlePanel /><StairTransition />
    {s.phase === 'escaping' && <div className="escape-cinematic" role="status"><span>MAIN ENTRANCE / RELEASED</span><p>Don’t look back.</p></div>}
    {s.phase === 'scare' && <div className="scare-cinematic" role="status" aria-label="The figure has caught you"><div className="scare-caption"><span>NO SERVICE</span><p>You looked down.</p></div></div>}
    {s.phase === 'paused' && <Pause />}
    {(s.phase === 'caught' || s.phase === 'escaped') && <Results />}
    {s.help && <Tutorial onClose={() => useGame.setState({ help: false })} />}
    {(s.phase === 'title' || s.phase === 'paused') && <div className="fullscreen-control"><button onClick={() => void fullscreen()} aria-label="Toggle fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>{fullscreenError && <small role="status">{fullscreenError}</small>}</div>}
  </main>
}
