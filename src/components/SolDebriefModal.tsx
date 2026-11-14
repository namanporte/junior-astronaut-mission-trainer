import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Headphones,
  Shield,
  Sparkles,
  Sprout,
  Thermometer,
  TriangleAlert,
  Umbrella,
  Volume2
} from 'lucide-react';
import { MissionTraceEntry, SolDebriefData } from '../types/game';
import { getFlareNickname } from '../utils/physicsSimulation';
import { radioVoiceEngine } from '../utils/radioVoiceEngine';
import { IncidentVisualCard } from './IncidentVisualCard';
import { MissionHistoryPanel } from './MissionHistoryPanel';

interface SolDebriefModalProps {
  debrief: SolDebriefData;
  totalSols: number;
  sandboxMode?: boolean;
  muted?: boolean;
  traceLog: MissionTraceEntry[];
  onNextSol: () => void;
}

export function SolDebriefModal({
  debrief,
  totalSols,
  sandboxMode = false,
  muted = false,
  traceLog,
  onNextSol
}: SolDebriefModalProps) {
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNextSol();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextSol]);

  const isFinalSol = !sandboxMode && debrief.sol >= totalSols;
  const { flareEvent, capcomMessage } = debrief;
  const stormNickname = getFlareNickname(flareEvent.severityLevel);

  useEffect(() => {
    radioVoiceEngine.play({
      text: capcomMessage,
      profile: 'RADIO',
      muted
    });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setTypedLength(capcomMessage.length);
      return;
    }

    setTypedLength(0);
    const interval = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= capcomMessage.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, 18);

    return () => {
      window.clearInterval(interval);
      radioVoiceEngine.stop();
    };
  }, [capcomMessage, muted]);

  const visibleCapcomText = capcomMessage.slice(0, typedLength);
  const baseSurvived =
    sandboxMode ||
    (debrief.endWaterO2 > 0 &&
      debrief.endCrops > 0 &&
      debrief.endTempC < 52 &&
      debrief.endCo2Ppm < 4500);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div className="animate-modal-pop w-full max-w-2xl rounded-3xl bg-white border-2 border-slate-200 shadow-2xl p-5 sm:p-6 my-auto text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <div className="text-xs font-mono-tabular font-extrabold text-blue-700">
              {sandboxMode
                ? `SANDBOX PRACTICE STORM · ${stormNickname.toUpperCase()}`
                : `${debrief.world} SOL ${debrief.sol} / ${totalSols} COMPLETE · ${stormNickname.toUpperCase()}`}
            </div>
            <h2 id="debrief-title" className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {sandboxMode ? 'Practice Storm Test Results' : `Sol ${debrief.sol} Space Physics Log`}
            </h2>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold flex items-center gap-1.5 ${
              debrief.sunBlanketSaved
                ? 'bg-amber-50 border-amber-400 text-amber-900'
                : debrief.shieldHeld
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {debrief.sunBlanketSaved ? (
              <>
                <Umbrella className="w-4 h-4 text-amber-600" />
                <span>Sun-Bounce Blanket Saved You!</span>
              </>
            ) : debrief.shieldHeld ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Storm Blocked!</span>
              </>
            ) : (
              <>
                <TriangleAlert className="w-4 h-4 text-rose-600" />
                <span>Sun Zap Hit ({debrief.radiationDamage}%)</span>
              </>
            )}
          </div>
        </div>

        {/* Storm Impact Visual Recap */}
        <div className="mb-3.5">
          <IncidentVisualCard
            id="storm-outcome"
            compact
            stormSeverity={flareEvent.severityLevel}
            shieldHeld={debrief.shieldHeld}
            sunBlanketSaved={debrief.sunBlanketSaved}
            customCaption={
              debrief.sunBlanketSaved
                ? `Your Sun-Bounce Blanket reflected the ${stormNickname} safely off the habitat dome!`
                : debrief.shieldHeld
                ? `Forcefield (${debrief.effectiveShieldPower}⚡) blocked the ${stormNickname} (${flareEvent.requiredShieldKw}⚡ needed)!`
                : `${stormNickname} (${flareEvent.requiredShieldKw}⚡) slipped past ${debrief.effectiveShieldPower}⚡ Forcefield (-${debrief.radiationDamage}% impact)!`
            }
          />
        </div>

        {/* 4 Physics Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
          <div className="rounded-2xl bg-cyan-50 border-2 border-cyan-200 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              <span>Air &amp; Water</span>
            </div>
            <div className="font-mono-tabular text-xl font-extrabold text-slate-900">
              {debrief.endWaterO2}%
            </div>
            <div className="text-[11px] font-semibold text-slate-600">
              Started {Math.round(debrief.startWaterO2)}%
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
              <span>Crops</span>
            </div>
            <div className="font-mono-tabular text-xl font-extrabold text-slate-900">
              {debrief.endCrops}%
            </div>
            <div className="text-[11px] font-semibold text-slate-600">
              Started {Math.round(debrief.startCrops)}%
            </div>
          </div>

          <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-orange-600" />
              <span>Temp &amp; CO2</span>
            </div>
            <div className="font-mono-tabular text-lg font-extrabold text-slate-900">
              {debrief.endTempC}°C
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-slate-600">
              {debrief.endCo2Ppm} ppm CO2
            </div>
          </div>

          <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              <span>Forcefield</span>
            </div>
            <div className="font-mono-tabular text-xl font-extrabold text-sky-900">
              {debrief.effectiveShieldPower}⚡
            </div>
            <div className="text-[11px] font-semibold text-slate-600">
              Needed {flareEvent.requiredShieldKw}⚡
            </div>
          </div>
        </div>

        {/* EARTH BUDDY RADIO DEBRIEF WITH REAL RADIO VOICE */}
        <div className="rounded-2xl bg-sky-50 border-2 border-sky-300 p-3.5 mb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
                EARTH BUDDY RADIO CHECK-IN
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  radioVoiceEngine.play({
                    text: capcomMessage,
                    profile: 'RADIO',
                    muted
                  })
                }
                className="btn-tactile px-2 py-0.5 rounded-lg bg-white border border-sky-300 text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                <span>Play Radio</span>
              </button>

              <span className="px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-800 text-[11px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>{debrief.capcomAiPowered ? 'Live AI Helper' : 'Space Radio'}</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-800 font-semibold leading-relaxed min-h-[2.5rem]">
            {visibleCapcomText}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3 mb-3.5 flex items-start gap-2.5">
          <Sprout className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
            <strong className="text-emerald-900">Real Space Physics:</strong>{' '}
            {debrief.spacePhysicsLesson}
          </p>
        </div>

        <div className="mb-4">
          <MissionHistoryPanel
            traceLog={traceLog}
            currentSol={debrief.sol}
            title="Mission Adventure Log"
            maxHeightClass="max-h-40"
          />
        </div>

        <button
          type="button"
          onClick={onNextSol}
          className="group btn-tactile w-full min-h-[50px] px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 active:border-b-0 text-white font-display font-extrabold text-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {sandboxMode
              ? 'Return to Sandbox Lab'
              : !baseSurvived
              ? 'See Mission Report'
              : isFinalSol
              ? 'Finish Mission & See Badge!'
              : `Next Morning (Sol ${debrief.sol + 1})`}
          </span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
