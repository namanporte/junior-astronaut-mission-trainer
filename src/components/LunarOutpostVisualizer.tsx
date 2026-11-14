import { AlertTriangle, Radio, ShieldCheck, Sparkles, Sun, Telescope, Wind } from 'lucide-react';
import {
  DifficultyMode,
  GamePhase,
  MarsSite,
  PowerAllocation,
  SolarFlareEvent
} from '../types/game';
import { getOsdrDoseRateMsv, getShieldStrength } from '../utils/simulation';
import { GlossaryTerm } from './GlossaryTerm';

interface LunarOutpostVisualizerProps {
  sol: number;
  mode: DifficultyMode;
  marsSite: MarsSite | null;
  phase: GamePhase;
  simProgress: number;
  power: PowerAllocation;
  maxPowerBudget: number;
  requiredLifeSupportKw: number;
  flareEvent: SolarFlareEvent;
  crisisCountdown: number;
  radiationWarningFlash: boolean;
  impactShakeActive: boolean;
  isCommsTransmitting: boolean;
}

export function LunarOutpostVisualizer({
  sol,
  mode,
  marsSite,
  phase,
  simProgress,
  power,
  maxPowerBudget,
  requiredLifeSupportKw,
  flareEvent,
  crisisCountdown,
  radiationWarningFlash,
  impactShakeActive,
  isCommsTransmitting
}: LunarOutpostVisualizerProps) {
  const shieldStrength = getShieldStrength(power.shielding);
  const osdrDoseMsv = getOsdrDoseRateMsv(power.shielding, flareEvent);
  const shieldBright = power.shielding >= 35;
  const shieldExtreme = power.shielding >= 50;
  const lifeSupportStable = power.lifeSupport >= requiredLifeSupportKw;
  const lifeSupportHealing = power.lifeSupport >= requiredLifeSupportKw + 15;

  const isMars = mode === 'COMMANDER';
  const siteTitle = isMars && marsSite ? `${marsSite.name} Outpost` : 'Lunar Outpost Schematic';

  const isCrisis = phase === 'CRISIS_PAUSE';
  const isExtremeCrisis = isCrisis && flareEvent.severityLevel === 'EXTREME';
  const isSolarSimulating =
    phase === 'SIMULATING' && simProgress >= 45 && flareEvent.severityLevel !== 'MILD';
  const showFlareStreaks = isCrisis || isSolarSimulating;
  const showRedRadiationFlash =
    radiationWarningFlash || (isExtremeCrisis && power.shielding < flareEvent.requiredShieldKw);

  const flareClassFamily = `${flareEvent.classType.charAt(0)}-Class`;

  return (
    <section
      aria-label="Outpost Visualizer"
      className={`relative rounded-3xl bg-[#111830] border transition-all duration-300 flex flex-col justify-between overflow-hidden h-full ${
        impactShakeActive ? 'animate-outpost-shake' : ''
      } ${
        showRedRadiationFlash
          ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.55)]'
          : isCrisis
          ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
          : 'border-slate-700/80'
      }`}
    >
      {/* Top Visualizer Header + Solar Observatory Forecast */}
      <div className="px-4 sm:px-5 pt-3.5 pb-1.5 flex flex-col gap-2 z-10 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-white">{siteTitle}</h2>
            <p className="text-xs text-slate-300">
              {isMars && marsSite
                ? `Mars Trek Elevation: ${marsSite.elevationLabel} · ${marsSite.dustCondition}`
                : 'Watch how your power sliders protect Moon Base Alpha in real time.'}
            </p>
          </div>

          {isCrisis ? (
            <div className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-bold flex items-center gap-1.5 shrink-0 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>ALERT · {crisisCountdown}s</span>
            </div>
          ) : (
            <div className="text-xs font-mono-tabular text-cyan-300 font-semibold shrink-0">
              <GlossaryTerm term="Sol">SOL</GlossaryTerm> {sol} · {flareEvent.classType}
            </div>
          )}
        </div>

        {/* Pre-Sol Space Weather Observatory Forecast Card */}
        <div
          className={`rounded-xl border px-3 py-1.5 flex items-center justify-between gap-2 text-xs ${
            flareEvent.severityLevel === 'EXTREME'
              ? 'bg-rose-950/50 border-rose-500/40 text-rose-100'
              : flareEvent.severityLevel === 'MODERATE'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
              : 'bg-cyan-950/40 border-cyan-500/35 text-cyan-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Telescope className="w-4 h-4 shrink-0 text-amber-300" />
            <span className="truncate">
              <strong className="font-semibold">Solar Observatory Forecast:</strong> Region{' '}
              <span className="font-mono-tabular font-bold">{flareEvent.sourceLocation}</span>{' '}
              showing {flareClassFamily} (<GlossaryTerm term="Solar Flare" />{' '}
              {flareEvent.classType})
            </span>
          </div>
          <span className="font-mono-tabular font-bold shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-slate-900/70 border border-slate-700">
            {flareEvent.severityLevel}
          </span>
        </div>
      </div>

      {/* Interactive SVG Base Canvas */}
      <div className="relative flex-1 min-h-[200px] w-full px-3 flex items-center justify-center">
        {showRedRadiationFlash && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-xl bg-rose-600/95 border border-rose-300 text-white text-xs font-extrabold tracking-wide shadow-lg animate-pulse flex items-center gap-1.5 whitespace-nowrap">
            <AlertTriangle className="w-4 h-4" />
            <span>RADIATION WARNING — BOOST SHIELDING TO {flareEvent.requiredShieldKw} kW!</span>
          </div>
        )}

        <svg
          viewBox="0 0 760 400"
          className="w-full h-full max-h-[340px] select-none"
          role="img"
          aria-label="Interactive illustration of Space Outpost showing Habitat Dome, Solar Array, Hydroponics Pod, and Magnetic Shield Bubble"
        >
          <defs>
            <radialGradient id="spaceBg" cx="50%" cy="25%" r="80%">
              <stop
                offset="0%"
                stopColor={
                  showRedRadiationFlash ? '#3B1024' : isMars ? '#2A181F' : '#162247'
                }
              />
              <stop offset="100%" stopColor="#080D1D" />
            </radialGradient>

            <linearGradient id="surfaceGround" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isMars ? '#7C3A27' : '#2A3454'} />
              <stop offset="100%" stopColor={isMars ? '#3D1B14' : '#161D33'} />
            </linearGradient>

            <radialGradient id="shieldDomeGrad" cx="50%" cy="80%" r="70%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.02" />
              <stop offset="75%" stopColor="#22D3EE" stopOpacity={shieldBright ? '0.2' : '0.07'} />
              <stop
                offset="100%"
                stopColor="#22D3EE"
                stopOpacity={shieldExtreme ? '0.5' : shieldBright ? '0.4' : '0.15'}
              />
            </radialGradient>

            <pattern id="hexShieldMesh" width="24" height="28" patternUnits="userSpaceOnUse">
              <polygon
                points="12,1 23,7 23,21 12,27 1,21 1,7"
                fill="none"
                stroke="#67E8F9"
                strokeWidth="0.9"
                opacity="0.45"
              />
            </pattern>

            <radialGradient id="greenhouseGlow" cx="50%" cy="65%" r="60%">
              <stop
                offset="0%"
                stopColor={
                  lifeSupportHealing ? '#34D399' : lifeSupportStable ? '#10B981' : '#64748B'
                }
                stopOpacity={lifeSupportHealing ? '0.55' : lifeSupportStable ? '0.38' : '0.14'}
              />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.05" />
            </radialGradient>

            <radialGradient id="habitatGlow" cx="50%" cy="60%" r="60%">
              <stop
                offset="0%"
                stopColor={
                  showRedRadiationFlash
                    ? '#F43F5E'
                    : lifeSupportStable
                    ? '#38BDF8'
                    : '#F59E0B'
                }
                stopOpacity={lifeSupportStable ? '0.45' : '0.28'}
              />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.08" />
            </radialGradient>

            <radialGradient id="sunFlareGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor={showFlareStreaks ? '#F43F5E' : '#F59E0B'} />
              <stop
                offset="100%"
                stopColor={showFlareStreaks ? '#F43F5E' : '#F59E0B'}
                stopOpacity="0"
              />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="760" height="400" rx="20" fill="url(#spaceBg)" />

          {[
            [60, 48, 1.5],
            [125, 92, 1.2],
            [190, 40, 2],
            [270, 74, 1.3],
            [340, 32, 1.8],
            [420, 62, 1.2],
            [495, 38, 1.5],
            [560, 88, 1.4],
            [640, 118, 1.7],
            [700, 56, 1.5],
            [88, 145, 1.2],
            [310, 120, 1.1],
            [465, 108, 1.3]
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#E2E8F0" opacity={0.45 + (i % 3) * 0.2} />
          ))}

          {/* Distant Earth */}
          <g transform="translate(650, 72)">
            <circle cx="0" cy="0" r="24" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="1.5" />
            <path
              d="M-12,-10 Q-2,-16 8,-6 Q12,4 2,12 Q-10,14 -14,2 Z"
              fill="#34D399"
              opacity="0.85"
            />
            <path d="M8,-14 Q16,-8 14,4 Q8,8 4,2 Z" fill="#34D399" opacity="0.7" />
            <ellipse cx="-5" cy="-12" rx="10" ry="3" fill="#FFFFFF" opacity="0.4" />
            <text x="0" y="38" textAnchor="middle" fill="#93C5FD" fontSize="11" fontWeight="700">
              EARTH
            </text>
          </g>

          {/* Sun / Solar Flare Source */}
          <g transform="translate(95, 72)">
            <circle
              cx="0"
              cy="0"
              r={showFlareStreaks ? 46 : 32}
              fill="url(#sunFlareGrad)"
              className="animate-pulse-glow"
            />
            <circle
              cx="0"
              cy="0"
              r={showFlareStreaks ? 22 : 18}
              fill={showFlareStreaks ? '#FDA4AF' : '#FDE047'}
            />
            <text x="0" y="42" textAnchor="middle" fill="#FDE68A" fontSize="11" fontWeight="700">
              {showFlareStreaks ? `FLARE ${flareEvent.classType}` : 'SUN'}
            </text>
          </g>

          {/* Earth Comms Radio Beam */}
          <g opacity={isCommsTransmitting ? 1 : 0.35}>
            <line
              x1="418"
              y1="158"
              x2="630"
              y2="88"
              stroke="#22D3EE"
              strokeWidth={isCommsTransmitting ? '3' : '1.5'}
              strokeDasharray="6 6"
            />
            {isCommsTransmitting && (
              <circle cx="524" cy="123" r="7" fill="#22D3EE" className="animate-ping" />
            )}
          </g>

          {/* Surface Ground */}
          <path
            d="M0,296 Q190,264 380,278 Q570,292 760,268 L760,400 L0,400 Z"
            fill="url(#surfaceGround)"
          />
          <ellipse
            cx="105"
            cy="346"
            rx="48"
            ry="12"
            fill={isMars ? '#2A100B' : '#12182B'}
            opacity="0.65"
          />
          <ellipse
            cx="645"
            cy="342"
            rx="56"
            ry="14"
            fill={isMars ? '#2A100B' : '#12182B'}
            opacity="0.6"
          />
          <ellipse
            cx="385"
            cy="358"
            rx="34"
            ry="8"
            fill={isMars ? '#2A100B' : '#12182B'}
            opacity="0.45"
          />

          {/* Corridors */}
          <rect
            x="210"
            y="258"
            width="95"
            height="18"
            rx="4"
            fill="#334155"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <rect
            x="445"
            y="258"
            width="95"
            height="18"
            rx="4"
            fill="#334155"
            stroke="#64748B"
            strokeWidth="1.5"
          />

          {/* HYDROPONICS GREENHOUSE POD (LEFT) */}
          <g transform="translate(155, 250)">
            <rect
              x="-62"
              y="18"
              width="124"
              height="22"
              rx="6"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="2"
            />
            <path
              d="M-54,18 A54,54 0 0,1 54,18 Z"
              fill="url(#greenhouseGlow)"
              stroke={lifeSupportStable ? '#34D399' : '#FBBF24'}
              strokeWidth={lifeSupportStable ? '2.5' : '1.5'}
            />
            <path
              d="M-32,-20 Q0,-34 32,-20"
              fill="none"
              stroke={lifeSupportHealing ? '#FDE047' : lifeSupportStable ? '#34D399' : '#64748B'}
              strokeWidth={lifeSupportStable ? '3' : '1.5'}
              strokeLinecap="round"
            />
            {[-28, 0, 28].map((px, idx) => (
              <g key={idx} transform={`translate(${px}, 12)`}>
                <rect x="-8" y="0" width="16" height="6" rx="2" fill="#475569" />
                <path
                  d="M0,0 L0,-16 M0,-7 L-7,-13 M0,-10 L7,-16"
                  stroke={lifeSupportStable ? '#4ADE80' : '#94A3B8'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                {lifeSupportHealing && <circle cx="0" cy="-19" r="3" fill="#BEF264" />}
              </g>
            ))}

            {lifeSupportStable &&
              [
                [-32, -2, 2.2, '0s'],
                [-14, 4, 2.6, '0.7s'],
                [6, -4, 2.0, '1.4s'],
                [24, 3, 2.5, '2.1s'],
                [0, -10, 1.8, '1.1s']
              ].map(([cx, cy, r, delay], idx) => (
                <circle
                  key={idx}
                  cx={cx as number}
                  cy={cy as number}
                  r={r as number}
                  fill={lifeSupportHealing ? '#BEF264' : '#6EE7B7'}
                  className="animate-greenhouse-particle"
                  style={{ animationDelay: delay as string }}
                />
              ))}

            <text
              x="0"
              y="58"
              textAnchor="middle"
              fill={lifeSupportStable ? '#6EE7B7' : '#FCD34D'}
              fontSize="12"
              fontWeight="700"
            >
              CSA HYDROPONICS
            </text>
          </g>

          {/* HABITAT DOME (CENTER) */}
          <g transform="translate(380, 245)">
            <rect
              x="-82"
              y="22"
              width="164"
              height="26"
              rx="8"
              fill="#1E293B"
              stroke="#64748B"
              strokeWidth="2"
            />
            <path
              d="M-74,22 A74,74 0 0,1 74,22 Z"
              fill="url(#habitatGlow)"
              stroke={
                showRedRadiationFlash ? '#FB7185' : lifeSupportStable ? '#38BDF8' : '#FBBF24'
              }
              strokeWidth="3"
            />
            <path
              d="M-50,-16 L0,-50 L50,-16 M-66,22 L-30,-30 L30,-30 L66,22 M0,-50 L0,22"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1"
              opacity="0.35"
            />
            <rect
              x="-38"
              y="-6"
              width="24"
              height="16"
              rx="5"
              fill={lifeSupportStable ? '#BAE6FD' : '#FDE68A'}
              opacity={lifeSupportStable ? 0.9 : 0.55}
            />
            <rect
              x="14"
              y="-6"
              width="24"
              height="16"
              rx="5"
              fill={lifeSupportStable ? '#BAE6FD' : '#FDE68A'}
              opacity={lifeSupportStable ? 0.9 : 0.55}
            />
            <rect
              x="-12"
              y="2"
              width="24"
              height="20"
              rx="4"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="1.5"
            />

            {/* Comms Dish */}
            <g transform="translate(32, -62)">
              <line x1="0" y1="16" x2="0" y2="0" stroke="#94A3B8" strokeWidth="3" />
              <path
                d="M-12,-8 Q0,4 14,-8"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="2" cy="-10" r="3" fill="#22D3EE" />
            </g>

            {lifeSupportHealing && !showRedRadiationFlash && (
              <text x="0" y="-22" textAnchor="middle" fill="#6EE7B7" fontSize="11" fontWeight="700">
                +5% HEALING
              </text>
            )}

            <text
              x="0"
              y="66"
              textAnchor="middle"
              fill={lifeSupportStable ? '#7DD3FC' : '#FCD34D'}
              fontSize="12"
              fontWeight="700"
            >
              LIFE SUPPORT ({power.lifeSupport} kW)
            </text>
          </g>

          {/* SOLAR ARRAY (RIGHT) */}
          <g transform="translate(595, 250)">
            <rect
              x="-14"
              y="12"
              width="28"
              height="28"
              rx="4"
              fill="#1E293B"
              stroke="#64748B"
              strokeWidth="2"
            />
            <line x1="0" y1="12" x2="0" y2="-22" stroke="#94A3B8" strokeWidth="4" />

            <g transform="rotate(-10, 0, -14)">
              <rect
                x="-74"
                y="-28"
                width="64"
                height="28"
                rx="3"
                fill="#0C4A6E"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <rect
                x="10"
                y="-28"
                width="64"
                height="28"
                rx="3"
                fill="#0C4A6E"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              <line x1="-42" y1="-28" x2="-42" y2="0" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
              <line x1="42" y1="-28" x2="42" y2="0" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
              <line x1="-74" y1="-14" x2="-10" y2="-14" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
              <line x1="10" y1="-14" x2="74" y2="-14" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
            </g>

            {showFlareStreaks &&
              [
                [-60, -24, '0s'],
                [-20, -10, '0.4s'],
                [15, -26, '0.8s'],
                [42, -8, '1.1s'],
                [-40, 2, '0.6s']
              ].map(([px, py, delay], idx) => (
                <circle
                  key={idx}
                  cx={px as number}
                  cy={py as number}
                  r="2.6"
                  fill="#FBBF24"
                  className="animate-solar-dust"
                  style={{ animationDelay: delay as string }}
                />
              ))}

            <text x="0" y="58" textAnchor="middle" fill="#7DD3FC" fontSize="12" fontWeight="700">
              SOLAR GRID ({maxPowerBudget} kW)
            </text>
          </g>

          {/* MAGNETIC SHIELD BUBBLE */}
          {power.shielding > 0 && (
            <g className={shieldBright ? 'animate-pulse-glow' : ''}>
              <path
                d="M60,295 A320,215 0 0,1 700,295"
                fill="url(#shieldDomeGrad)"
                stroke={showRedRadiationFlash ? '#FB7185' : shieldBright ? '#22D3EE' : '#38BDF8'}
                strokeWidth={shieldExtreme ? '4.5' : shieldBright ? '3' : '1.5'}
                strokeDasharray={shieldBright ? undefined : '8 6'}
              />
              {shieldBright && (
                <path
                  d="M62,295 A318,213 0 0,1 698,295 Z"
                  fill="url(#hexShieldMesh)"
                  className="animate-hex-shimmer"
                />
              )}
              {shieldBright && (
                <path
                  d="M78,295 A302,198 0 0,1 682,295"
                  fill="none"
                  stroke="#A5F3FC"
                  strokeWidth="1.5"
                  opacity="0.65"
                />
              )}
              <text
                x="380"
                y="96"
                textAnchor="middle"
                fill={showRedRadiationFlash ? '#FDA4AF' : shieldBright ? '#67E8F9' : '#93C5FD'}
                fontSize="12"
                fontWeight="800"
              >
                SHIELD: {shieldStrength}% · {osdrDoseMsv} mSv/day
              </text>
            </g>
          )}

          {/* SOLAR FLARE PARTICLES */}
          {showFlareStreaks && (
            <g>
              {[0, 1, 2, 3].map((idx) => (
                <line
                  key={idx}
                  x1={115 + idx * 14}
                  y1={85 + idx * 12}
                  x2={185 + idx * 18}
                  y2={140 + idx * 14}
                  stroke="#FB7185"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-flare-streak"
                  style={{ animationDelay: `${idx * 0.25}s` }}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Status Strip & Simulation Progress Bar */}
      <div className="px-5 pb-3.5 pt-2 border-t border-slate-800/80 bg-[#0E152A] shrink-0">
        {phase === 'SIMULATING' || phase === 'CRISIS_PAUSE' ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {phase === 'CRISIS_PAUSE'
                  ? `Simulation Paused — ${flareEvent.classType} Solar Flare Alert!`
                  : `Running Sol ${sol} Simulation...`}
              </span>
              <span className="font-mono-tabular text-white font-bold">
                {Math.round(simProgress)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  phase === 'CRISIS_PAUSE' ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${simProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-200">
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Grid: <strong className="font-mono-tabular text-white">{maxPowerBudget} kW</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                Shield: <strong className="font-mono-tabular text-white">{shieldStrength}%</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Wind className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                Life:{' '}
                <strong className={lifeSupportStable ? 'text-emerald-300' : 'text-amber-300'}>
                  {lifeSupportHealing ? 'Healing' : lifeSupportStable ? 'Steady' : 'Low'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">
                <GlossaryTerm term="Radiation Dose">Dose</GlossaryTerm>:{' '}
                <strong className="font-mono-tabular text-cyan-200">{osdrDoseMsv} mSv</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
