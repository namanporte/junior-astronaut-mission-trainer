import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Droplets,
  Flame,
  Printer,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Truck,
  Umbrella,
  Wind,
  Wrench,
  Zap
} from 'lucide-react';
import { BASE_STATIONS } from '../data/scienceData';
import { ActionAnimKind, ActiveActionSequence, StationId } from '../types/game';
import { IncidentVisualId } from './IncidentVisualCard';

export function resolveOptionActionAnim(optionId: string): {
  animKind: ActionAnimKind;
  actionLabel: string;
} {
  switch (optionId) {
    case 'air-scrub-joints':
    case 'morning-wipe':
      return { animKind: 'SCRUB_CLEAN', actionLabel: 'Blasting Razor Dust & Polishing Solar Wings...' };
    case 'dry-wipers':
    case 'skip-wipe':
      return { animKind: 'SHORTCUT_WARN', actionLabel: 'Running Dry Wipers (Saving Water)...' };
    case 'pulse-cryo-heaters':
    case 'preheat-cells':
      return { animKind: 'HEAT_WARM', actionLabel: 'Firing Cryo-Bank Thermal Heaters...' };
    case 'coast-unheated':
      return { animKind: 'SHORTCUT_WARN', actionLabel: 'Shutting Cryo-Heaters Down to Save ⚡...' };
    case 'shunt-to-shield':
    case 'bank-coils':
      return { animKind: 'SHIELD_CHARGE', actionLabel: 'Routing Power Surge Into Forcefield Coils...' };
    case 'trip-grow-lights':
    case 'let-co2-climb':
    case 'overpressure-pump':
    case 'chemical-fog':
    case 'throttle-computers':
    case 'jury-rig-bypass':
      return { animKind: 'SHORTCUT_WARN', actionLabel: 'Applying Emergency Bypass Shortcut...' };
    case 'backflush-purifier':
    case 'steal-crop-water':
    case 'capture-h2-battery':
    case 'fresh-o2-cabin':
    case 'chemical-water-wash':
    case 'wash-batch':
      return { animKind: 'WATER_FLUSH', actionLabel: 'Pumping High-Pressure H2O & O2 Flow...' };
    case 'seal-hull-patch':
      return { animKind: 'WELD_SEAL', actionLabel: 'Welding Thermal Epoxy Patch Over Pinhole...' };
    case 'emergency-bakeout':
    case 'ammonia-vent-fix':
      return { animKind: 'COOL_VENT', actionLabel: 'Running High-Temp Vent & Coolant Flush...' };
    case 'uv-quarantine':
    case 'dim-pink-spectrum':
    case 'keep-full-lights':
    case 'hydro-tubes-only':
    case 'stay-hydro':
      return { animKind: 'UV_CLEAN', actionLabel: 'Configuring Bio-Dome UV & Grow Spectrum...' };
    case 'print-custom-valve':
    case 'print-fins':
      return { animKind: 'PRINT_BUILD', actionLabel: '3D-Printing Precision Titanium-Polymer Part...' };
    case 'fetch-crate':
      return { animKind: 'ROVER_FETCH', actionLabel: 'Driving Pressurized Rover to Crater Rim...' };
    default:
      return { animKind: 'GADGET_DEPLOY', actionLabel: 'Executing Base Engineering Command...' };
  }
}

