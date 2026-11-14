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
import nasaOfficeImg from '../assets/images/nasa_office_briefing_1794695063958.jpg';
import landerDescentImg from '../assets/images/outpost_lander_descent_1794695064580.jpg';
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
        isArrivalScene ? 'bg-slate-950/20 pointer-events-auto' : 'bg-[#060C1A] pointer-events-auto'
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

      {/* Center Realistic Aerospace Illustration for NASA Office & Rocket Transit */}
      {!isArrivalScene ? (
        <div className="w-full max-w-4xl mx-auto my-auto py-2">
          <div className="rounded-3xl bg-slate-950 border-2 border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="relative aspect-16/9 max-h-[44vh] w-full overflow-hidden">
              <img
                src={beat.scene === 'NASA_OFFICE' ? nasaOfficeImg : landerDescentImg}
                alt={
                  beat.scene === 'NASA_OFFICE'
                    ? 'NASA Mission Control Briefing Office in Houston'
                    : `Spacecraft descending toward ${world === 'MOON' ? 'Moon' : 'Mars'} outpost`
                }
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent px-4 py-2.5">
                <div className="text-xs font-bold text-sky-200">{beat.sceneHint}</div>
              </div>
            </div>
          </div>
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
