import { VoiceProfile } from '../types/game';
import { musicEngine } from './musicEngine';
import { soundEngine } from './soundEngine';

interface PlayVoiceOptions {
  text: string;
  profile: VoiceProfile;
  muted?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

const VOICE_CONFIG: Record<
  VoiceProfile,
  {
    ttsVoice: 'Charon' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir';
    ttsStyle: string;
    synthPitch: number;
    synthRate: number;
  }
> = {
  DIRECTOR: {
    ttsVoice: 'Charon',
    ttsStyle: 'Warm, inspiring NASA mission director speaking clearly in a briefing office',
    synthPitch: 0.9,
    synthRate: 0.98
  },
  ENGINEER: {
    ttsVoice: 'Kore',
    ttsStyle: 'Upbeat, bright young space engineer excited for an adventure',
    synthPitch: 1.12,
    synthRate: 1.04
  },
  RADIO: {
    ttsVoice: 'Puck',
    ttsStyle: 'Crisp, friendly astronaut flight controller speaking over deep space radio',
    synthPitch: 1.02,
    synthRate: 1.03
  }
};

class RadioVoiceEngine {
  private audioCtx: AudioContext | null = null;
  private clientCache = new Map<string, AudioBuffer>();
  private activeSource: AudioBufferSourceNode | null = null;
  private activeNoiseSource: AudioBufferSourceNode | null = null;
  private activeEndCallback: (() => void) | null = null;
  private playToken = 0;
  private ttsCooldownUntil = 0;

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        this.audioCtx = new Ctx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private buildRadioSaturationCurve(): Float32Array<ArrayBuffer> {
    const n = 512;
    const buffer = new ArrayBuffer(n * 4);
    const curve = new Float32Array(buffer);
    const k = 18;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private playRogerBeep(ctx: AudioContext) {
    const now = ctx.currentTime;
    [1046.5, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.055, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.065 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.07);
    });
    soundEngine.playRadioSquelch(0.065);
  }

  private startStaticCarrierBed(ctx: AudioContext): AudioBufferSourceNode | null {
    try {
      const duration = 3.0;
      const frames = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        // Subtle crackling noise floor
        const crackle = Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.6 : 0;
        ch[i] = (Math.random() * 2 - 1) * 0.14 + crackle;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1750;
      bp.Q.value = 1.6;

      const gain = ctx.createGain();
      gain.gain.value = 0.065;

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      return noise;
    } catch {
      return null;
    }
  }

