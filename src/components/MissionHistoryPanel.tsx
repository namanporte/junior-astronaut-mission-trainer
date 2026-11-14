import {
  AlertTriangle,
  Backpack,
  CheckCircle2,
  Compass,
  Droplets,
  History,
  Shield,
  Sprout,
  Sun,
  Thermometer,
  Wind,
  XCircle
} from 'lucide-react';
import { MissionTraceEntry } from '../types/game';
import { getFlareNickname } from '../utils/physicsSimulation';

interface MissionHistoryPanelProps {
  traceLog: MissionTraceEntry[];
  currentSol?: number;
  title?: string;
  subtitle?: string;
  maxHeightClass?: string;
}

export function MissionHistoryPanel({
  traceLog,
  currentSol,
  title = 'Mission Adventure Log',
  subtitle,
  maxHeightClass = 'max-h-44'
}: MissionHistoryPanelProps) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3.5 text-left"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-800">
          <History className="w-4 h-4 shrink-0" />
          <span>{title}</span>
          <span className="text-[11px] font-mono-tabular text-slate-600">
            · {traceLog.length} {traceLog.length === 1 ? 'Sol' : 'Sols'}
          </span>
        </div>
        {subtitle && <span className="text-[11px] font-bold text-slate-600">{subtitle}</span>}
      </div>

      {traceLog.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 px-3 py-3 text-xs text-slate-500 font-medium text-center">
          No adventure Sols logged yet.
        </div>
      ) : (
        <div className={`${maxHeightClass} overflow-y-auto space-y-2 pr-1`}>
          {traceLog.map((entry) => {
            const isCurrent = currentSol !== undefined && entry.sol === currentSol;
            const stormNickname = getFlareNickname(entry.severityLevel);

            return (
              <article
                key={entry.sol}
                className={`rounded-xl bg-white border-2 px-3 py-2.5 text-xs ${
                  isCurrent ? 'border-blue-400 shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0 font-bold">
                    <span className="font-mono-tabular font-extrabold text-slate-900">
                      Sol {entry.sol} ({entry.world})
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="inline-flex items-center gap-1 text-amber-800">
                      <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                      {stormNickname}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 font-extrabold ${
                      entry.shieldHeld ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {entry.shieldHeld ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Storm Blocked</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Storm Hit</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Decisions & Surprise Emergency Fixes */}
                {(entry.morningChoice ||
                  entry.surpriseDecisions.length > 0 ||
                  entry.gadgetsUsed.length > 0) && (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-700 font-semibold mb-1.5">
                    {entry.morningChoice && (
                      <span className="inline-flex items-center gap-1 text-indigo-800">
                        <Compass className="w-3 h-3 shrink-0" />
                        {entry.morningChoice}
                      </span>
                    )}
                    {entry.surpriseDecisions.map((d, idx) => (
                      <span
                        key={`${entry.sol}-s-${idx}`}
                        className="inline-flex items-center gap-1 text-rose-800"
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {d}
                      </span>
                    ))}
                    {entry.gadgetsUsed.map((g, idx) => (
                      <span
                        key={`${entry.sol}-g-${idx}`}
                        className="inline-flex items-center gap-1 text-amber-800"
                      >
                        <Backpack className="w-3 h-3 shrink-0" />
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tabular text-[11px] text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-sky-600" />
                    {entry.effectiveShieldKw}/{entry.requiredShieldKw}⚡
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-600" />
                    Air/H2O {entry.waterO2After}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sprout className="w-3 h-3 text-emerald-600" />
                    Crops {entry.cropsAfter}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-orange-600" />
                    {entry.cabinTempAfter}°C
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3 h-3 text-slate-500" />
                    {entry.co2PpmAfter} ppm
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">{entry.summaryNote}</div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
