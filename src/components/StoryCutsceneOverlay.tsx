import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  FastForward,
  Headphones,
  Radio,
  Rocket,
  Volume2
} from 'lucide-react';
import { StoryBeat, WorldBody } from '../types/game';
import { radioVoiceEngine } from '../utils/radioVoiceEngine';

interface StoryCutsceneOverlayProps {
  world: WorldBody;
  beats: StoryBeat[];
  muted: boolean;
  onComplete: () => void;
}

export function StoryCutsceneOverlay({
  world,
  beats,
  muted,
  onComplete
}: StoryCutsceneOverlayProps) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const beat = beats[beatIndex] ?? beats[0];
  const isFinalBeat = beatIndex >= beats.length - 1;
  const isArrivalScene = beat.scene === 'OUTPOST_ARRIVAL';

  const speakCurrentBeat = useCallback(() => {
    if (!beat) return;
    radioVoiceEngine.play({
      text: beat.line,
      profile: beat.voiceProfile,
      muted,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    });
  }, [beat, muted]);

  // Trigger voice & typewriter whenever beat changes
  useEffect(() => {
    setTypedLen(0);
    speakCurrentBeat();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setTypedLen(beat.line.length);
      return;
    }

    const timer = window.setInterval(() => {
      setTypedLen((prev) => {
        if (prev >= beat.line.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 2;
      });
    }, 20);

    return () => {
      window.clearInterval(timer);
    };
  }, [beat, speakCurrentBeat]);

  useEffect(() => {
    return () => {
      radioVoiceEngine.stop();
    };
  }, []);

  const handleAdvance = useCallback(() => {
    if (typedLen < beat.line.length) {
      setTypedLen(beat.line.length);
      return;
    }
    radioVoiceEngine.stop();
    if (isFinalBeat) {
      onComplete();
    } else {
      setBeatIndex((i) => i + 1);
    }
  }, [typedLen, beat.line.length, isFinalBeat, onComplete]);

  const handleSkip = useCallback(() => {
    radioVoiceEngine.stop();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdvance();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAdvance, handleSkip]);

  const speakerAccent =
    beat.voiceProfile === 'DIRECTOR'
      ? 'bg-blue-600 border-blue-400 text-white'
      : beat.voiceProfile === 'ENGINEER'
      ? 'bg-emerald-600 border-emerald-400 text-white'
      : 'bg-amber-500 border-amber-300 text-slate-950';

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 ${
        isArrivalScene ? 'bg-slate-950/20 pointer-events-auto' : 'bg-[#081226] pointer-events-auto'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Mission Story Briefing"
    >
      {/* Top Bar: Location & Skip */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-950/90 border border-slate-700 px-3.5 py-2 text-xs font-extrabold text-sky-200 shadow-lg">
          {beat.scene === 'NASA_OFFICE' ? (
            <Building2 className="w-4 h-4 text-blue-400" />
          ) : beat.scene === 'TRANSIT' ? (
            <Rocket className="w-4 h-4 text-amber-400" />
          ) : (
            <Radio className="w-4 h-4 text-emerald-400" />
          )}
          <span>{beat.locationLabel}</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono-tabular text-slate-300">
            Scene {beatIndex + 1}/{beats.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="btn-tactile px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-600 text-slate-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>Skip Story</span>
        </button>
      </div>

      {/* Center Illustrated Backdrop for NASA Office & Rocket Transit (Hidden on Outpost Arrival so 3D Base is 100% visible!) */}
      {!isArrivalScene ? (
        <div className="w-full max-w-4xl mx-auto my-auto py-3">
          {beat.scene === 'NASA_OFFICE' ? (
            <div className="rounded-3xl bg-[#0D1B36] border-2 border-blue-500/40 shadow-2xl p-4 sm:p-6 overflow-hidden">
              <svg
                viewBox="0 0 820 280"
                className="w-full h-auto rounded-2xl bg-[#071022] border border-slate-700/80"
                aria-hidden="true"
              >
                {/* Mission Control Wall Grid */}
                <defs>
                  <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="820" height="280" fill="#071022" />

                {/* Left Telemetry Monitor */}
                <rect
                  x="28"
                  y="24"
                  width="210"
                  height="135"
                  rx="10"
                  fill="url(#screenGlow)"
                  stroke="#38BDF8"
                  strokeWidth="2"
                />
                <text x="44" y="48" fill="#7DD3FC" fontSize="12" fontWeight="bold">
                  SOLAR STORM RADAR
                </text>
                <path
                  d="M 44 125 Q 90 65, 130 112 T 218 75"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="4"
                />
                <circle cx="218" cy="75" r="7" fill="#EF4444" />
                <text x="44" y="146" fill="#FDE68A" fontSize="11" fontWeight="bold">
                  7-SOL FLARE WAVE DETECTED
                </text>

                {/* Center Orbital Map */}
                <rect
                  x="258"
                  y="18"
                  width="304"
                  height="152"
                  rx="12"
                  fill="#0B1730"
                  stroke="#60A5FA"
                  strokeWidth="2.5"
                />
                <text x="315" y="42" fill="#93C5FD" fontSize="13" fontWeight="bold">
                  NASA HOUSTON · 7-SOL FLIGHT PLAN
                </text>
                {/* Earth Sphere */}
                <circle cx="325" cy="105" r="28" fill="#2563EB" stroke="#93C5FD" strokeWidth="2" />
                <path d="M 310 92 Q 326 84 338 102 Q 324 118 308 106 Z" fill="#22C55E" />
                {/* Trajectory Arc */}
                <path
                  d="M 353 96 Q 425 48 492 102"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
                {/* Target World */}
                <circle
                  cx="504"
                  cy="108"
                  r="22"
                  fill={world === 'MOON' ? '#94A3B8' : '#EA580C'}
                  stroke="#F8FAFC"
                  strokeWidth="2"
                />
                <text x="468" y="148" fill="#F8FAFC" fontSize="11" fontWeight="bold">
                  {world === 'MOON' ? 'MOON BASE ALPHA' : 'MARS OUTPOST'}
                </text>

                {/* Right Engineer Selection Card on Screen */}
                <rect
                  x="582"
                  y="24"
                  width="210"
                  height="135"
                  rx="10"
                  fill="url(#screenGlow)"
                  stroke="#34D399"
                  strokeWidth="2"
                />
                <text x="598" y="48" fill="#6EE7B7" fontSize="12" fontWeight="bold">
                  CREW SELECTION
                </text>
                <rect x="598" y="64" width="178" height="32" rx="6" fill="#064E3B" />
                <text x="610" y="84" fill="#A7F3D0" fontSize="12" fontWeight="bold">
                  SELECTED: ENGINEER ALEX
                </text>
                <text x="598" y="118" fill="#E2E8F0" fontSize="11">
                  Assignment: 7 Sols
                </text>
                <text x="598" y="138" fill="#E2E8F0" fontSize="11">
                  Role: Chief Base Engineer
                </text>

                {/* Mission Control Desk & Silhouettes */}
                <rect x="0" y="198" width="820" height="82" fill="#1E293B" />
                <rect x="0" y="194" width="820" height="6" fill="#475569" />
                {/* Director Vance (Blue Jacket) */}
                <circle cx="240" cy="176" r="22" fill="#FDBA74" />
                <path d="M 205 245 Q 240 205 275 245 Z" fill="#1D4ED8" />
                <rect x="218" y="154" width="44" height="12" rx="6" fill="#334155" />
                {/* Engineer Alex (Space Suit) */}
                <circle cx="570" cy="178" r="22" fill="#FED7AA" />
                <path d="M 532 245 Q 570 202 608 245 Z" fill="#F8FAFC" stroke="#0EA5E9" strokeWidth="3" />
                <rect x="556" y="216" width="28" height="18" rx="4" fill="#0284C7" />
              </svg>
              <div className="mt-2.5 text-center text-xs font-bold text-sky-300">
                {beat.sceneHint}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-[#0D1B36] border-2 border-amber-400/50 shadow-2xl p-4 sm:p-6 overflow-hidden">
              <svg
                viewBox="0 0 820 260"
                className="w-full h-auto rounded-2xl border border-slate-700"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width="820"
                  height="260"
                  fill={world === 'MOON' ? '#040711' : '#3B180E'}
                />
                {/* Stars */}
                <circle cx="90" cy="40" r="2" fill="#FFF" />
                <circle cx="210" cy="65" r="1.5" fill="#FFF" />
                <circle cx="640" cy="45" r="2" fill="#FFF" />
                <circle cx="740" cy="85" r="1.5" fill="#FFF" />
                {/* Horizon */}
                <path
                  d="M 0 215 Q 220 185 430 210 T 820 198 L 820 260 L 0 260 Z"
                  fill={world === 'MOON' ? '#64748B' : '#B45309'}
                />
                {/* Landing Pad Beacon */}
                <ellipse cx="410" cy="222" rx="95" ry="16" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" />
                {/* Descending Lander */}
                <g transform="translate(370, 58)">
                  <polygon points="40,115 24,168 56,168" fill="#F59E0B" opacity="0.85" />
                  <polygon points="40,115 30,152 50,152" fill="#FEF08A" />
                  <rect x="14" y="45" width="52" height="58" rx="12" fill="#F8FAFC" stroke="#38BDF8" strokeWidth="3" />
                  <polygon points="22,45 58,45 48,18 32,18" fill="#CBD5E1" />
                  <line x1="16" y1="100" x2="2" y2="122" stroke="#94A3B8" strokeWidth="5" />
                  <line x1="64" y1="100" x2="78" y2="122" stroke="#94A3B8" strokeWidth="5" />
                </g>
              </svg>
              <div className="mt-2.5 text-center text-xs font-bold text-amber-300">
                {beat.sceneHint}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="my-auto text-center pointer-events-none">
          <div className="inline-block rounded-2xl bg-slate-950/90 border border-emerald-400/60 px-4 py-2 text-xs font-extrabold text-emerald-300 shadow-lg">
            {beat.sceneHint}
          </div>
        </div>
      )}

      {/* Bottom Interactive Dialogue Box */}
      <div
        onClick={handleAdvance}
        className="w-full max-w-4xl mx-auto rounded-3xl bg-white border-2 border-blue-300 shadow-2xl p-4 sm:p-5 text-slate-900 cursor-pointer"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`px-3 py-1 rounded-xl border font-display font-extrabold text-xs flex items-center gap-1.5 ${speakerAccent}`}
            >
              {beat.voiceProfile === 'RADIO' ? (
                <Radio className="w-3.5 h-3.5" />
              ) : (
                <Headphones className="w-3.5 h-3.5" />
              )}
              <span>{beat.speakerName}</span>
            </div>
            <span className="text-xs font-bold text-slate-500">{beat.speakerRole}</span>

            {beat.voiceProfile === 'RADIO' && (
              <span className="text-[11px] font-mono-tabular font-extrabold text-amber-700">
                · UHF Radio Effect
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Visualizer Bars */}
            {isSpeaking && (
              <div className="flex items-end gap-0.5 h-4 px-1" aria-hidden="true">
                <span className="w-1 h-3 bg-blue-600 rounded-full animate-dsn-bar" />
                <span
                  className="w-1 h-4 bg-sky-500 rounded-full animate-dsn-bar"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-1 h-2.5 bg-blue-600 rounded-full animate-dsn-bar"
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speakCurrentBeat();
              }}
              className="btn-tactile px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Replay Voice</span>
            </button>
          </div>
        </div>

        <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed min-h-[3.25rem] mb-3">
          {beat.line.slice(0, typedLen)}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">
            Click box or press Space / Enter to continue
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAdvance();
            }}
            className="btn-tactile px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 border-b-3 border-blue-800 text-white font-display font-extrabold text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isFinalBeat ? 'Begin 7-Sol Shift!' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
