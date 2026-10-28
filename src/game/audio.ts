class AudioDirector {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hum: GainNode | null = null
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
    if (this.ctx && this.hum) this.hum.gain.setTargetAtTime(active ? 1 : 0, this.ctx.currentTime, 0.5)
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
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    stereo.pan.value = pan
    source.connect(filter).connect(gain).connect(stereo).connect(this.master)
    source.start(t); source.stop(t + duration)
  }
  step(entity = false, pan = 0) { this.hiss(entity ? 0.32 : 0.16, entity ? 0.32 : 0.14, entity ? 260 : 680, pan); this.tone(entity ? 62 : 100, 30, 0.15, entity ? 0.22 : 0.065) }
  click() { this.tone(720, 480, 0.08, 0.065) }
  phone(open: boolean) { this.hiss(0.18, 0.08, 1800); this.tone(open ? 780 : 500, open ? 960 : 280, 0.12, 0.035) }
  clue() { this.tone(660, 660, 0.3, 0.08); this.tone(880, 880, 0.4, 0.05, 'sine', 0.14) }
  book() { this.hiss(1, 0.8, 420, -0.7); this.tone(72, 24, 0.6, 0.45) }
  notification() { this.tone(970, 970, 0.2, 0.11); this.tone(770, 770, 0.42, 0.1, 'sine', 0.17) }
  flicker() { this.hiss(1.7, 0.28, 2300); this.tone(120, 65, 1.8, 0.08, 'sawtooth') }
  climax() { this.hiss(3.5, 0.32, 750); this.tone(47, 80, 3.5, 0.3); this.tone(113, 58, 2.8, 0.12, 'triangle') }
  caught() { this.hiss(1.6, 0.7, 1300); this.tone(180, 28, 1.9, 0.45, 'sawtooth'); this.tone(187, 32, 1.8, 0.2) }
  escaped() { this.tone(220, 220, 1.7, 0.12); this.tone(330, 330, 2.4, 0.07, 'sine', 0.3); this.tone(440, 440, 3.2, 0.05, 'sine', 0.8) }
  danger(value: number) {
    if (!this.ctx || value < 0.15 || this.ctx.currentTime < this.heartbeatAt) return
    this.heartbeatAt = this.ctx.currentTime + 1.4 - value * 0.8
    this.tone(62, 35, 0.16, value * 0.2); this.tone(57, 30, 0.18, value * 0.14, 'sine', 0.19)
  }
}
export const audio = new AudioDirector()
