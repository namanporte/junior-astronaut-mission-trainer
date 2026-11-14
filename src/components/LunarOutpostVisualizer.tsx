import { AlertTriangle, Radio, ShieldCheck, Sparkles, Sun, Telescope, Wind } from 'lucide-react';
import lunarTerrainImg from '../assets/images/lunar_surface_horizon_1794684830159.jpg';
import marsTerrainImg from '../assets/images/mars_surface_horizon_1794684829503.jpg';
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

function getCoordinatesLabel(isMars: boolean, marsSite: MarsSite | null): string {
  if (!isMars) {
    return 'LRO-CAM // 0.67°N 23.47°E · MARE TRANQUILLITATIS';
  }
  if (marsSite?.id === 'OLYMPUS') {
    return 'MRO-TREK // 18.65°N 226.20°E · OLYMPUS MONS';
  }
  if (marsSite?.id === 'HELLAS') {
    return 'MRO-TREK // 42.40°S 70.50°E · HELLAS PLANITIA';
  }
  return 'MRO-TREK // 18.38°N 77.58°E · JEZERO CRATER';
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
  const hudCoords = getCoordinatesLabel(isMars, marsSite);

  const isCrisis = phase === 'CRISIS_PAUSE';
  const isExtremeCrisis = isCrisis && flareEvent.severityLevel === 'EXTREME';
  const isSolarSimulating =
    phase === 'SIMULATING' && simProgress >= 45 && flareEvent.severityLevel !== 'MILD';
  const showFlareStreaks = isCrisis || isSolarSimulating;
  const showRedRadiationFlash =
    radiationWarningFlash || (isExtremeCrisis && power.shielding < flareEvent.requiredShieldKw);

  const flareClassFamily = `${flareEvent.classType.charAt(0)}-Class`;

  // Upgrade #2: Solar Day/Night Cycle arcing across sky during 6s Sol simulation
  const isDayCycleActive = phase === 'SIMULATING' || phase === 'CRISIS_PAUSE';
  const sunProgress = isDayCycleActive ? Math.max(0, Math.min(1, simProgress / 100)) : 0.08;
  const sunX = 95 + sunProgress * 465; // sweeps from 95 -> 560
  const sunY = 86 - Math.sin(sunProgress * Math.PI) * 44; // rises to y=42 at noon, sets back down
  const duskTintOpacity = isDayCycleActive ? Math.max(0, (sunProgress - 0.65) / 0.35) * 0.38 : 0.08;

  // Upgrade #2: Power bus pulse scaling with kW allocation
  const lifeBusSpeedSec = Math.max(0.45, 1.8 - (power.lifeSupport / 80) * 1.25);
  const shieldBusSpeedSec = Math.max(0.45, 1.8 - (power.shielding / 80) * 1.25);

  const terrainSrc = isMars ? marsTerrainImg : lunarTerrainImg;
  const terrainAlt = isMars
    ? 'Photorealistic Martian crater horizon terrain backdrop'
    : 'Photorealistic Lunar regolith crater horizon terrain backdrop';

  return (
    <section
      aria-label="Outpost Visualizer"
      className={`relative rounded-3xl bg-[#0D1428] border transition-all duration-300 flex flex-col justify-between overflow-hidden h-full ${
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
      <div className="px-4 sm:px-5 pt-3 pb-1.5 flex flex-col gap-1.5 z-10 shrink-0 bg-[#0D1428]/90 backdrop-blur-xs">
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
              ? 'bg-rose-950/55 border-rose-500/40 text-rose-100'
              : flareEvent.severityLevel === 'MODERATE'
              ? 'bg-amber-950/45 border-amber-500/40 text-amber-100'
              : 'bg-cyan-950/45 border-cyan-500/35 text-cyan-100'
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
          <span className="font-mono-tabular font-bold shrink-0 text-[11px] px-2 py-0.5 rounded-md bg-slate-900/75 border border-slate-700">
            {flareEvent.severityLevel}
          </span>
        </div>
      </div>

      {/* Interactive Realistic Terrain + SVG Outpost Canvas */}
      <div className="relative flex-1 min-h-[205px] w-full mx-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#070B18] via-[#101830] to-[#1A2036]">
        {/* Upgrade #1: Photorealistic Lunar / Martian Terrain Backdrop */}
        <img
          src={terrainSrc}
          alt={terrainAlt}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-75 select-none pointer-events-none"
        />

        {/* Atmospheric & Dusk Lighting Scrim for high contrast */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: showRedRadiationFlash
              ? 'linear-gradient(to bottom, rgba(59,16,36,0.68) 0%, rgba(16,20,38,0.34) 52%, rgba(8,13,29,0.78) 100%)'
              : 'linear-gradient(to bottom, rgba(7,11,24,0.62) 0%, rgba(10,16,34,0.28) 54%, rgba(7,11,24,0.78) 100%)'
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[#050814] transition-opacity duration-300"
          style={{ opacity: duskTintOpacity }}
        />

        {showRedRadiationFlash && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-xl bg-rose-600/95 border border-rose-300 text-white text-xs font-extrabold tracking-wide shadow-lg animate-pulse flex items-center gap-1.5 whitespace-nowrap">
            <AlertTriangle className="w-4 h-4" />
            <span>RADIATION WARNING — BOOST SHIELDING TO {flareEvent.requiredShieldKw} kW!</span>
          </div>
        )}

        <svg
          viewBox="0 0 760 400"
          className="relative z-10 w-full h-full max-h-[345px] select-none"
          role="img"
          aria-label="Interactive Space Outpost schematic over realistic terrain showing Habitat Dome, Solar Array, Hydroponics Pod, Power Bus, and Magnetic Shield"
        >
          <defs>
            <radialGradient id="shieldDomeGrad" cx="50%" cy="80%" r="70%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.02" />
              <stop offset="75%" stopColor="#22D3EE" stopOpacity={shieldBright ? '0.2' : '0.07'} />
              <stop
                offset="100%"
                stopColor="#22D3EE"
                stopOpacity={shieldExtreme ? '0.52' : shieldBright ? '0.4' : '0.16'}
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
                stopOpacity={lifeSupportHealing ? '0.62' : lifeSupportStable ? '0.44' : '0.18'}
              />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.22" />
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
                stopOpacity={lifeSupportStable ? '0.5' : '0.32'}
              />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.25" />
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

            <linearGradient id="groundPadShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#080D1D" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#080D1D" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Upgrade #1: Dynamic Telemetry HUD Gridlines & Camera Reticles */}
          <g opacity="0.25" pointerEvents="none">
            <line x1="0" y1="120" x2="760" y2="120" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="4 8" />
            <line x1="0" y1="220" x2="760" y2="220" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="4 8" />
            <line x1="190" y1="12" x2="190" y2="388" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="4 8" />
            <line x1="570" y1="12" x2="570" y2="388" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="4 8" />
          </g>
          {/* Corner Camera Brackets */}
          <g stroke="#67E8F9" strokeWidth="1.6" fill="none" opacity="0.7" pointerEvents="none">
            <path d="M16,32 L16,16 L36,16" />
            <path d="M724,16 L744,16 L744,32" />
            <path d="M16,368 L16,384 L36,384" />
            <path d="M724,384 L744,384 L744,368" />
          </g>
          {/* Site Lat/Long HUD Stamp */}
          <text
            x="44"
            y="26"
            fill="#A5F3FC"
            fontSize="10"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
            opacity="0.88"
          >
            {hudCoords}
          </text>
          <text
            x="716"
            y="26"
            textAnchor="end"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="700"
            fontFamily="JetBrains Mono, monospace"
            opacity="0.85"
          >
            {isDayCycleActive ? `SOLAR CYCLE ${Math.round(sunProgress * 100)}%` : 'OPTICAL TELEMETRY'}
          </text>

          {/* Subtle Starfield over top sky */}
          {[
            [60, 48, 1.4],
            [125, 68, 1.1],
            [190, 40, 1.6],
            [270, 64, 1.2],
            [340, 32, 1.5],
            [420, 52, 1.1],
            [495, 38, 1.4],
            [560, 72, 1.2],
            [700, 56, 1.4]
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#E2E8F0" opacity={0.45 + (i % 3) * 0.18} />
          ))}

          {/* Distant Earth */}
          <g transform="translate(658, 72)">
            <circle cx="0" cy="0" r="23" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="1.5" />
            <path
              d="M-12,-10 Q-2,-16 8,-6 Q12,4 2,12 Q-10,14 -14,2 Z"
              fill="#34D399"
              opacity="0.85"
            />
            <path d="M8,-14 Q16,-8 14,4 Q8,8 4,2 Z" fill="#34D399" opacity="0.7" />
            <ellipse cx="-5" cy="-12" rx="10" ry="3" fill="#FFFFFF" opacity="0.4" />
            <text x="0" y="36" textAnchor="middle" fill="#BFDBFE" fontSize="10.5" fontWeight="700">
              EARTH
            </text>
          </g>

          {/* Upgrade #2: Arcing Sun / Solar Flare Source */}
          <g transform={`translate(${sunX.toFixed(1)}, ${sunY.toFixed(1)})`}>
            <circle
              cx="0"
              cy="0"
              r={showFlareStreaks ? 44 : 30}
              fill="url(#sunFlareGrad)"
              className="animate-pulse-glow"
            />
            <circle
              cx="0"
              cy="0"
              r={showFlareStreaks ? 21 : 17}
              fill={showFlareStreaks ? '#FDA4AF' : '#FDE047'}
            />
            <text x="0" y="40" textAnchor="middle" fill="#FDE68A" fontSize="10.5" fontWeight="700">
              {showFlareStreaks ? `FLARE ${flareEvent.classType}` : 'SUN'}
            </text>
          </g>

          {/* Earth Comms Radio Beam */}
          <g opacity={isCommsTransmitting ? 1 : 0.35}>
            <line
              x1="418"
              y1="158"
              x2="638"
              y2="88"
              stroke="#22D3EE"
              strokeWidth={isCommsTransmitting ? '3' : '1.5'}
              strokeDasharray="6 6"
            />
            {isCommsTransmitting && (
              <circle cx="528" cy="123" r="7" fill="#22D3EE" className="animate-ping" />
            )}
          </g>

          {/* Subtle Outpost Pad Ground Shadow (lets photorealistic terrain show cleanly around it) */}
          <ellipse cx="380" cy="296" rx="340" ry="48" fill="url(#groundPadShadow)" />

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

          {/* Upgrade #2: Animated Power Bus Cables (Solar Array -> Habitat & Shield Emitter) */}
          <g>
            {/* Base conduit tracks */}
            <path d="M580,276 L455,276" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
            <path d="M580,285 L380,285" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

            {/* Live Life Support Conduit Pulse */}
            {power.lifeSupport > 0 && (
              <path
                d="M580,276 L455,276"
                fill="none"
                stroke={lifeSupportStable ? '#34D399' : '#FBBF24'}
                strokeWidth={power.lifeSupport >= 45 ? '3' : '2'}
                strokeDasharray="10 6"
                opacity={Math.min(1, 0.35 + power.lifeSupport / 70)}
                className="animate-power-bus"
                style={{ animationDuration: `${lifeBusSpeedSec}s` }}
              />
            )}

            {/* Live Shield Emitter Conduit Pulse */}
            {power.shielding > 0 && (
              <path
                d="M580,285 L380,285"
                fill="none"
                stroke="#22D3EE"
                strokeWidth={power.shielding >= 35 ? '3' : '2'}
                strokeDasharray="10 6"
                opacity={Math.min(1, 0.35 + power.shielding / 70)}
                className="animate-power-bus"
                style={{ animationDuration: `${shieldBusSpeedSec}s` }}
              />
            )}

            {/* Junction / Shield Emitter Coil Node */}
            <circle
              cx="380"
              cy="285"
              r="5"
              fill={power.shielding > 0 ? '#22D3EE' : '#475569'}
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          </g>

          {/* HYDROPONICS GREENHOUSE POD (LEFT) + Upgrade #6 Cutaway Details */}
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
            {/* Tuned LED grow-light bar */}
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

            {/* Upgrade #6: Fine Hydroponic Water Mist Droplets */}
            {lifeSupportStable &&
              [
                [-34, -8, '0s'],
                [-18, -12, '0.6s'],
                [12, -10, '1.1s'],
                [30, -6, '1.5s'],
                [-4, -15, '0.9s']
              ].map(([mx, my, delay], idx) => (
                <circle
                  key={`mist-${idx}`}
                  cx={mx as number}
                  cy={my as number}
                  r="1.3"
                  fill="#A5F3FC"
                  className="animate-hydro-mist"
                  style={{ animationDelay: delay as string }}
                />
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

            <rect x="-58" y="45" width="116" height="17" rx="4" fill="#080D1D" opacity="0.78" />
            <text
              x="0"
              y="57"
              textAnchor="middle"
              fill={lifeSupportStable ? '#6EE7B7' : '#FCD34D'}
              fontSize="11.5"
              fontWeight="700"
            >
              CSA HYDROPONICS
            </text>
          </g>

          {/* HABITAT DOME (CENTER) + Upgrade #6 Cutaway Details */}
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

            {/* Left Window + Astronaut Silhouette checking display */}
            <rect
              x="-44"
              y="-8"
              width="28"
              height="19"
              rx="5"
              fill={lifeSupportStable ? '#BAE6FD' : '#FDE68A'}
              opacity={lifeSupportStable ? 0.92 : 0.6}
            />
            <g fill="#0F172A" opacity="0.82">
              <circle cx="-35" cy="0" r="2.6" />
              <path d="M-39,11 Q-39,4 -35,4 Q-31,4 -31,11 Z" />
              {/* Mini console screen */}
              <rect x="-27" y="1" width="7" height="5" rx="1" fill="#0284C7" />
            </g>

            {/* Right Window + Second Astronaut & O2 Scrubber Gauge */}
            <rect
              x="16"
              y="-8"
              width="28"
              height="19"
              rx="5"
              fill={lifeSupportStable ? '#BAE6FD' : '#FDE68A'}
              opacity={lifeSupportStable ? 0.92 : 0.6}
            />
            <g fill="#0F172A" opacity="0.82">
              <circle cx="26" cy="0" r="2.6" />
              <path d="M22,11 Q22,4 26,4 Q30,4 30,11 Z" />
              {/* O2 Scrubber vertical bar */}
              <rect x="34" y="-4" width="6" height="12" rx="1.2" fill="#0F172A" />
              <rect
                x="35"
                y={lifeSupportStable ? '-2' : '3'}
                width="4"
                height={lifeSupportStable ? '9' : '4'}
                rx="0.8"
                fill={lifeSupportStable ? '#10B981' : '#F59E0B'}
              />
            </g>

            {/* Central Airlock Door */}
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
            <text
              x="0"
              y="-14"
              textAnchor="middle"
              fill={lifeSupportStable ? '#A7F3D0' : '#FDE68A'}
              fontSize="7.5"
              fontWeight="800"
              fontFamily="JetBrains Mono, monospace"
            >
              {lifeSupportStable ? 'O2 98%' : 'O2 LOW'}
            </text>

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
              <text x="0" y="-26" textAnchor="middle" fill="#6EE7B7" fontSize="11" fontWeight="700">
                +5% HEALING
              </text>
            )}

            <rect x="-74" y="53" width="148" height="17" rx="4" fill="#080D1D" opacity="0.78" />
            <text
              x="0"
              y="65"
              textAnchor="middle"
              fill={lifeSupportStable ? '#7DD3FC' : '#FCD34D'}
              fontSize="11.5"
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

            <rect x="-66" y="45" width="132" height="17" rx="4" fill="#080D1D" opacity="0.78" />
            <text x="0" y="57" textAnchor="middle" fill="#7DD3FC" fontSize="11.5" fontWeight="700">
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
              <rect x="260" y="81" width="240" height="20" rx="6" fill="#080D1D" opacity="0.75" />
              <text
                x="380"
                y="95"
                textAnchor="middle"
                fill={showRedRadiationFlash ? '#FDA4AF' : shieldBright ? '#67E8F9' : '#93C5FD'}
                fontSize="11.5"
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
                  x1={sunX + 20 + idx * 14}
                  y1={sunY + 14 + idx * 12}
                  x2={sunX + 85 + idx * 18}
                  y2={sunY + 68 + idx * 14}
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
      <div className="px-5 pb-3 pt-2 border-t border-slate-800/80 bg-[#0A0F1E] shrink-0">
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
