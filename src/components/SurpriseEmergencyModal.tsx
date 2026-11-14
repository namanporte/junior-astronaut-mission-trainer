import { AlertTriangle, CheckCircle2, Compass, ShieldAlert, Wrench, Zap } from 'lucide-react';
import { BASE_STATIONS } from '../data/scienceData';
import { BackpackInventory, SurpriseEmergency, SurpriseOption } from '../types/game';
import { IncidentVisualCard, IncidentVisualId } from './IncidentVisualCard';

interface SurpriseEmergencyModalProps {
  emergency: SurpriseEmergency;
  backpack: BackpackInventory;
  handsOnBonus: boolean;
  onChooseOption: (option: SurpriseOption) => void;
  onDismissForNow: () => void;
}

const OPTION_TONE: Record<SurpriseOption['tone'], string> = {
  emerald: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500',
  amber: 'bg-amber-50 border-amber-300 hover:border-amber-500',
  sky: 'bg-sky-50 border-sky-300 hover:border-sky-500',
  rose: 'bg-rose-50 border-rose-300 hover:border-rose-500'
};

export function SurpriseEmergencyModal({
  emergency,
  backpack,
  handsOnBonus,
  onChooseOption,
  onDismissForNow
}: SurpriseEmergencyModalProps) {
  const station = BASE_STATIONS.find((s) => s.id === emergency.stationId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="surprise-title"
    >
      <div className="animate-modal-pop w-full max-w-2xl rounded-3xl bg-white border-2 border-rose-300 shadow-2xl p-5 sm:p-6 my-auto text-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border-b-4 flex items-center justify-center shrink-0 ${
                emergency.severity === 'CRITICAL'
                  ? 'bg-rose-500 border-rose-700 text-white'
                  : 'bg-amber-400 border-amber-600 text-amber-950'
              }`}
            >
              {emergency.severity === 'CRITICAL' ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono-tabular font-extrabold text-rose-700">
                <span>SURPRISE {emergency.severity} ALERT</span>
                <span className="text-slate-400">·</span>
                <span className="text-blue-700">{station?.name ?? emergency.stationId}</span>
              </div>
              <h2 id="surprise-title" className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {emergency.title}
              </h2>
            </div>
          </div>

          {handsOnBonus ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>On-Site Repair Discount Active!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold">
              <Compass className="w-4 h-4 text-sky-600" />
              <span>Tip: Walk to {station?.shortName} for cheaper repairs!</span>
            </div>
          )}
        </div>

        {/* Visual Depiction of Exact Space Problem */}
        <div className="mb-3">
          <IncidentVisualCard id={emergency.id as IncidentVisualId} />
        </div>

        <p className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3.5 text-sm sm:text-base font-bold text-slate-900 leading-relaxed mb-2.5">
          {emergency.description}
        </p>

        <div className="rounded-2xl bg-sky-50 border border-sky-200 px-3.5 py-2 mb-3.5 text-xs sm:text-sm font-medium text-sky-950 flex items-start gap-2">
          <Wrench className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-sky-900">Real Space Physics:</strong> {emergency.physicsFact}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {emergency.options.map((opt, idx) => {
            const missingItem = opt.requiresItem ? backpack[opt.requiresItem] <= 0 : false;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={missingItem}
                onClick={() => onChooseOption(opt)}
                className={`group btn-tactile hover-option-card rounded-2xl border-2 border-b-4 p-3.5 text-left flex flex-col justify-between gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  OPTION_TONE[opt.tone]
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-display font-extrabold text-base text-slate-900 leading-tight">
                      {opt.label}
                    </div>
                    <span className="w-7 h-7 rounded-xl bg-white/80 border border-slate-300 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                      {idx === 0 ? (
                        <Wrench className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Zap className="w-4 h-4 text-amber-700" />
                      )}
                    </span>
                  </div>
                  <div className="text-xs font-mono-tabular font-extrabold text-slate-700">
                    {missingItem ? 'Out of 3D Filament Spools!' : opt.costSummary}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-700 border-t border-slate-900/10 pt-2">
                  {opt.outcomeSummary}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDismissForNow}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Walk to {station?.shortName ?? 'station'} first before choosing
          </button>
        </div>
      </div>
    </div>
  );
}
