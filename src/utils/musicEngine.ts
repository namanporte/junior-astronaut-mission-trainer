import { GamePhase } from '../types/game';

export type MusicMood = 'BRIEFING' | 'OPERATIONS' | 'CRISIS' | 'VICTORY' | 'AMBIENT_END';

const STEP_INTERVAL_LOOKAHEAD_SEC = 0.16;
const SCHEDULER_TICK_MS = 65;

// D Dorian / Minor 9 technical aerospace scale frequencies (Hz)
const BASS_PATTERNS: Record<MusicMood, number[]> = {
  BRIEFING: [73.42, 0, 73.42, 0, 110.0, 0, 98.0, 0, 65.41, 0, 65.41, 0, 98.0, 0, 82.41, 0],
  OPERATIONS: [
    73.42, 73.42, 146.83, 73.42, 110.0, 73.42, 130.81, 73.42,
    65.41, 65.41, 130.81, 65.41, 98.0, 65.41, 110.0, 82.41
  ],
  CRISIS: [
    73.42, 146.83, 73.42, 146.83, 77.78, 155.56, 73.42, 110.0,
    65.41, 130.81, 65.41, 130.81, 98.0, 110.0, 116.54, 130.81
  ],
  VICTORY: [65.41, 0, 130.81, 0, 82.41, 0, 164.81, 0, 98.0, 0, 196.0, 0, 110.0, 0, 196.0, 0],
  AMBIENT_END: [73.42, 0, 0, 0, 0, 0, 0, 0, 65.41, 0, 0, 0, 0, 0, 0, 0]
};

const ARP_PATTERNS: Record<MusicMood, number[]> = {
  BRIEFING: [293.66, 440.0, 523.25, 659.25, 440.0, 523.25, 392.0, 440.0, 261.63, 392.0, 493.88, 587.33, 440.0, 392.0, 329.63, 440.0],
  OPERATIONS: [293.66, 440.0, 587.33, 659.25, 523.25, 440.0, 659.25, 587.33, 261.63, 392.0, 523.25, 587.33, 440.0, 392.0, 493.88, 587.33],
  CRISIS: [293.66, 587.33, 466.16, 622.25, 440.0, 587.33, 349.23, 523.25, 293.66, 587.33, 466.16, 698.46, 659.25, 587.33, 523.25, 440.0],
  VICTORY: [261.63, 329.63, 392.0, 493.88, 587.33, 493.88, 392.0, 523.25, 329.63, 392.0, 493.88, 659.25, 783.99, 659.25, 587.33, 493.88],
  AMBIENT_END: [293.66, 0, 0, 440.0, 0, 0, 329.63, 0, 261.63, 0, 0, 392.0, 0, 0, 349.23, 0]
};

const PAD_CHORDS: Record<MusicMood, number[][]> = {
  BRIEFING: [
    [146.83, 220.0, 261.63, 329.63], // Dm9
    [130.81, 196.0, 246.94, 293.66]  // Cmaj9
  ],
  OPERATIONS: [
    [146.83, 220.0, 261.63, 329.63],
    [130.81, 196.0, 246.94, 293.66]
  ],
  CRISIS: [
    [146.83, 220.0, 277.18, 311.13],
    [130.81, 196.0, 233.08, 311.13]
  ],
  VICTORY: [
    [130.81, 164.81, 196.0, 246.94, 293.66],
    [174.61, 220.0, 261.63, 329.63, 392.0]
  ],
  AMBIENT_END: [
    [146.83, 220.0, 261.63],
    [130.81, 196.0, 246.94]
  ]
};

const TEMPO_BPM: Record<MusicMood, number> = {
  BRIEFING: 98,
  OPERATIONS: 114,
  CRISIS: 126,
  VICTORY: 104,
  AMBIENT_END: 76
};

export function mapPhaseToMusicMood(phase: GamePhase): MusicMood {
  if (phase === 'SURPRISE_DECISION' || phase === 'STORM_SIM') return 'CRISIS';
  if (phase === 'ACTIVE_SHIFT' || phase === 'ACTION_EXECUTION') return 'OPERATIONS';
  if (phase === 'VICTORY') return 'VICTORY';
  if (phase === 'GAME_OVER') return 'AMBIENT_END';
  return 'BRIEFING';
}

class TechnicalMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private unlocked = false;
  private enabled = true;
  private muted = false;
  private ducked = false;
  private mood: MusicMood = 'BRIEFING';

  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (!this.masterGain || !this.musicBus) {
        const ctx = this.ctx;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 18;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.01;
        compressor.release.value = 0.2;

        const master = ctx.createGain();
        master.gain.value = 0;

        const bus = ctx.createGain();
        bus.gain.value = 1.0;

        // Spatial delay loop for technical modular synth shimmer
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.31;

        const delayFilter = ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2100;

        const delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0.28;

        const delayWet = ctx.createGain();
        delayWet.gain.value = 0.22;

        bus.connect(master);
        bus.connect(delay);
        delay.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(delay);
        delayFilter.connect(delayWet);
        delayWet.connect(master);

        master.connect(compressor);
        compressor.connect(ctx.destination);

        this.masterGain = master;
        this.musicBus = bus;
        this.delayNode = delay;

        // Precompute reusable noise buffer for tight telemetry hi-hat ticks
        const frames = Math.floor(ctx.sampleRate * 0.08);
        const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buf;
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  private updateTargetGain() {
    if (!this.ctx || !this.masterGain) return;
    const target = !this.unlocked || this.muted || !this.enabled ? 0 : this.ducked ? 0.1 : 0.26;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(target, now, 0.18);
  }

  public unlock() {
    this.unlocked = true;
    const ctx = this.ensureGraph();
    if (!ctx) return;
    if (this.enabled && !this.muted) {
      this.startLoop();
    }
    this.updateTargetGain();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateTargetGain();
    if (muted) {
      this.stopLoop();
    } else if (this.unlocked && this.enabled) {
      this.startLoop();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.updateTargetGain();
    if (!enabled) {
      this.stopLoop();
    } else if (this.unlocked && !this.muted) {
      this.startLoop();
    }
  }

  public setDucked(ducked: boolean) {
    this.ducked = ducked;
    this.updateTargetGain();
  }

  public setPhase(phase: GamePhase) {
    const nextMood = mapPhaseToMusicMood(phase);
    if (nextMood !== this.mood) {
      this.mood = nextMood;
      if (this.delayNode && this.ctx) {
        const sixteenth = 60 / TEMPO_BPM[nextMood] / 4;
        this.delayNode.delayTime.setTargetAtTime(sixteenth * 3, this.ctx.currentTime, 0.2);
      }
    }
  }

  private startLoop() {
    if (this.schedulerId !== null) return;
    const ctx = this.ensureGraph();
    if (!ctx) return;

    this.nextStepTime = ctx.currentTime + 0.06;
    this.schedulerId = window.setInterval(() => this.scheduler(), SCHEDULER_TICK_MS);
    this.updateTargetGain();
  }

  private stopLoop() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private scheduler() {
    if (!this.ctx || !this.musicBus || this.muted || !this.enabled || !this.unlocked) return;
    if (this.ctx.state !== 'running') return;

    const bpm = TEMPO_BPM[this.mood];
    const stepDur = 60 / bpm / 4; // 16th note duration

    // Catch up cleanly if tab was suspended in background
    if (this.nextStepTime < this.ctx.currentTime - 0.5) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    while (this.nextStepTime < this.ctx.currentTime + STEP_INTERVAL_LOOKAHEAD_SEC) {
      this.scheduleStep(this.stepIndex, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private scheduleStep(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.musicBus) return;
    const localStep = step % 16;
    const mood = this.mood;

    // 1. Warm modular bass ostinato
    const bassFreq = BASS_PATTERNS[mood][localStep];
    if (bassFreq > 0) {
      this.triggerBassPulse(bassFreq, time, stepDur * (mood === 'BRIEFING' ? 1.5 : 0.88), mood);
    }

    // 2. Glassy technical telemetry arpeggio (played on even steps in Briefing, syncopated 16ths in Operations/Crisis)
    const arpFreq = ARP_PATTERNS[mood][localStep];
    const playArp =
      arpFreq > 0 &&
      (mood === 'OPERATIONS' || mood === 'CRISIS'
        ? localStep % 2 === 0 || localStep === 7 || localStep === 15
        : localStep % 2 === 0);
    if (playArp) {
      this.triggerTelemetryPluck(arpFreq, time, stepDur * 1.4, mood);
    }

    // 3. Soft precision clock kick & telemetry hi-hat ticks (only during active/crisis shifts)
    if (mood === 'OPERATIONS' || mood === 'CRISIS') {
      if (localStep % 4 === 0) {
        this.triggerSoftKick(time, mood === 'CRISIS' ? 0.28 : 0.21);
      }
      if (localStep % 2 === 1 || (mood === 'CRISIS' && localStep % 4 === 2)) {
        this.triggerTelemetryTick(time, localStep % 4 === 2 ? 0.055 : 0.032);
      }
    } else if (mood === 'BRIEFING' && localStep % 4 === 2) {
      this.triggerTelemetryTick(time, 0.018);
    }

    // 4. Slow evolving space synth pad chord on bar transitions (step 0 and step 16)
    if (step === 0 || step === 16) {
      const chords = PAD_CHORDS[mood];
      const chord = chords[step === 0 ? 0 : 1];
      this.triggerSpacePad(chord, time, stepDur * 15.5);
    }
  }

  private triggerBassPulse(freq: number, time: number, dur: number, mood: MusicMood) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    const peakCutoff = mood === 'CRISIS' ? 680 : mood === 'OPERATIONS' ? 500 : 340;
    filter.frequency.setValueAtTime(peakCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + dur);
    filter.Q.value = 3.2;

    const peakGain = mood === 'BRIEFING' ? 0.15 : 0.21;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus!);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerTelemetryPluck(freq: number, time: number, dur: number, mood: MusicMood) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = mood === 'CRISIS' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(mood === 'CRISIS' ? 2400 : 1900, time);
    filter.frequency.exponentialRampToValueAtTime(520, time + dur);

    const amp = mood === 'BRIEFING' ? 0.065 : mood === 'VICTORY' ? 0.09 : 0.08;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0004, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus!);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private triggerSoftKick(time: number, amp: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(108, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.14);

    osc.connect(gain);
    gain.connect(this.musicBus!);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private triggerTelemetryTick(time: number, amp: number) {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(amp, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + 0.032);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicBus!);

    src.start(time);
    src.stop(time + 0.038);
  }

  private triggerSpacePad(chord: number[], time: number, dur: number) {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(880, time);

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, time);
    padGain.gain.linearRampToValueAtTime(0.065, time + dur * 0.25);
    padGain.gain.linearRampToValueAtTime(0.045, time + dur * 0.78);
    padGain.gain.exponentialRampToValueAtTime(0.0004, time + dur);

    filter.connect(padGain);
    padGain.connect(this.musicBus!);

    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    });
  }
}

export const musicEngine = new TechnicalMusicEngine();
