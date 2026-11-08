/**
 * Circus Web Edition — Modern Web Audio Synthesizer
 * Inspired by CIRCUS.BIN ($F700-$F782 & $F814-$F8A3) + Modern Circus Calliope Organ
 */

class CircusAudioEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.stepIndex = 0;

    // Classic Circus Calliope melody ("Entry of the Gladiators" / Circus March motif)
    // Chromatic/brass circus feel in C major / F major
    this.melody = [
      // Bar 1-2: Chromatic circus fanfare
      { note: 72, dur: 0.18, bass: 48 },
      { note: 71, dur: 0.18, bass: null },
      { note: 70, dur: 0.18, bass: 55 },
      { note: 69, dur: 0.18, bass: null },
      { note: 68, dur: 0.18, bass: 48 },
      { note: 69, dur: 0.18, bass: null },
      { note: 67, dur: 0.36, bass: 55 },

      // Bar 3-4
      { note: 67, dur: 0.18, bass: 48 },
      { note: 66, dur: 0.18, bass: null },
      { note: 65, dur: 0.18, bass: 55 },
      { note: 64, dur: 0.18, bass: null },
      { note: 63, dur: 0.18, bass: 48 },
      { note: 64, dur: 0.18, bass: null },
      { note: 60, dur: 0.36, bass: 48 },

      // Bar 5-6: Upbeat gallop
      { note: 64, dur: 0.18, bass: 48 },
      { note: 67, dur: 0.18, bass: null },
      { note: 72, dur: 0.18, bass: 55 },
      { note: 76, dur: 0.18, bass: null },
      { note: 74, dur: 0.18, bass: 50 },
      { note: 72, dur: 0.18, bass: null },
      { note: 71, dur: 0.36, bass: 55 },

      // Bar 7-8: Resolution
      { note: 65, dur: 0.18, bass: 43 },
      { note: 67, dur: 0.18, bass: null },
      { note: 71, dur: 0.18, bass: 55 },
      { note: 74, dur: 0.18, bass: null },
      { note: 72, dur: 0.36, bass: 48 },
      { note: 72, dur: 0.36, bass: 48 }
    ];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  startMusic() {
    this.ensureContext();
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.stepIndex = 0;
    this.scheduleNextNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleNextNote() {
    if (!this.musicPlaying) return;
    const item = this.melody[this.stepIndex % this.melody.length];
    this.stepIndex++;

    if (this.musicEnabled && this.ctx && this.ctx.state === 'running') {
      this.playCalliopeNote(this.midiToFreq(item.note), item.dur * 0.85, 0.045);
      if (item.bass) {
        this.playOomPahBass(this.midiToFreq(item.bass), item.dur * 0.9, 0.055);
      }
    }

    this.musicTimer = setTimeout(() => {
      this.scheduleNextNote();
    }, item.dur * 1000);
  }

  playCalliopeNote(freq, duration, volume) {
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Steam organ / calliope timbre: triangle + slightly detuned harmonic
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.003, now);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.25, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc1.connect(gain);
    osc2.connect(subGain);
    subGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
  }

  playOomPahBass(freq, duration, volume) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Seesaw launch sound ($B6 / $F816 in CIRCUS.BIN)
   * Pitch scales with jump curve (0..4)
   */
  playBounceSeesaw(curveLevel = 1) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const baseFreq = 190 + curveLevel * 45;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc2.type = 'sine';

    osc.frequency.setValueAtTime(baseFreq * 0.75, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.16);

    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3.0, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.19);
    osc2.stop(now + 0.19);
  }

  /**
   * Side Springboard / Trampoline bounce ($B7 in CIRCUS.BIN)
   */
  playBounceSpring() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.22);

    // Vibrato for metallic coil spring "boing"
    lfo.frequency.setValueAtTime(38, now);
    lfoGain.gain.setValueAtTime(45, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.25);
    lfo.stop(now + 0.25);
  }

  /**
   * Coin pickup chime ($B5 / $B1 in CIRCUS.BIN)
   * Pitched by row value: 2 pts (Bronze), 5 pts (Silver), 10 pts (Gold)
   */
  playCoinPickup(points = 2) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const baseNote = points === 10 ? 84 : points === 5 ? 79 : 74;
    const f1 = this.midiToFreq(baseNote);
    const f2 = this.midiToFreq(baseNote + 4);

    [f1, f2].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.045;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /**
   * Row clear bonus fanfare ($B3 -> $F885 descriptor in CIRCUS.BIN)
   */
  playRowClear(rowIdx = 2) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const notes = rowIdx === 0
      ? [72, 76, 79, 84, 88, 91, 96] // Gold top row: grand fanfare
      : rowIdx === 1
        ? [67, 71, 74, 79, 83]       // Silver middle row
        : [60, 64, 67, 72];          // Bronze bottom row

    notes.forEach((midi, idx) => {
      const start = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), start);

      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /**
   * Extra Life Fanfare ($DC -> $F86E descriptor in CIRCUS.BIN)
   */
  playExtraLife() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const chordNotes = [72, 76, 79, 84, 79, 84, 88];
    chordNotes.forEach((midi, i) => {
      const start = now + i * 0.08;
      this.playCalliopeNote(this.midiToFreq(midi), 0.2, 0.14);
      setTimeout(() => {}, start);
    });
  }

  /**
   * Barrier deflection sound
   */
  playBarrierHit() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Ground Splat / Crash sound ($B8 & $B9 -> $F82E & $F845 in CIRCUS.BIN)
   */
  playSplat() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Descending comical whistle
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.35);

    oscGain.gain.setValueAtTime(0.16, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // White noise thud / cymbal crash
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now + 0.08);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now + 0.05);
  }
}

window.CircusAudio = new CircusAudioEngine();
