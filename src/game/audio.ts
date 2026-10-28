import type { Zone } from './world'

class AudioDirector {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hum: GainNode | null = null
  private breath: GainNode | null = null
  private breathPan: StereoPannerNode | null = null
  private active = false
  private surface: Zone = 'north'
  private entityDistance = 24
  private heartbeatAt = 0
  private noise: AudioBuffer | null = null
  private level = 0.65
  private muted = false

  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate)
        const data = this.noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        this.hum = this.ctx.createGain()
        this.hum.gain.value = 0
        this.hum.connect(this.master)
        for (const frequency of [55, 110, 164.8]) {
          const oscillator = this.ctx.createOscillator()
          oscillator.type = 'sine'
          oscillator.frequency.value = frequency
          const gain = this.ctx.createGain()
          gain.gain.value = frequency === 55 ? 0.10 : 0.025
          oscillator.connect(gain).connect(this.hum)
          oscillator.start()
        }
        const air = this.ctx.createBufferSource()
        air.buffer = this.noise
        air.loop = true
        const filter = this.ctx.createBiquadFilter()
        filter.type = 'lowpass'; filter.frequency.value = 320
        const gain = this.ctx.createGain(); gain.gain.value = 0.13
        air.connect(filter).connect(gain).connect(this.hum)
        air.start()
        // Narrow-band, slowly pulsing air: more audible as the figure draws near.
        const breathSource = this.ctx.createBufferSource()
        breathSource.buffer = this.noise; breathSource.loop = true
        const breathFilter = this.ctx.createBiquadFilter()
        breathFilter.type = 'bandpass'; breathFilter.frequency.value = 330; breathFilter.Q.value = .55
        const pulse = this.ctx.createGain(); pulse.gain.value = .52
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = .42
        const depth = this.ctx.createGain(); depth.gain.value = .42
        lfo.connect(depth).connect(pulse.gain); lfo.start()
        this.breath = this.ctx.createGain(); this.breath.gain.value = 0
        this.breathPan = this.ctx.createStereoPanner()
        breathSource.connect(breathFilter).connect(pulse).connect(this.breath).connect(this.breathPan).connect(this.master)
        breathSource.start()
      }
      void this.ctx.resume().catch(() => {})
      this.configure(this.level, this.muted)
    } catch { /* The game remains playable when browser audio is unavailable. */ }
  }

  configure(volume: number, muted: boolean) {
    this.level = volume; this.muted = muted
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.08)
  }
  ambience(active: boolean) {
    this.active = active
    if (this.ctx && this.hum) this.hum.gain.setTargetAtTime(active ? 1 : 0, this.ctx.currentTime, 0.5)
    if (!active && this.ctx && this.breath) this.breath.gain.setTargetAtTime(0, this.ctx.currentTime, .08)
  }
  setSurface(surface: Zone) { this.surface = surface }
  proximity(distance: number, pan = 0) {
    this.entityDistance = Math.max(0, distance)
    if (!this.ctx || !this.breath || !this.breathPan) return
    const strength = this.active ? Math.max(0, 1 - this.entityDistance / 17) ** 2 : 0
    this.breath.gain.setTargetAtTime(strength * .15, this.ctx.currentTime, .22)
    this.breathPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, .3)
  }
  private tone(frequency: number, end: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain()
    osc.type = type; osc.frequency.setValueAtTime(frequency, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + duration)
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(this.master); osc.start(t); osc.stop(t + duration + 0.05)
  }
  private hiss(duration: number, volume: number, cutoff: number, pan = 0) {
    if (!this.ctx || !this.master || !this.noise) return
    const t = this.ctx.currentTime, source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), stereo = this.ctx.createStereoPanner()
    source.buffer = this.noise; source.loop = duration > 1.9; filter.type = 'lowpass'; filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    stereo.pan.value = pan
    source.connect(filter).connect(gain).connect(stereo).connect(this.master)
    source.start(t); source.stop(t + duration)
  }
  step(entity = false, pan = 0, surface: Zone = this.surface) {
    if (!this.active) return
    if (entity) {
      const near = Math.max(0, 1 - this.entityDistance / 24)
      this.hiss(.29, .035 + near * .19, 210 + near * 140, pan)
      this.tone(62, 35, .19, .02 + near * .13)
    } else {
      // Carpet at the study desks, ringing metal in the stacks, harder South Tower tile.
      const profile = surface === 'north' ? { hiss: .065, cutoff: 420, tone: 78 } : surface === 'stacks' ? { hiss: .11, cutoff: 1250, tone: 118 } : { hiss: .095, cutoff: 900, tone: 98 }
      this.hiss(.14, profile.hiss, profile.cutoff)
      this.tone(profile.tone, 40, .12, .034)
      if (surface === 'stacks') this.tone(740, 510, .055, .009, 'triangle')
    }
  }
  click() { this.tone(720, 480, 0.08, 0.052) }
  puzzle() { this.tone(340, 465, .11, .033, 'triangle'); this.tone(590, 495, .15, .024, 'sine', .07) }
  chair(pan = .5) { this.hiss(.7, .17, 720, pan); this.tone(195, 82, .56, .083, 'triangle') }
  phone(open: boolean) { this.hiss(0.18, 0.08, 1800); this.tone(open ? 780 : 500, open ? 960 : 280, 0.12, 0.035) }
  clue() { this.tone(660, 660, 0.3, 0.08); this.tone(880, 880, 0.4, 0.05, 'sine', 0.14) }
  book(pan = -.7) { this.hiss(.88, .36, 550, pan); this.tone(72, 28, .6, .19) }
  notification() { this.tone(970, 970, 0.2, 0.11); this.tone(770, 770, 0.42, 0.1, 'sine', 0.17) }
  flicker() { this.hiss(1.7, 0.28, 2300); this.tone(120, 65, 1.8, 0.08, 'sawtooth') }
  climax() { this.hiss(3.5, 0.32, 750); this.tone(47, 80, 3.5, 0.3); this.tone(113, 58, 2.8, 0.12, 'triangle') }
  caught() { this.hiss(1.6, .32, 900); this.tone(180, 28, 1.6, .22, 'sawtooth'); this.tone(187, 32, 1.4, .1) }
  escaped() { this.tone(220, 220, 1.7, 0.12); this.tone(330, 330, 2.4, 0.07, 'sine', 0.3); this.tone(440, 440, 3.2, 0.05, 'sine', 0.8) }
  danger(value: number) {
    if (!this.ctx || value < 0.15 || this.ctx.currentTime < this.heartbeatAt) return
    this.heartbeatAt = this.ctx.currentTime + 1.4 - value * 0.8
    this.tone(62, 35, 0.16, value * 0.2); this.tone(57, 30, 0.18, value * 0.14, 'sine', 0.19)
  }
}
export const audio = new AudioDirector()