export function resolveStationRepairAnim(actionId: string): {
  animKind: ActionAnimKind;
  stationId: StationId;
  title: string;
  actionLabel: string;
  visualId: IncidentVisualId;
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
} {
  switch (actionId) {
    case 'SCRUB_DUST':
      return {
        animKind: 'SCRUB_CLEAN',
        stationId: 'SOLAR_GRID',
        title: 'Scrubbing Solar Arrays',
        actionLabel: 'Washing razor regolith off solar wafers...',
        visualId: 'dust-contamination',
        tone: 'emerald'
      };
    case 'THAW_BATTERY':
      return {
        animKind: 'HEAT_WARM',
        stationId: 'SOLAR_GRID',
        title: 'Thawing Cryo-Battery',
        actionLabel: 'Warming frozen battery bank back to life...',
        visualId: 'battery-freezing',
        tone: 'sky'
      };
    case 'SEAL_LEAK':
      return {
        animKind: 'WELD_SEAL',
        stationId: 'LIFE_SUPPORT',
        title: 'Welding Hull Micro-Leak',
        actionLabel: 'Sealing airlock pinhole airtight...',
        visualId: 'micro-leaks',
        tone: 'emerald'
      };
    case 'BAKEOUT_CO2':
      return {
        animKind: 'COOL_VENT',
        stationId: 'LIFE_SUPPORT',
        title: 'Baking Out CO2 Scrubbers',
        actionLabel: 'Purging trapped carbon dioxide from canisters...',
        visualId: 'co2-poisoning',
        tone: 'emerald'
      };
    case 'STERILIZE_MOLD':
      return {
        animKind: 'UV_CLEAN',
        stationId: 'HYDROPONICS',
        title: 'UV-Sterilizing Bio-Dome',
        actionLabel: 'Sweeping UV-C sanitizing beams over crop trays...',
        visualId: 'biocontamination',
        tone: 'emerald'
      };
    case 'WASH_PERCHLORATE':
      return {
        animKind: 'WATER_FLUSH',
        stationId: 'HYDROPONICS',
        title: 'Washing Martian Soil',
        actionLabel: 'Flushing toxic perchlorates out of planter beds...',
        visualId: 'toxic-perchlorates',
        tone: 'sky'
      };
    case 'REPAIR_RADIATOR':
      return {
        animKind: 'COOL_VENT',
        stationId: 'THERMAL_WORKSHOP',
        title: 'Fixing Vacuum Radiators',
        actionLabel: 'Realigning heat-dump fins into deep space...',
        visualId: 'vacuum-overheating',
        tone: 'amber'
      };
    case 'PRINT_VALVE':
      return {
        animKind: 'PRINT_BUILD',
        stationId: 'THERMAL_WORKSHOP',
        title: '3D-Printing Custom Valve',
        actionLabel: 'Laser-sintering titanium-polymer valve replacement...',
        visualId: 'supply-chain-gap',
        tone: 'sky'
      };
    default:
      return {
        animKind: 'SHIELD_CHARGE',
        stationId: 'COMMAND_BRIDGE',
        title: 'Overcharging Forcefield Spire',
        actionLabel: 'Pumping +10⚡ plasma boost into dome emitter...',
        visualId: 'precharge-shield-coils',
        tone: 'sky'
      };
  }
}

interface DecisionActionOverlayProps {
  action: ActiveActionSequence;
  stage?: 'WALKING' | 'WORKING';
  onContinue?: () => void;
}

function ActionKineticStage({
  animKind,
  stage
}: {
  animKind: ActionAnimKind;
  stage: 'WALKING' | 'WORKING';
}) {
  const isWalking = stage === 'WALKING';
  return (
    <div className="relative h-11 w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-700 px-3 flex items-center justify-between">
      {/* Sweeping Animated Beam */}
      <div
        className={`animate-action-sweep pointer-events-none absolute inset-y-0 left-0 w-24 ${
          isWalking
            ? 'bg-gradient-to-r from-transparent via-sky-400/35 to-transparent'
            : animKind === 'SHORTCUT_WARN'
            ? 'bg-gradient-to-r from-transparent via-amber-400/35 to-transparent'
            : animKind === 'UV_CLEAN'
            ? 'bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent'
            : animKind === 'HEAT_WARM'
            ? 'bg-gradient-to-r from-transparent via-orange-400/40 to-transparent'
            : 'bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent'
        }`}
      />

      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isWalking
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : animKind === 'SHORTCUT_WARN'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
              : animKind === 'HEAT_WARM'
              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
          }`}
        >
          {animKind === 'SCRUB_CLEAN' && (
            <Sun className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
          )}
          {animKind === 'HEAT_WARM' && <Flame className="w-4 h-4 animate-burp-pulse" />}
          {animKind === 'SHIELD_CHARGE' && <Shield className="w-4 h-4 animate-pulse" />}
          {animKind === 'WATER_FLUSH' && <Droplets className="w-4 h-4 animate-bounce" />}
          {animKind === 'WELD_SEAL' && <Wrench className="w-4 h-4 animate-tool-work" />}
          {animKind === 'UV_CLEAN' && <Sprout className="w-4 h-4 animate-pulse" />}
          {animKind === 'PRINT_BUILD' && <Printer className="w-4 h-4 animate-tool-work" />}
          {animKind === 'COOL_VENT' && <Wind className="w-4 h-4 animate-pulse" />}
          {animKind === 'ROVER_FETCH' && <Truck className="w-4 h-4 animate-rover-drive" />}
          {animKind === 'SHORTCUT_WARN' && <AlertTriangle className="w-4 h-4 animate-bounce" />}
          {animKind === 'GADGET_DEPLOY' && <BatteryCharging className="w-4 h-4 animate-pulse" />}
        </div>

        <div className="flex items-center gap-1.5">
          {!isWalking && animKind === 'SHIELD_CHARGE' && (
            <Zap className="w-3.5 h-3.5 text-yellow-300 animate-spark-flash" />
          )}
          {!isWalking && animKind === 'UV_CLEAN' && (
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 animate-spark-flash" />
          )}
          {!isWalking && animKind === 'GADGET_DEPLOY' && (
            <Umbrella className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
          )}
          <span className="text-[11px] font-mono-tabular font-extrabold text-slate-100 tracking-wide">
            {isWalking
              ? 'ASTRONAUT WALKING TO SITE...'
              : animKind === 'SHORTCUT_WARN'
              ? 'BYPASS ENGAGED ON-SITE'
              : 'ASTRONAUT PERFORMING FIX...'}
          </span>
        </div>
      </div>

      <div
        className={`relative z-10 flex items-center gap-1 text-[11px] font-extrabold ${
          isWalking ? 'text-sky-300' : 'text-emerald-300'
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
        <span>{isWalking ? 'WALKING' : 'WORKING'}</span>
      </div>
    </div>
  );
}

