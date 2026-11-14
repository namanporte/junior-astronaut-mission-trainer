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
import { RadiationSparkline } from './RadiationSparkline';

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

const TOTAL_SEGMENTS = SLIDER_MAX_KW / SLIDER_STEP_KW; // 16 segments (5 kW each = 80 kW)

interface SegmentedLedMeterProps {
  label: string;
  valueKw: number;
  maxAllowedKw: number;
  accent: 'emerald' | 'cyan';
  disabled: boolean;
  onChange: (nextValue: number) => void;
}

function SegmentedLedMeter({
  label,
  valueKw,
  maxAllowedKw,
  accent,
  disabled,
  onChange
}: SegmentedLedMeterProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(maxAllowedKw, valueKw + SLIDER_STEP_KW));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0, valueKw - SLIDER_STEP_KW));
    }
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={SLIDER_MAX_KW}
      aria-valuenow={valueKw}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      className="flex-1 bg-[#060914] border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
        const segKw = (idx + 1) * SLIDER_STEP_KW;
        const isLit = valueKw >= segKw;
        const isBeyondBudget = segKw > maxAllowedKw;
        const nextValue = valueKw === segKw ? segKw - SLIDER_STEP_KW : segKw;

        const litStyle =
          accent === 'emerald'
            ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.55)]'
            : 'bg-cyan-400 border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.55)]';

        const unlitStyle = isBeyondBudget
          ? 'bg-slate-900/50 border-slate-800/60 opacity-35 cursor-not-allowed'
          : 'bg-slate-800/85 hover:bg-slate-700 border-slate-700/80 cursor-pointer';

        return (
          <button
            key={segKw}
            type="button"
            tabIndex={-1}
            disabled={disabled || isBeyondBudget}
            onClick={() => onChange(nextValue)}
            title={`${segKw} kW`}
            aria-label={`Set ${label} to ${nextValue} kW`}
            className={`flex-1 h-6 rounded-[4px] border transition-all duration-150 ${
              isLit ? `${litStyle} cursor-pointer` : unlitStyle
            } disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
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

  const lifeMaxAllowed = Math.min(SLIDER_MAX_KW, power.lifeSupport + remainingPower);
  const shieldMaxAllowed = Math.min(SLIDER_MAX_KW, power.shielding + remainingPower);

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
      className="rounded-3xl bg-[#0F172E] border border-slate-700/80 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 h-full overflow-y-auto shadow-[0_6px_28px_rgba(0,0,0,0.45)]"
    >
      {/* 1. Power Grid Budget (Aerospace Instrument Header) */}
      <div className="instrument-bezel rounded-2xl border border-slate-700/90 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-wide">
              1. Power Grid Bus
            </div>
            <div className="font-mono-tabular text-base sm:text-lg font-bold text-white leading-tight">
              {totalUsed} / {maxPowerBudget} kW
            </div>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-xl border text-xs sm:text-sm font-mono-tabular font-bold ${
            remainingPower === 0
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
              : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
          }`}
        >
          Remaining: {remainingPower} kW
        </div>
      </div>

      {/* Compounding Crop Yield Penalty Warning */}
      {cropPenaltyActive && (
        <div className="rounded-xl bg-amber-950/60 border border-amber-400/50 px-3 py-1.5 text-xs text-amber-100 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            <strong>-15% Crop Yield Penalty:</strong> Power Life Support to{' '}
            <strong className="font-mono-tabular">{requiredLifeSupportKw} kW</strong> today to
            recover <GlossaryTerm term="Hydroponics" />!
          </span>
        </div>
      )}

      {/* Green Houston CAPCOM Radio Banner Right Above Instruments */}
      {earthTip && commsRemainingSec === null && (
        <div
          role="status"
          className="rounded-2xl bg-emerald-950/70 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2)] px-3 py-2 flex items-start gap-2.5 shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Houston CAPCOM Radio Tip
              </span>
              {earthTip.isAiGenerated && (
                <span className="text-[10px] font-semibold text-emerald-200/90 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Powered by Gemini AI</span>
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-emerald-50 leading-snug">{earthTip.text}</p>
          </div>
        </div>
      )}

      {/* 2 & 3. Segmented LED Aerospace Instrument Modules */}
      <div className="flex flex-col gap-2.5 flex-1 justify-center">
        {/* Module A: Life Support Segmented LED Meter */}
        <div className="instrument-bezel rounded-2xl border border-slate-700/80 px-3.5 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <HeartPulse className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold text-sm text-white truncate">
                2. Life Support (<GlossaryTerm term="Hydroponics" />)
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
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>

            <SegmentedLedMeter
              label="Life Support Power"
              valueKw={power.lifeSupport}
              maxAllowedKw={lifeMaxAllowed}
              accent="emerald"
              disabled={slidersLocked}
              onChange={(val) => onChangePower('lifeSupport', val)}
            />

            <button
              type="button"
              disabled={slidersLocked || remainingPower < SLIDER_STEP_KW || power.lifeSupport >= SLIDER_MAX_KW}
              onClick={() => onChangePower('lifeSupport', power.lifeSupport + SLIDER_STEP_KW)}
              aria-label="Increase Life Support"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-300">
            Needs <strong className="text-white">{requiredLifeSupportKw} kW</strong> to stay steady ·{' '}
            <strong className="text-emerald-300">{requiredLifeSupportKw + 15} kW</strong> heals +5%
          </div>
        </div>

        {/* Module B: Radiation Shielding Segmented LED Meter + Live NASA OSDR Sparkline */}
        <div className="instrument-bezel rounded-2xl border border-slate-700/80 px-3.5 py-2.5 flex flex-col gap-2">
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
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>

            <SegmentedLedMeter
              label="Radiation Shielding Power"
              valueKw={power.shielding}
              maxAllowedKw={shieldMaxAllowed}
              accent="cyan"
              disabled={slidersLocked}
              onChange={(val) => onChangePower('shielding', val)}
            />

            <button
              type="button"
              disabled={slidersLocked || remainingPower < SLIDER_STEP_KW || power.shielding >= SLIDER_MAX_KW}
              onClick={() => onChangePower('shielding', power.shielding + SLIDER_STEP_KW)}
              aria-label="Increase Radiation Shielding"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Upgrade #3: Live NASA OSDR Radiation Flux Sparkline */}
          <RadiationSparkline
            osdrDoseMsv={liveOsdrDose}
            maxStormDoseMsv={currentFlare.unshieldedDoseMsv}
          />
        </div>
      </div>

      {/* Dedicated Earth Comms Action Button + DSN Spectrogram */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="instrument-bezel rounded-2xl border border-slate-700/80 p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-300">
              <GlossaryTerm term="Comms Delay" /> Distance:
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-700">
              <button
                type="button"
                disabled={commsRemainingSec !== null}
                onClick={() => onChangeCommsTarget('MOON')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
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
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
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
              className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400/40 text-sky-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Skip</span>
              </button>
            )}
          </div>

          {/* Upgrade #5: Live DSN Signal Lock Bars & Spectrogram */}
          {commsRemainingSec !== null && (
            <div className="rounded-xl bg-[#060914] border border-cyan-500/30 px-2.5 py-1.5 flex items-center gap-3">
              <div className="flex items-end gap-0.5 h-4 shrink-0" aria-hidden="true">
                {[0, 0.14, 0.28, 0.08, 0.22, 0.34, 0.12].map((delay, idx) => (
                  <span
                    key={idx}
                    className="w-1 h-4 rounded-xs bg-cyan-400 animate-dsn-bar"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <span className="font-mono-tabular text-[10px] font-bold text-cyan-300 shrink-0">
                DSN LOCK · 8.4 GHz
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${commsProgressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          disabled={phase !== 'PLANNING' || isFinalizingSol}
          onClick={onRunSimulation}
          className="w-full min-h-[48px] px-6 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none active:scale-[0.99] text-[#071020] font-display font-bold text-base sm:text-lg shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
