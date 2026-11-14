import {
  Database,
  HeartPulse,
  HelpCircle,
  Rocket,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import {
  DifficultyMode,
  DonkiDataSource,
  SolarFlareEvent
} from '../types/game';
import { GlossaryTerm } from './GlossaryTerm';

interface FloatingDeltas {
  lifeSupport: number;
  key: number;
}

interface TopStatusHeaderProps {
  sol: number;
  totalSols: number;
  mode: DifficultyMode;
  siteLabel: string;
  remainingPowerKw: number;
  maxPowerBudget: number;
  lifeSupportLevel: number;
  shieldStrength: number;
  osdrDoseMsv: number;
  flareEvent: SolarFlareEvent;
  dataSource: DonkiDataSource;
  isLoadingDonki: boolean;
  floatingDeltas: FloatingDeltas | null;
  muted: boolean;
  missionElapsedSec: number;
  onToggleMute: () => void;
  onOpenDonki: () => void;
  onOpenSources: () => void;
  onOpenHelp: () => void;
  onResetMission: () => void;
}

function formatMetClock(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

function getLifeSupportColors(value: number) {
  if (value >= 60) return { bar: 'bg-emerald-400', text: 'text-emerald-300' };
  if (value >= 30) return { bar: 'bg-amber-400', text: 'text-amber-300' };
  return { bar: 'bg-rose-500', text: 'text-rose-300' };
}

function getShieldColors(value: number) {
  if (value >= 70) return { bar: 'bg-cyan-400', text: 'text-cyan-300' };
  if (value >= 40) return { bar: 'bg-amber-400', text: 'text-amber-300' };
  return { bar: 'bg-rose-400', text: 'text-rose-300' };
}

export function TopStatusHeader({
  sol,
  totalSols,
  mode,
  siteLabel,
  remainingPowerKw,
  maxPowerBudget,
  lifeSupportLevel,
  shieldStrength,
  osdrDoseMsv,
  flareEvent,
  dataSource,
  isLoadingDonki,
  floatingDeltas,
  muted,
  missionElapsedSec,
  onToggleMute,
  onOpenDonki,
  onOpenSources,
  onOpenHelp,
  onResetMission
}: TopStatusHeaderProps) {
  const lifeColors = getLifeSupportColors(lifeSupportLevel);
  const shieldColors = getShieldColors(shieldStrength);
  const powerPct = Math.round(((maxPowerBudget - remainingPowerKw) / maxPowerBudget) * 100);
  const isLive = dataSource === 'LIVE_NASA_API';

  return (
    <header className="w-full rounded-2xl bg-[#0E152B] border border-slate-700/80 px-3.5 py-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
      {/* Brand, Sol Counter & MET Clock */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
          <Rocket className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-sm sm:text-base text-white leading-tight whitespace-nowrap">
              Junior Astronaut
            </h1>
            <span
              className="instrument-bezel px-1.5 py-0.5 rounded border border-slate-700/80 font-mono-tabular text-[10px] font-bold text-cyan-300 tracking-tight whitespace-nowrap"
              title="Mission Elapsed Time"
            >
              MET T+ {formatMetClock(missionElapsedSec)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono-tabular font-bold mt-0.5">
            <span>
              <GlossaryTerm term="Sol">SOL</GlossaryTerm> {sol} / {totalSols}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-300 font-sans font-medium truncate max-w-[130px]">
              {mode === 'CADET' ? 'Cadet' : 'Cmdr'} · {siteLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Core Resource Gauges in Recessed Aerospace Instrument Bezels */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-w-[290px] max-w-2xl">
        {/* 1. Power Grid */}
        <div className="instrument-bezel rounded-xl border border-slate-800 px-2.5 py-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-slate-200 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Power Grid</span>
              <span className="sm:hidden">Power</span>
            </span>
            <span className="font-mono-tabular font-bold text-amber-300 whitespace-nowrap">
              {remainingPowerKw} kW free
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.45)]"
              style={{ width: `${powerPct}%` }}
            />
          </div>
        </div>

        {/* 2. Life Support (O2, Heat & Food) */}
        <div className="instrument-bezel relative rounded-xl border border-slate-800 px-2.5 py-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-slate-200 whitespace-nowrap">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Life Support</span>
              <span className="sm:hidden">Life</span>
            </span>
            <div className="flex items-center gap-1">
              {floatingDeltas && floatingDeltas.lifeSupport !== 0 && (
                <span
                  key={`ls-${floatingDeltas.key}`}
                  className={`animate-float-delta font-mono-tabular text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    floatingDeltas.lifeSupport > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/25 text-rose-300'
                  }`}
                >
                  {floatingDeltas.lifeSupport > 0
                    ? `+${floatingDeltas.lifeSupport}%`
                    : `${floatingDeltas.lifeSupport}%`}
                </span>
              )}
              <span className={`font-mono-tabular font-bold ${lifeColors.text}`}>
                {lifeSupportLevel}%
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${lifeColors.bar}`}
              style={{ width: `${lifeSupportLevel}%` }}
            />
          </div>
        </div>

        {/* 3. Radiation Shielding + NASA OSDR mSv/day */}
        <div className="instrument-bezel rounded-xl border border-slate-800 px-2.5 py-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-slate-200 whitespace-nowrap">
              <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden md:inline">Shielding</span>
              <span className="md:hidden">Shield</span>
            </span>
            <span className={`font-mono-tabular font-bold ${shieldColors.text} whitespace-nowrap`}>
              {shieldStrength}% · {osdrDoseMsv} mSv/d
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${shieldColors.bar}`}
              style={{ width: `${shieldStrength}%` }}
            />
          </div>
        </div>
      </div>

      {/* Honest Attribution Badge + NASA & CSA Data Sources + Quick Controls */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onOpenDonki}
          title="View NASA DONKI Solar Flare Telemetry"
          className={`min-h-[38px] px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            isLoadingDonki
              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
              : isLive
              ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              : 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isLoadingDonki
                ? 'bg-amber-400 animate-pulse'
                : isLive
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-cyan-400'
            }`}
          />
          <div className="text-left leading-tight">
            <div className="text-[10px] font-bold tracking-wide">
              {isLoadingDonki
                ? 'SYNCING NASA DONKI...'
                : isLive
                ? 'LIVE NASA DONKI API'
                : 'CURATED NASA DONKI / OSDR ARCHIVE'}
            </div>
            <div className="font-mono-tabular text-[10px] opacity-90">
              {flareEvent.classType} · {flareEvent.sourceLocation}
            </div>
          </div>
        </button>

        {/* NASA & CSA Data Sources */}
        <button
          type="button"
          onClick={onOpenSources}
          title="NASA & CSA Data Sources"
          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Database className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden lg:inline">NASA &amp; CSA Data Sources</span>
        </button>

        {/* How to Play (?) */}
        <button
          type="button"
          onClick={onOpenHelp}
          title="How to Play"
          aria-label="How to Play"
          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <HelpCircle className="w-4 h-4 text-cyan-300" />
          <span className="hidden xl:inline">How to Play</span>
        </button>

        {/* Reset Mission */}
        <button
          type="button"
          onClick={onResetMission}
          title="Reset Mission"
          aria-label="Reset Mission"
          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden xl:inline">Reset</span>
        </button>

        {/* Speaker Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          title={muted ? 'Unmute Sound' : 'Mute Sound'}
          className={`min-w-[38px] min-h-[38px] px-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            muted
              ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80'
              : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25'
          }`}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