export function DecisionActionOverlay({
  action,
  stage = 'WALKING',
  onContinue
}: DecisionActionOverlayProps) {
  const stationMeta = BASE_STATIONS.find((s) => s.id === action.stationId);
  const isWalking = stage === 'WALKING';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 sm:top-20 z-30 flex justify-center px-3 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto animate-modal-pop w-full max-w-lg rounded-2xl bg-slate-950/94 border-2 shadow-2xl p-3 sm:p-3.5 text-slate-100 ${
          action.tone === 'rose' || action.animKind === 'SHORTCUT_WARN'
            ? 'border-amber-400/80'
            : action.blocking
            ? 'border-sky-400/80'
            : 'border-cyan-400/75'
        }`}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono-tabular font-extrabold uppercase tracking-wider text-sky-300 shrink-0">
              {action.blocking ? 'CREW DISPATCH' : 'ON-SITE ACTION'}
            </span>
            {stationMeta && (
              <span className="text-[10px] font-mono-tabular font-bold text-slate-300 truncate">
                • {stationMeta.shortName}
              </span>
            )}
          </div>

          {onContinue && action.blocking && (
            <button
              type="button"
              onClick={onContinue}
              className="btn-tactile shrink-0 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-extrabold cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>

        {/* Title */}
        <div className="font-display font-extrabold text-sm sm:text-base text-white mb-2 truncate">
          {action.title}
        </div>

        {/* 2-Step Segmented Progress Indicator */}
        <div className="grid grid-cols-2 gap-1.5 mb-2 text-[11px] font-mono-tabular font-extrabold">
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center justify-between ${
              isWalking
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            }`}
          >
            <span>1. Walk to Site</span>
            <span>{isWalking ? 'NOW' : 'DONE'}</span>
          </div>
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center justify-between ${
              !isWalking
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span>2. Character Fix</span>
            <span>{!isWalking ? 'NOW' : 'NEXT'}</span>
          </div>
        </div>

        <ActionKineticStage animKind={action.animKind} stage={stage} />

        {/* 2-Stage Progress Bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          {isWalking ? (
            <div className="h-full w-2/5 rounded-full bg-sky-400 animate-pulse transition-all duration-300" />
          ) : (
            <div
              key={`${action.nonce}-working`}
              className={`animate-action-progress h-full rounded-full ${
                action.tone === 'rose' || action.animKind === 'SHORTCUT_WARN'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-sky-400 to-emerald-400'
              }`}
            />
          )}
        </div>

        <p className="mt-1.5 text-[11px] font-bold text-slate-200 leading-snug">
          {isWalking ? `Heading to ${stationMeta?.name ?? 'target station'}...` : action.resultBanner}
        </p>
      </div>
    </div>
  );
}

