import {
  Activity,
  Droplets,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Shield,
  Sprout,
  Sun,
  Thermometer,
  Volume2,
  VolumeX,
  Wind,
  Zap
} from 'lucide-react';
import {
  BaseSystemsState,
  DifficultyMode,
  GamePhase,
  PowerAllocation,
  SolarFlareEvent,
  WorldBody
} from '../types/game';
import {
  getGravityLabel,
  getTotalAllocatedPower
} from '../utils/physicsSimulation';

interface HudTopBarProps {
  world: WorldBody;
  mode: DifficultyMode;
  siteName: string;
  sol: number;
  totalSols: number;
  phase: GamePhase;
  shiftSecondsLeft: number;
  maxGridBudgetKw: number;
  power: PowerAllocation;
  systems: BaseSystemsState;
  upcomingFlare: SolarFlareEvent | null;
  muted: boolean;
  onOpenForecast: () => void;
  onOpenHelp: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
}

export function HudTopBar({
  world,
  mode,
  siteName,
  sol,
  totalSols,
  phase,
  shiftSecondsLeft,
  maxGridBudgetKw,
  power,
  systems,
  upcomingFlare,
  muted,
  onOpenForecast,
  onOpenHelp,
  onToggleMute,
  onRestart
}: HudTopBarProps) {
  const allocated = getTotalAllocatedPower(power);
  const freeKw = Math.max(0, maxGridBudgetKw - allocated);
  const effectiveShield = power.shieldingKw + systems.nextSolShieldBonusKw;
  const requiredShield = upcomingFlare?.requiredShieldKw ?? 20;

  const isSandbox = mode === 'SANDBOX';
  const waterLow = systems.waterO2Pct <= 30;
  const cropsLow = systems.cropsPct <= 30 || systems.bioContamActive;
  const tempHot = systems.cabinTempC >= 36;
  const tempCold = systems.cabinTempC <= 12;
  const co2High = systems.co2Ppm >= 1600;
  const shieldReady = !systems.radarScrambled && effectiveShield >= requiredShield;

  return (
    <header className="pointer-events-auto w-full max-w-[1260px] mx-auto rounded-2xl bg-slate-950/92 border border-slate-700/90 shadow-xl px-3.5 py-2 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: World, Gravity & Mode / Timer */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isSandbox
                ? 'bg-indigo-500/25 border-indigo-400/60 text-indigo-300'
                : world === 'MOON'
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                : 'bg-orange-500/20 border-orange-400/50 text-orange-300'
            }`}
          >
            {isSandbox ? <FlaskConical className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold tracking-wide">
              <span className={world === 'MOON' ? 'text-sky-300' : 'text-orange-300'}>
                {getGravityLabel(world)}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-200 truncate max-w-[160px]">{siteName}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular font-bold text-slate-300">
              {isSandbox ? (
                <span className="text-indigo-300 font-extrabold">
                  SANDBOX SAFE MODE · No Game Over
                </span>
              ) : (
                <>
                  <span>
                    Sol {sol}/{totalSols}
                  </span>
                  <span className="text-slate-500">·</span>
                  {phase === 'STORM_SIM' ? (
                    <span className="text-amber-300 font-extrabold">STORM IMPACT!</span>
                  ) : (
                    <span className={shiftSecondsLeft <= 8 ? 'text-amber-300' : 'text-emerald-300'}>
                      Shift {shiftSecondsLeft}s
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Physics Readouts */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 font-mono-tabular text-xs font-bold">
          <div className="flex items-center gap-1 text-amber-300" title="Available Grid Power">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>
              {freeKw}⚡ free <span className="text-slate-400 font-normal">/{maxGridBudgetKw}</span>
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${waterLow ? 'text-rose-400' : 'text-cyan-300'}`}
            title="Drinking Water & Electrolysis Oxygen"
          >
            <Droplets className="w-3.5 h-3.5 shrink-0" />
            <span>
              Air/H2O {Math.round(systems.waterO2Pct)}%
              {systems.hullLeakActive ? ' (LEAK!)' : waterLow ? ' (LOW!)' : ''}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${cropsLow ? 'text-rose-400' : 'text-emerald-300'}`}
            title="Hydroponics Space Veggies"
          >
            <Sprout className="w-3.5 h-3.5 shrink-0" />
            <span>
              Crops {Math.round(systems.cropsPct)}%
              {systems.bioContamActive ? ' (MOLD!)' : systems.perchlorateLock ? ' (SALT)' : ''}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${
              tempHot ? 'text-rose-400' : tempCold ? 'text-sky-300' : 'text-orange-200'
            }`}
            title="Habitat Temperature (Vacuum Radiator Loop)"
          >
            <Thermometer className="w-3.5 h-3.5 shrink-0" />
            <span>
              {systems.cabinTempC.toFixed(1)}°C
              {tempHot ? ' (HOT!)' : tempCold ? ' (COLD!)' : ''}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${co2High ? 'text-amber-300' : 'text-slate-200'}`}
            title="Cabin CO2 Concentration"
          >
            <Wind className="w-3.5 h-3.5 shrink-0" />
            <span>
              {systems.co2Ppm} ppm{co2High ? ' (FOG!)' : ''}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 ${
              systems.radarScrambled
                ? 'text-amber-300'
                : shieldReady
                ? 'text-sky-300'
                : 'text-rose-300'
            }`}
            title="Forcefield Power vs Solar Storm"
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>
              Shield {effectiveShield}⚡/{systems.radarScrambled ? '?⚡' : `${requiredShield}⚡`}
            </span>
          </div>
        </div>

        {/* Right: Utility Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenForecast}
            className="btn-tactile px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Radar</span>
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Mission Guide"
            className="btn-tactile w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="btn-tactile w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart Mission"
            className="btn-tactile w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