  public stop() {
    this.playToken++;
    musicEngine.setDucked(false);
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
      } catch {
        // ignore already stopped
      }
      this.activeSource = null;
    }
    if (this.activeNoiseSource) {
      try {
        this.activeNoiseSource.stop();
      } catch {
        // ignore
      }
      this.activeNoiseSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (this.activeEndCallback) {
      const cb = this.activeEndCallback;
      this.activeEndCallback = null;
      cb();
    }
  }

  private async fetchTtsBuffer(
    text: string,
    profile: VoiceProfile,
    ctx: AudioContext
  ): Promise<AudioBuffer | null> {
    const cfg = VOICE_CONFIG[profile];
    const cacheKey = `${profile}|${text}`;
    const cached = this.clientCache.get(cacheKey);
    if (cached) return cached;

    if (Date.now() < this.ttsCooldownUntil) {
      return null;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5500);
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: cfg.ttsVoice,
          style: cfg.ttsStyle
        }),
        signal: controller.signal
      });
      if (!resp.ok) {
        this.ttsCooldownUntil = Date.now() + 5 * 60 * 1000;
        return null;
      }

      const data = (await resp.json()) as {
        audioBase64?: string | null;
        fallback?: boolean;
        retryAfterMs?: number;
      };
      if (data.fallback || !data.audioBase64) {
        const retryMs =
          typeof data.retryAfterMs === 'number' && data.retryAfterMs > 0
            ? data.retryAfterMs
            : 10 * 60 * 1000;
        this.ttsCooldownUntil = Date.now() + retryMs;
        return null;
      }

      const bin = window.atob(data.audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }

      const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      if (this.clientCache.size >= 28) {
        const oldest = this.clientCache.keys().next().value;
        if (oldest) this.clientCache.delete(oldest);
      }
      this.clientCache.set(cacheKey, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private speakViaWebSpeechFallback(
    text: string,
    profile: VoiceProfile,
    token: number,
    onDone: () => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone();
      return;
    }

    const ctx = this.ensureAudioContext();
    const cfg = VOICE_CONFIG[profile];
    const isRadio = profile === 'RADIO';

    if (isRadio && ctx) {
      soundEngine.playRadioSquelch(0.09);
      this.activeNoiseSource = this.startStaticCarrierBed(ctx);
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.pitch = cfg.synthPitch;
    utter.rate = cfg.synthRate;
    utter.volume = isRadio ? 0.88 : 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
      const pool = enVoices.length > 0 ? enVoices : voices;
      if (profile === 'DIRECTOR') {
        utter.voice =
          pool.find((v) => /male|daniel|david|alex|google uk english male/i.test(v.name)) ??
          pool[0];
      } else if (profile === 'ENGINEER') {
        utter.voice =
          pool.find((v) => /female|samantha|karen|victoria|google us english/i.test(v.name)) ??
          pool[Math.min(1, pool.length - 1)];
      } else {
        utter.voice = pool[pool.length > 2 ? 2 : 0];
      }
    }

    const finish = () => {
      if (this.activeNoiseSource) {
        try {
          this.activeNoiseSource.stop();
        } catch {
          // ignore
        }
        this.activeNoiseSource = null;
      }
      if (this.playToken === token && isRadio && ctx) {
        this.playRogerBeep(ctx);
      }
      onDone();
    };

    utter.onend = finish;
    utter.onerror = finish;

    try {
      window.speechSynthesis.speak(utter);
    } catch {
      finish();
    }
  }

  public async play({ text, profile, muted = false, onStart, onEnd }: PlayVoiceOptions) {
    this.stop();
    if (muted || !text.trim()) {
      onEnd?.();
      return;
    }

    const myToken = ++this.playToken;
    this.activeEndCallback = onEnd ?? null;
    musicEngine.setDucked(true);
    onStart?.();

    const finishPlay = () => {
      musicEngine.setDucked(false);
      if (this.activeNoiseSource) {
        try {
          this.activeNoiseSource.stop();
        } catch {
          // ignore
        }
        this.activeNoiseSource = null;
      }
      this.activeSource = null;
      const cb = this.activeEndCallback;
      this.activeEndCallback = null;
      cb?.();
    };

    const ctx = this.ensureAudioContext();
    if (!ctx) {
      this.speakViaWebSpeechFallback(text, profile, myToken, finishPlay);
      return;
    }

    const isRadio = profile === 'RADIO';
    if (isRadio) {
      soundEngine.playRadioSquelch(0.09);
    }

    const buffer = await this.fetchTtsBuffer(text, profile, ctx);
    if (myToken !== this.playToken) return;

    if (!buffer) {
      this.speakViaWebSpeechFallback(text, profile, myToken, finishPlay);
      return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      this.activeSource = source;

      if (isRadio) {
        // Real NASA UHF/Walkie-Talkie Radio DSP chain!
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 430;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1480;
        bandpass.Q.value = 1.2;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2650;

        const shaper = ctx.createWaveShaper();
        shaper.curve = this.buildRadioSaturationCurve();
        shaper.oversample = '2x';

        const radioGain = ctx.createGain();
        radioGain.gain.value = 1.22;

        source.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(shaper);
        shaper.connect(radioGain);
        radioGain.connect(ctx.destination);

        this.activeNoiseSource = this.startStaticCarrierBed(ctx);
      } else {
        const cleanGain = ctx.createGain();
        cleanGain.gain.value = 0.95;
        source.connect(cleanGain);
        cleanGain.connect(ctx.destination);
      }

      source.onended = () => {
        if (myToken === this.playToken && isRadio) {
          this.playRogerBeep(ctx);
        }
        finishPlay();
      };

      source.start();
    } catch {
      this.speakViaWebSpeechFallback(text, profile, myToken, finishPlay);
    }
  }
}

export const radioVoiceEngine = new RadioVoiceEngine();
