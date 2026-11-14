import { AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';
import { PowerAllocation, SolarFlareEvent } from '../types/game';

interface CrisisBannerProps {
  flareEvent: SolarFlareEvent;
  countdown: number;
  power: PowerAllocation;
  onResolveCrisis: () => void;
}

export function CrisisBanner({
  flareEvent,
  countdown,
  power,
  onResolveCrisis
}: CrisisBannerProps) {
  const isExtreme = flareEvent.severityLevel === 'EXTREME';
  const targetKw = flareEvent.requiredShieldKw;
  const targetMet = power.shielding >= targetKw;

  return (
    <div
      role="alert"
      className={`w-full rounded-2xl border-2 px-4 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shrink-0 transition-colors ${
        isExtreme
          ? 'bg-[#310D1D] border-rose-500 shadow-[0_0_32px_rgba(244,63,94,0.45)]'
          : 'bg-[#281422] border-amber-500 shadow-[0_0_26px_rgba(245,158,11,0.3)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
            isExtreme
              ? 'bg-rose-500/25 border-rose-400 text-rose-300'
              : 'bg-amber-500/20 border-amber-400 text-amber-300'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${
                isExtreme ? 'text-rose-300' : 'text-amber-300'
              }`}
            >
              {isExtreme ? 'SOLAR SUPER-STORM COUNTDOWN' : 'SPACE WEATHER ALERT'}
            </span>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="font-display font-bold text-base text-white">
              Class {flareEvent.classType} Flare at Region {flareEvent.sourceLocation}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-rose-100 mt-0.5">
            {isExtreme
              ? `Extreme X-Class burst! Boost Radiation Shielding to ${targetKw} kW before 0s or Crew Health drops -${flareEvent.radiationDamage}%!`
              : `M-Class solar flare hitting in ${countdown}s! Boost Radiation Shielding to at least ${targetKw} kW or take -${flareEvent.radiationDamage}% damage!`}
          </p>
        </div>
      </div>

      {/* Live Shield Check + 10s Timer */}
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end shrink-0">
        <div
          className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-mono-tabular font-bold flex items-center gap-1.5 ${
            targetMet
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
              : 'bg-rose-950/80 border-rose-400/60 text-rose-200'
          }`}
        >
          {targetMet ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <Shield className="w-4 h-4 text-rose-300" />
          )}
          <span>
            Shielding: {power.shielding} / {targetKw} kW
          </span>
        </div>

        {targetMet && (
          <button
            type="button"
            onClick={onResolveCrisis}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#06120E] font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Shields Locked! Continue
          </button>
        )}

        <div
          className={`min-w-[82px] min-h-[44px] px-3 py-1.5 rounded-xl text-white font-mono-tabular font-extrabold text-base flex items-center justify-center gap-1.5 shadow-lg ${
            isExtreme ? 'bg-rose-600' : 'bg-amber-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{countdown}s</span>
        </div>
      </div>
    </div>
  );
}
