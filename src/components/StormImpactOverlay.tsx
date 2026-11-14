import { Shield, Sun, Umbrella, Zap } from 'lucide-react';
import { SolarFlareEvent } from '../types/game';
import { getFlareNickname } from '../utils/physicsSimulation';
import { IncidentVisualCard } from './IncidentVisualCard';

interface StormImpactOverlayProps {
  sol: number;
  flareEvent: SolarFlareEvent;
  effectiveShieldKw: number;
  sunBlanketActive: boolean;
}

export function StormImpactOverlay({
  sol,
  flareEvent,
  effectiveShieldKw,
  sunBlanketActive
}: StormImpactOverlayProps) {
  const stormName = getFlareNickname(flareEvent.severityLevel);
  const shieldWillHold = effectiveShieldKw >= flareEvent.requiredShieldKw || sunBlanketActive;
  const fillPct = Math.min(
    100,
    Math.round((effectiveShieldKw / Math.max(1, flareEvent.requiredShieldKw)) * 100)
  );

  const severityStyles =
    flareEvent.severityLevel === 'EXTREME'
      ? {
          ring: 'border-rose-400',
          titleColor: 'text-rose-300',
          barColor: 'bg-rose-500',
          glow: 'shadow-[0_0_40px_rgba(244,63,94,0.45)]'
        }
      : flareEvent.severityLevel === 'MODERATE'
      ? {
          ring: 'border-amber-400',
          titleColor: 'text-amber-300',
          barColor: 'bg-amber-400',
          glow: 'shadow-[0_0_32px_rgba(245,158,11,0.4)]'
        }
      : {
          ring: 'border-yellow-300',
          titleColor: 'text-yellow-200',
          barColor: 'bg-yellow-300',
          glow: 'shadow-[0_0_24px_rgba(253,224,71,0.35)]'
        };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-4"
      aria-live="assertive"
    >
      {/* Screen-edge animated solar flare pulse */}
      <div
        className={`fixed inset-0 border-8 ${
          flareEvent.severityLevel === 'EXTREME'
            ? 'border-rose-500/55 bg-rose-500/10'
            : flareEvent.severityLevel === 'MODERATE'
            ? 'border-amber-400/50 bg-amber-400/10'
            : 'border-yellow-300/40 bg-yellow-300/5'
        } animate-pulse`}
      />

      <div
        className={`animate-outpost-shake w-full max-w-lg rounded-3xl bg-slate-950/92 border-2 ${severityStyles.ring} ${severityStyles.glow} p-4 sm:p-5 text-slate-100`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="animate-burp-pulse w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono-tabular font-extrabold text-sky-300">
                SOL {sol} · LIVE SOLAR WAVE IMPACT
              </div>
              <h2 className={`font-display text-lg sm:text-xl font-extrabold ${severityStyles.titleColor}`}>
                {stormName} Hitting Base!
              </h2>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-xl border text-xs font-extrabold flex items-center gap-1 ${
              shieldWillHold
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-rose-500/25 border-rose-400 text-rose-200'
            }`}
          >
            {sunBlanketActive ? (
              <>
                <Umbrella className="w-3.5 h-3.5" />
                <span>Blanket Ready!</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>{shieldWillHold ? 'Dome Holding!' : 'Brace for Zap!'}</span>
              </>
            )}
          </div>
        </div>

        {/* Live Storm Graphic */}
        <div className="mb-3">
          <IncidentVisualCard
            id="storm-preview"
            compact
            stormSeverity={flareEvent.severityLevel}
            customCaption={
              shieldWillHold
                ? `Forcefield (${effectiveShieldKw}⚡) is deflecting the ${stormName.toLowerCase()} wave!`
                : `Storm needs ${flareEvent.requiredShieldKw}⚡ — your dome only has ${effectiveShieldKw}⚡!`
            }
          />
        </div>

        {/* Shield vs. Storm Power Clash Bar */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3">
          <div className="flex items-center justify-between text-xs font-mono-tabular font-extrabold mb-1.5">
            <span className="text-sky-300 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Your Forcefield: {effectiveShieldKw}⚡
            </span>
            <span className="text-amber-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Storm Blast: {flareEvent.requiredShieldKw}⚡
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                shieldWillHold ? 'bg-gradient-to-r from-sky-400 to-emerald-400' : severityStyles.barColor
              }`}
              style={{ width: `${Math.max(8, fillPct)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
