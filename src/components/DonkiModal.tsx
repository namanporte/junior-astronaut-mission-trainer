import { useEffect } from 'react';
import { Calendar, Radio, Sun, X } from 'lucide-react';
import { FlareSeverity, SolarFlareEvent } from '../types/game';
import { getFlareNickname } from '../utils/physicsSimulation';

interface DonkiModalProps {
  currentSol: number;
  events: SolarFlareEvent[];
  radarHidden: boolean;
  onClose: () => void;
}

function getSeverityBadge(severity: FlareSeverity) {
  switch (severity) {
    case 'EXTREME':
      return 'text-rose-800 bg-rose-100 border-rose-300';
    case 'MODERATE':
      return 'text-amber-900 bg-amber-100 border-amber-300';
    default:
      return 'text-emerald-800 bg-emerald-100 border-emerald-300';
  }
}

export function DonkiModal({ currentSol, events, radarHidden, onClose }: DonkiModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeEvent = events[currentSol - 1] ?? events[0];
  const stormName = getFlareNickname(activeEvent.severityLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donki-modal-title"
    >
      <div className="animate-modal-pop w-full max-w-2xl rounded-3xl bg-white border-2 border-slate-200 shadow-2xl p-6 text-slate-900">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 border-b-2 border-amber-600 flex items-center justify-center text-amber-950 shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <h2 id="donki-modal-title" className="text-xl font-extrabold text-slate-900">
                Sun Storm Radar Forecast
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Check upcoming Sun Burps and Monster Blasts across all {events.length} Sols!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close forecast"
            className="btn-tactile w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 mb-4">
          {radarHidden ? (
            <div className="flex items-center gap-3 py-2 text-amber-900">
              <Radio className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <div className="font-display font-extrabold text-base">
                  Radar Static Interference!
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-700 mt-0.5">
                  Solar particles scrambled today&apos;s sensor dish! Keep extra Forcefield power or a
                  Sun-Bounce Blanket ready!
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-mono-tabular text-sm font-extrabold text-blue-700">
                  SOL {currentSol} · {stormName.toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg border text-xs font-extrabold ${getSeverityBadge(
                    activeEvent.severityLevel
                  )}`}
                >
                  NEED {activeEvent.requiredShieldKw}⚡ FORCEFIELD
                </span>
              </div>
              <p className="text-sm text-slate-800 font-medium leading-relaxed">
                {activeEvent.kidSummary}
              </p>
            </>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{events.length}-Sol Space Weather Planner</span>
          </div>
          <div
            className={`grid gap-1.5 ${
              events.length <= 5 ? 'grid-cols-5' : events.length === 6 ? 'grid-cols-6' : 'grid-cols-7'
            }`}
          >
            {events.map((evt, idx) => {
              const solNum = idx + 1;
              const isCurrent = solNum === currentSol;
              const isPast = solNum < currentSol;
              const isScrambled = radarHidden && isCurrent;
              const shortWeather =
                evt.severityLevel === 'EXTREME'
                  ? 'Monster!'
                  : evt.severityLevel === 'MODERATE'
                  ? 'Medium'
                  : 'Tiny Burp';

              return (
                <div
                  key={evt.flrID + solNum}
                  className={`hover-option-card hover-sfx rounded-xl p-2 text-center border-2 transition-colors ${
                    isCurrent
                      ? 'bg-sky-50 border-blue-500 text-slate-900 shadow-xs'
                      : isPast
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <div className="text-[11px] font-extrabold">Sol {solNum}</div>
                  <div
                    className={`font-display text-[11px] mt-0.5 font-extrabold ${
                      isScrambled
                        ? 'text-slate-500'
                        : evt.severityLevel === 'EXTREME'
                        ? 'text-rose-600'
                        : evt.severityLevel === 'MODERATE'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {isScrambled ? '???' : shortWeather}
                  </div>
                  <div className="text-[10px] font-mono-tabular font-bold opacity-85">
                    {isScrambled ? '? ⚡' : `${evt.requiredShieldKw}⚡`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
