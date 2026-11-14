import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Headphones,
  HeartPulse,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  TriangleAlert
} from 'lucide-react';
import { formatFlareDate } from '../services/nasaDonkiService';
import { DonkiDataSource, SolDebriefData } from '../types/game';
import { GlossaryTerm } from './GlossaryTerm';

interface SolDebriefModalProps {
  debrief: SolDebriefData;
  totalSols: number;
  dataSource: DonkiDataSource;
  onNextSol: () => void;
}

function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}%`;
  return `${delta}%`;
}

export function SolDebriefModal({
  debrief,
  totalSols,
  dataSource,
  onNextSol
}: SolDebriefModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNextSol();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextSol]);

  const isFinalSol = debrief.sol >= totalSols;
  const { flareEvent, capcomMessage } = debrief;
  const isLive = dataSource === 'LIVE_NASA_API';

  useEffect(() => {
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

    return () => window.clearInterval(interval);
  }, [capcomMessage]);

  const rawTelemetrySnippet = JSON.stringify(
    {
      flrID: flareEvent.flrID,
      beginTime: flareEvent.beginTime,
      peakTime: flareEvent.peakTime,
      classType: flareEvent.classType,
      sourceLocation: flareEvent.sourceLocation,
      osdrUnshieldedMsvPerDay: debrief.unshieldedDoseMsv,
      osdrShieldedMsvPerDay: debrief.osdrDoseMsv
    },
    null,
    2
  );

  const visibleCapcomText = capcomMessage.slice(0, typedLength);
  const isTyping = typedLength < capcomMessage.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/82 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-[#111830] border border-cyan-400/35 shadow-[0_0_45px_rgba(6,182,212,0.2)] p-5 sm:p-6 my-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <div className="text-xs font-mono-tabular font-bold text-cyan-300">
              SOL {debrief.sol} / {totalSols} COMPLETE
            </div>
            <h2 id="debrief-title" className="text-xl sm:text-2xl font-bold text-white">
              Sol {debrief.sol} Mission Debrief
            </h2>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              debrief.shieldHeld
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
            }`}
          >
            {debrief.shieldHeld ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Flare Deflected!</span>
              </>
            ) : (
              <>
                <TriangleAlert className="w-4 h-4" />
                <span>Radiation Impact ({debrief.radiationPenalty}%)</span>
              </>
            )}
          </div>
        </div>

        {/* 4 Compact Telemetry Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>Life Support</span>
            </div>
            <div className="font-mono-tabular text-xl font-bold text-white">
              {debrief.endLifeSupport}%
            </div>
            <div
              className={`font-mono-tabular text-xs font-bold ${
                debrief.lifeSupportDelta > 0
                  ? 'text-emerald-300'
                  : debrief.lifeSupportDelta < 0
                  ? 'text-rose-300'
                  : 'text-slate-400'
              }`}
            >
              {formatDelta(debrief.lifeSupportDelta)} today
            </div>
          </div>

          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Base Shield</span>
            </div>
            <div className="font-mono-tabular text-xl font-bold text-cyan-300">
              {debrief.shieldPowerUsed} kW
            </div>
            <div className="text-xs text-slate-400">Needed {flareEvent.requiredShieldKw} kW</div>
          </div>

          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>OSDR Dose</span>
            </div>
            <div
              className={`font-mono-tabular text-xl font-bold ${
                debrief.osdrDoseMsv <= 1.0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {debrief.osdrDoseMsv}
            </div>
            <div className="text-xs text-slate-400">mSv/day</div>
          </div>

          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Flare Class</span>
            </div>
            <div className="font-mono-tabular text-xl font-bold text-amber-300">
              {flareEvent.classType}
            </div>
            <div className="text-xs text-slate-400">{flareEvent.severityLevel}</div>
          </div>
        </div>

        {/* Compounding Tradeoff Warning / Recovery */}
        {debrief.cropPenaltyTriggeredNextSol && (
          <div className="rounded-xl bg-amber-950/60 border border-amber-400/50 px-3.5 py-2.5 mb-3.5 text-xs sm:text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>
              <strong>Compounding Tradeoff:</strong> Diverting power away from Life Support today
              lowered tomorrow&apos;s <GlossaryTerm term="Hydroponics" /> crop yield by{' '}
              <strong>15%</strong>! Plan +10 kW extra Life Support power tomorrow to recover.
            </span>
          </div>
        )}

        {/* CAPCOM LIVE TRANSMISSION */}
        <div className="rounded-2xl bg-[#091D34] border-2 border-cyan-400/70 shadow-[0_0_24px_rgba(34,211,238,0.22)] p-3.5 mb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cyan-400/20 border border-cyan-300/50 flex items-center justify-center text-cyan-200">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                CAPCOM LIVE TRANSMISSION
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{debrief.capcomAiPowered ? 'Powered by Gemini AI' : 'Mission Control Log'}</span>
            </span>
          </div>

          <p className="text-sm text-white font-medium leading-relaxed min-h-[2.75rem]">
            {visibleCapcomText}
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-300 align-middle animate-pulse" />
            )}
          </p>
        </div>

        {/* CSA Lunar Food Science Fact Box */}
        <div className="rounded-2xl bg-emerald-950/35 border border-emerald-400/35 px-4 py-3 mb-3.5 flex items-start gap-2.5">
          <Sprout className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            {debrief.csaFoodFact}
          </p>
        </div>

        {/* Highlighted Real NASA Event Box */}
        <div className="rounded-2xl bg-[#0E1836] border border-amber-400/35 p-3.5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Sun className="w-4 h-4" />
              <span>Real NASA Event Telemetry</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRawJson((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showRawJson ? 'Hide Raw NASA Telemetry' : 'View Raw NASA Telemetry'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
            <div className="rounded-xl bg-[#0A1022] border border-slate-800 p-2">
              <span className="text-slate-400 block">Real NASA Flare ID</span>
              <span className="font-mono-tabular font-bold text-white break-all">
                {flareEvent.flrID}
              </span>
            </div>
            <div className="rounded-xl bg-[#0A1022] border border-slate-800 p-2">
              <span className="text-slate-400 block">Date &amp; Sun Coordinates</span>
              <span className="font-mono-tabular font-bold text-cyan-200">
                {formatFlareDate(flareEvent.beginTime)} · {flareEvent.sourceLocation}
              </span>
            </div>
            <div className="rounded-xl bg-[#0A1022] border border-slate-800 p-2">
              <span className="text-slate-400 block">OSDR Dose (Unshielded → Yours)</span>
              <span className="font-mono-tabular font-bold text-amber-300">
                {debrief.unshieldedDoseMsv} → {debrief.osdrDoseMsv} mSv/d
              </span>
            </div>
          </div>

          <div className="text-xs text-amber-100 leading-relaxed mb-2">
            <strong className="text-amber-300">Why It Matters:</strong> {debrief.whyItMattersNote}
          </div>

          {/* Honest Source Attribution Footer */}
          <div className="text-[11px] font-mono-tabular text-slate-400 border-t border-slate-800 pt-2">
            Source:{' '}
            <strong className={isLive ? 'text-emerald-300' : 'text-cyan-300'}>
              {isLive ? 'LIVE NASA DONKI API' : 'CURATED NASA DONKI / OSDR ARCHIVE'}
            </strong>{' '}
            · CSA Lunar Food Science
          </div>

          {showRawJson && (
            <pre className="mt-2.5 rounded-xl bg-[#070B18] border border-slate-700 p-3 text-xs font-mono-tabular text-emerald-300 overflow-x-auto">
              {rawTelemetrySnippet}
            </pre>
          )}
        </div>

        <button
          type="button"
          onClick={onNextSol}
          className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-[#071020] font-display font-bold text-lg shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {debrief.endLifeSupport <= 0
              ? 'View Mission Result'
              : isFinalSol
              ? 'Finish Mission & View Traceability Log'
              : `Next Sol (Sol ${debrief.sol + 1})`}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
