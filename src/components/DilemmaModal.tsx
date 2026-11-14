import { Compass, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { BASE_STATIONS } from '../data/scienceData';
import { DilemmaCard, DilemmaOption } from '../types/game';
import { IncidentVisualCard, IncidentVisualId } from './IncidentVisualCard';

interface DilemmaModalProps {
  sol: number;
  totalSols: number;
  card: DilemmaCard;
  currentBudgetKw: number;
  onChoose: (option: DilemmaOption) => void;
}

const TONE_STYLES: Record<DilemmaOption['tone'], string> = {
  emerald: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/70',
  amber: 'bg-amber-50 border-amber-300 hover:border-amber-500 hover:bg-amber-100/70',
  sky: 'bg-sky-50 border-sky-300 hover:border-sky-500 hover:bg-sky-100/70',
  rose: 'bg-rose-50 border-rose-300 hover:border-rose-500 hover:bg-rose-100/70'
};

const NOW_BADGE_STYLES: Record<DilemmaOption['tone'], string> = {
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-amber-950',
  sky: 'bg-sky-600 text-white',
  rose: 'bg-rose-600 text-white'
};

export function DilemmaModal({
  sol,
  totalSols,
  card,
  currentBudgetKw,
  onChoose
}: DilemmaModalProps) {
  const station = BASE_STATIONS.find((s) => s.id === card.stationHint);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dilemma-title"
    >
      <div className="animate-modal-pop w-full max-w-xl rounded-3xl bg-white border-2 border-blue-200 shadow-2xl p-5 sm:p-6 my-auto text-slate-900">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 border-b-4 border-amber-600 flex items-center justify-center text-amber-950 shrink-0 shadow-xs">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular font-extrabold text-blue-700">
                <span>
                  SOL {sol} / {totalSols} · MORNING BRIEFING
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-amber-800">{card.badge}</span>
                {station && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{station.shortName}</span>
                  </>
                )}
              </div>
              <h2
                id="dilemma-title"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5"
              >
                {card.title}
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1">
            <span className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1">
              <Zap className="w-3 h-3" /> Grid
            </span>
            <span className="font-mono-tabular text-sm font-extrabold text-slate-900">
              {currentBudgetKw}⚡
            </span>
          </div>
        </div>

        {/* Visual Depiction of Morning Situation */}
        <div className="mb-3">
          <IncidentVisualCard id={card.id as IncidentVisualId} />
        </div>

        <p className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3.5 text-sm sm:text-base text-slate-800 font-semibold leading-relaxed mb-3.5">
          {card.story}
        </p>

        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
          Pick 1 Strategy Before Stepping Outside:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {card.options.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChoose(opt)}
              className={`group btn-tactile hover-option-card rounded-2xl border-2 border-b-4 p-3.5 text-left flex flex-col justify-between gap-2.5 cursor-pointer ${TONE_STYLES[opt.tone]}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-display font-extrabold text-base text-slate-900 leading-tight">
                    {opt.label}
                  </div>
                  <span className="w-7 h-7 rounded-xl bg-white/85 border border-slate-300 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                    {idx === 0 ? (
                      <Sparkles className="w-4 h-4 text-sky-700" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    )}
                  </span>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono-tabular font-extrabold ${NOW_BADGE_STYLES[opt.tone]}`}
                >
                  {opt.nowCostLabel}
                </span>
              </div>

              <div className="text-xs text-slate-700 font-bold border-t border-slate-900/10 pt-2">
                Impact: <span className="font-semibold text-slate-800">{opt.laterEffectLabel}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
