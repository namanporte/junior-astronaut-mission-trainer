import {
  AlertTriangle,
  FastForward,
  HeartPulse,
  Minus,
  Play,
  Plus,
  Radio,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import { CommsTarget, GamePhase, PowerAllocation, SolarFlareEvent } from '../types/game';
import {
  SLIDER_MAX_KW,
  SLIDER_STEP_KW,
  getOsdrDoseRateMsv,
  getShieldStrength,
  getTotalAllocatedPower
} from '../utils/simulation';
import { GlossaryTerm } from './GlossaryTerm';

interface PowerConsoleProps {
  sol: number;
  phase: GamePhase;
  power: PowerAllocation;
  maxPowerBudget: number;
  requiredLifeSupportKw: number;
  cropPenaltyActive: boolean;
  currentFlare: SolarFlareEvent;
  onChangePower: (key: keyof PowerAllocation, newValue: number) => void;
  onRunSimulation: () => void;
  isFinalizingSol: boolean;
  commsTarget: CommsTarget;
  onChangeCommsTarget: (target: CommsTarget) => void;
  commsRemainingSec: number | null;
  commsTotalSec: number;
  earthTip: { text: string; isAiGenerated: boolean } | null;
  onAskEarthControl: () => void;
  onFastForwardComms: () => void;
}

export function PowerConsole({
  sol,
  phase,
  power,
  maxPowerBudget,
  requiredLifeSupportKw,
  cropPenaltyActive,
  currentFlare,
  onChangePower,
  onRunSimulation,
  isFinalizingSol,
  commsTarget,
  onChangeCommsTarget,
  commsRemainingSec,
  commsTotalSec,
  earthTip,
  onAskEarthControl,
  onFastForwardComms
}: PowerConsoleProps) {
  const totalUsed = getTotalAllocatedPower(power);
  const remainingPower = Math.max(0, maxPowerBudget - totalUsed);
  const slidersLocked = (phase !== 'PLANNING' && phase !== 'CRISIS_PAUSE') || isFinalizingSol;

  const shieldStrength = getShieldStrength(power.shielding);
  const liveOsdrDose = getOsdrDoseRateMsv(power.shielding, currentFlare);

  const lifeBadge =
    power.lifeSupport >= requiredLifeSupportKw + 15
      ? { label: 'Healing (+5%)', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' }
      : power.lifeSupport >= requiredLifeSupportKw
      ? { label: 'Optimal', style: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40' }
      : {
          label: `Low (Need ${requiredLifeSupportKw} kW)`,
          style: 'bg-rose-500/15 text-rose-300 border-rose-400/40'
        };

  const shieldBadge =
    power.shielding >= 50
      ? { label: `X-Class Ready (${shieldStrength}%)`, style: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' }
      : power.shielding >= 35
      ? { label: `M-Class Ready (${shieldStrength}%)`, style: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40' }
      : power.shielding >= 20
      ? { label: `C-Class Ready (${shieldStrength}%)`, style: 'bg-amber-500/15 text-amber-200 border-amber-400/40' }
      : { label: `Low (${shieldStrength}%)`, style: 'bg-rose-500/15 text-rose-300 border-rose-400/40' };

  const commsProgressPct =
    commsRemainingSec !== null
      ? Math.min(100, Math.round(((commsTotalSec - commsRemainingSec) / commsTotalSec) * 100))
      : 0;

  return (
    <section
      aria-label="Commander Power Console"
      className="rounded-3xl bg-[#111830] border border-slate-700/80 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 h-full overflow-y-auto"
    >
      {/* 1. Power Grid Budget */}
      <div className="rounded-2xl bg-[#162040] border border-slate-700/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">1. Power Grid Budget</div>
            <div className="font-mono-tabular text-lg sm:text-xl font-bold text-white leading-tight">
              {totalUsed} / {maxPowerBudget} kW
            </div>
          </div>
        </div>

        <div
          className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-mono-tabular font-bold ${
            remainingPower === 0
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
          }`}
        >
          Remaining Power: {remainingPower} kW
        </div>
      </div>

      {/* Compounding Crop Yield Penalty Warning */}
      {cropPenaltyActive && (
        <div className="rounded-xl bg-amber-950/60 border border-amber-400/50 px-3 py-2 text-xs text-amber-100 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            <strong>-15% Crop Yield Penalty Active:</strong> Power Life Support to{' '}
            <strong className="font-mono-tabular">{requiredLifeSupportKw} kW</strong> today to
            recover <GlossaryTerm term="Hydroponics" />!
          </span>
        </div>
      )}

      {/* Green Houston CAPCOM Radio Banner Right Above Sliders */}
      {earthTip && commsRemainingSec === null && (
        <div
          role="status"
          className="rounded-2xl bg-emerald-950/70 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2)] px-3.5 py-2.5 flex items-start gap-2.5 shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                Houston CAPCOM Radio Tip
              </span>
              {earthTip.isAiGenerated && (
                <span className="text-[10px] font-semibold text-emerald-200/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by Gemini AI</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-emerald-50 leading-snug">
              {earthTip.text}
            </p>
          </div>
        </div>
      )}

      {/* 2 & 3. Two Streamlined Primary Power Sliders */}
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {/* Slider A: Life Support (Combined O2, Heat & Hydroponic Food) */}
        <div className="rounded-2xl bg-[#0D1429] border border-slate-800 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <HeartPulse className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold text-sm text-white truncate">
                2. Life Support (O2, Heat &amp; <GlossaryTerm term="Hydroponics" />)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap ${lifeBadge.style}`}
              >
                {lifeBadge.label}
              </span>
              <span className="font-mono-tabular font-bold text-base text-white w-14 text-right">
                {power.lifeSupport} kW
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={slidersLocked || power.lifeSupport < SLIDER_STEP_KW}
              onClick={() => onChangePower('lifeSupport', power.lifeSupport - SLIDER_STEP_KW)}
              aria-label="Decrease Life Support"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={SLIDER_MAX_KW}
              step={SLIDER_STEP_KW}
              value={power.lifeSupport}
              disabled={slidersLocked}
              aria-label="Life Support Power"
              onChange={(e) => onChangePower('lifeSupport', Number(e.target.value))}
              className="space-slider w-full disabled:opacity-60"
              style={
                {
                  '--slider-accent': '#10B981',
                  '--slider-glow': 'rgba(16, 185, 129, 0.5)',
                  background: `linear-gradient(to right, #10B981 ${(power.lifeSupport / SLIDER_MAX_KW) * 100}%, #1E293B ${(power.lifeSupport / SLIDER_MAX_KW) * 100}%)`,
                  borderRadius: '9999px',
                  height: '12px'
                } as React.CSSProperties
              }
            />

            <button
              type="button"
              disabled={slidersLocked || remainingPower < SLIDER_STEP_KW || power.lifeSupport >= SLIDER_MAX_KW}
              onClick={() => onChangePower('lifeSupport', power.lifeSupport + SLIDER_STEP_KW)}
              aria-label="Increase Life Support"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-300">
            Needs <strong className="text-white">{requiredLifeSupportKw} kW</strong> to stay steady ·{' '}
            <strong className="text-emerald-300">{requiredLifeSupportKw + 15} kW</strong> heals +5%
          </div>
        </div>

        {/* Slider B: Radiation Shielding + Real NASA OSDR Dosimetry */}
        <div className="rounded-2xl bg-[#0D1429] border border-slate-800 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 shrink-0 text-cyan-400" />
              <span className="font-semibold text-sm text-white truncate">
                3. Radiation Shielding ({shieldStrength}%)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap ${shieldBadge.style}`}
              >
                {shieldBadge.label}
              </span>
              <span className="font-mono-tabular font-bold text-base text-white w-14 text-right">
                {power.shielding} kW
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={slidersLocked || power.shielding < SLIDER_STEP_KW}
              onClick={() => onChangePower('shielding', power.shielding - SLIDER_STEP_KW)}
              aria-label="Decrease Radiation Shielding"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={SLIDER_MAX_KW}
              step={SLIDER_STEP_KW}
              value={power.shielding}
              disabled={slidersLocked}
              aria-label="Radiation Shielding Power"
              onChange={(e) => onChangePower('shielding', Number(e.target.value))}
              className="space-slider w-full disabled:opacity-60"
              style={
                {
                  '--slider-accent': '#22D3EE',
                  '--slider-glow': 'rgba(34, 211, 238, 0.5)',
                  background: `linear-gradient(to right, #22D3EE ${(power.shielding / SLIDER_MAX_KW) * 100}%, #1E293B ${(power.shielding / SLIDER_MAX_KW) * 100}%)`,
                  borderRadius: '9999px',
                  height: '12px'
                } as React.CSSProperties
              }
            />

            <button
              type="button"
              disabled={slidersLocked || remainingPower < SLIDER_STEP_KW || power.shielding >= SLIDER_MAX_KW}
              onClick={() => onChangePower('shielding', power.shielding + SLIDER_STEP_KW)}
              aria-label="Increase Radiation Shielding"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-300">
            <span>
              NASA OSDR <GlossaryTerm term="Radiation Dose" />:{' '}
              <strong
                className={`font-mono-tabular ${
                  liveOsdrDose <= 1.0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {liveOsdrDose} mSv/day
              </strong>{' '}
              <span className="text-slate-400">(Storm max {currentFlare.unshieldedDoseMsv})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dedicated Earth Comms Action Button (3s Moon / 45s Scaled Mars Signal Delay) */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="rounded-2xl bg-[#0E162E] border border-slate-800 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-300">
              <GlossaryTerm term="Comms Delay" /> Distance:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-700">
              <button
                type="button"
                disabled={commsRemainingSec !== null}
                onClick={() => onChangeCommsTarget('MOON')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  commsTarget === 'MOON'
                    ? 'bg-cyan-400 text-[#071020]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Moon (3s)
              </button>
              <button
                type="button"
                disabled={commsRemainingSec !== null}
                onClick={() => onChangeCommsTarget('MARS')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  commsTarget === 'MARS'
                    ? 'bg-amber-400 text-[#071020]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mars (45s)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={commsRemainingSec !== null || phase !== 'PLANNING'}
              onClick={onAskEarthControl}
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400/40 text-sky-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Radio className="w-4 h-4 text-sky-300 shrink-0" />
              <span>
                {commsRemainingSec !== null
                  ? commsTarget === 'MOON'
                    ? `Transmitting 384,400 km to Houston (${commsRemainingSec}s)...`
                    : `Scaled Mars Signal 225M km (${commsRemainingSec}s)...`
                  : `Ask Earth Control (${commsTarget === 'MOON' ? '3s Moon' : '45s Mars'} Delay)`}
              </span>
            </button>

            {commsRemainingSec !== null && commsTarget === 'MARS' && (
              <button
                type="button"
                onClick={onFastForwardComms}
                title="Fast-forward 45s Mars delay for classroom/demo"
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Skip</span>
              </button>
            )}
          </div>

          {commsRemainingSec !== null && (
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${commsProgressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          disabled={phase !== 'PLANNING' || isFinalizingSol}
          onClick={onRunSimulation}
          className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none active:scale-[0.99] text-[#071020] font-display font-bold text-base sm:text-lg shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>
            {isFinalizingSol
              ? 'Receiving CAPCOM Debrief...'
              : phase === 'PLANNING'
              ? `Run Sol ${sol} Simulation`
              : phase === 'CRISIS_PAUSE'
              ? 'Resolve Alert Above!'
              : `Simulating Sol ${sol}...`}
          </span>
        </button>
      </div>
    </section>
  );
}
