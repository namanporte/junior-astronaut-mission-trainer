import { useEffect } from 'react';
import { Calendar, Sun, X } from 'lucide-react';
import { formatFlareDate } from '../services/nasaDonkiService';
import { DonkiDataSource, FlareSeverity, SolarFlareEvent } from '../types/game';

interface DonkiModalProps {
  currentSol: number;
  events: SolarFlareEvent[];
  dataSource: DonkiDataSource;
  onClose: () => void;
}

function getSeverityBadge(severity: FlareSeverity) {
  switch (severity) {
    case 'EXTREME':
      return 'text-rose-300 bg-rose-500/15 border-rose-400/40';
    case 'MODERATE':
      return 'text-amber-300 bg-amber-500/15 border-amber-400/40';
    default:
      return 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40';
  }
}

export function DonkiModal({ currentSol, events, dataSource, onClose }: DonkiModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeEvent = events[currentSol - 1] ?? events[0];
  const isLive = dataSource === 'LIVE_NASA_API';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donki-modal-title"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-[#111830] border border-cyan-400/30 shadow-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="donki-modal-title" className="text-xl font-bold text-white">
                  NASA DONKI Space Weather
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                    isLive
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                  }`}
                >
                  {isLive ? 'LIVE NASA DONKI API' : 'CURATED NASA DONKI / OSDR ARCHIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real solar flare telemetry mapped across Sol 1 to Sol {events.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close forecast"
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Sol Card */}
        <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="font-mono-tabular text-sm font-bold text-cyan-300">
              SOL {currentSol} · CLASS {activeEvent.classType}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${getSeverityBadge(
                activeEvent.severityLevel
              )}`}
            >
              {activeEvent.severityLevel} · NEED {activeEvent.requiredShieldKw} kW SHIELD
            </span>
          </div>
          <p className="text-sm text-slate-100 leading-relaxed mb-3">{activeEvent.kidSummary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 bg-[#0E152B] rounded-xl p-2.5 border border-slate-800">
            <div>
              <span className="text-slate-400 block">NASA Flare ID</span>
              <span className="font-mono-tabular font-semibold break-all">{activeEvent.flrID}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Sun Coordinates</span>
              <span className="font-mono-tabular font-semibold">{activeEvent.sourceLocation}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Peak Time</span>
              <span className="font-mono-tabular font-semibold">
                {formatFlareDate(activeEvent.peakTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Sol Forecast Overview */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>{events.length}-Sol Solar Weather Progression</span>
          </div>
          <div
            className={`grid gap-1.5 ${
              events.length === 5 ? 'grid-cols-5' : 'grid-cols-7'
            }`}
          >
            {events.map((evt, idx) => {
              const solNum = idx + 1;
              const isCurrent = solNum === currentSol;
              const isPast = solNum < currentSol;
              return (
                <div
                  key={evt.flrID + solNum}
                  className={`rounded-xl p-2 text-center border transition-colors ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : isPast
                      ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                      : 'bg-[#151D38] border-slate-700/70 text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold">Sol {solNum}</div>
                  <div className="font-mono-tabular text-xs mt-0.5 font-bold text-amber-300">
                    {evt.classType}
                  </div>
                  <div className="text-[10px] opacity-80">{evt.requiredShieldKw} kW</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
