import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Flame,
  FlaskConical,
  Footprints,
  Headphones,
  Minus,
  Plus,
  Printer,
  Radio,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  Umbrella,
  Volume2,
  Wind,
  Wrench,
  Zap
} from 'lucide-react';
import { BASE_STATIONS } from '../data/scienceData';
import {
  BackpackInventory,
  BaseSystemsState,
  CommsTarget,
  DifficultyMode,
  GamePhase,
  MarsSite,
  PowerAllocation,
  SolarFlareEvent,
  StationId,
  SurpriseEmergency,
  WorldBody
} from '../types/game';
import {
  getRequiredElectrolysisKw,
  getRequiredGrowHeatKw,
  getTotalAllocatedPower,
  SLIDER_MAX_KW,
  SLIDER_STEP_KW
} from '../utils/physicsSimulation';
import { DpadVector } from './Outpost3DViewport';

export type DockTab = 'STATION' | 'POWER' | 'BACKPACK' | 'RADIO' | 'SANDBOX_LAB';

interface BottomControlDockProps {
  world: WorldBody;
  mode: DifficultyMode;
  marsSite: MarsSite | null;
  phase: GamePhase;
  nearestStation: StationId | null;
  nearestDistance: number;
  systems: BaseSystemsState;
  power: PowerAllocation;
  maxGridBudgetKw: number;
  backpack: BackpackInventory;
  activeEmergency: SurpriseEmergency | null;
  upcomingFlare: SolarFlareEvent | null;
  commsTarget: CommsTarget;
  commsDelaySeconds: number;
  commsMessage: { text: string; isAiGenerated: boolean } | null;
  commsLoading: boolean;
  radioSpeaking: boolean;
  dpadRef: React.MutableRefObject<DpadVector>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onJump: () => void;
  onOpenEmergencyModal: () => void;
  onStationRepair: (actionId: string) => void;
  onUpdatePower: (key: keyof PowerAllocation, deltaKw: number) => void;
  onUseGadget: (item: 'megaBattery' | 'sunBlanket' | 'waterCartridge') => void;
  onAskEarthBuddy: () => void;
  onReplayRadioVoice: () => void;
  onSandboxTrigger: (action: 'DUST' | 'LEAK' | 'OVERHEAT' | 'CO2' | 'RESET' | 'STORM') => void;
  onBraceForStorm: () => void;
}

export function BottomControlDock({
  world,
  mode,
  marsSite,
  phase,
  nearestStation,
  systems,
  power,
  maxGridBudgetKw,
  backpack,
  activeEmergency,
  upcomingFlare,
  commsTarget,
  commsDelaySeconds,
  commsMessage,
  commsLoading,
  radioSpeaking,
  dpadRef,
  isOpen,
  onToggleOpen,
  onJump,
  onOpenEmergencyModal,
  onStationRepair,
  onUpdatePower,
  onUseGadget,
  onAskEarthBuddy,
  onReplayRadioVoice,
  onSandboxTrigger,
  onBraceForStorm
}: BottomControlDockProps) {
  const [activeTab, setActiveTab] = useState<DockTab>(mode === 'SANDBOX' ? 'POWER' : 'STATION');

  const isSandbox = mode === 'SANDBOX';
  const stationMeta = nearestStation
    ? BASE_STATIONS.find((s) => s.id === nearestStation) ?? null
    : null;

  const allocated = getTotalAllocatedPower(power);
  const freeKw = Math.max(0, maxGridBudgetKw - allocated);
  const reqElec = getRequiredElectrolysisKw(world, systems);
  const reqGrow = getRequiredGrowHeatKw(world, marsSite, systems);
  const reqShield = upcomingFlare?.requiredShieldKw ?? 20;

  const emergencyHandsOnReady =
    Boolean(activeEmergency) && nearestStation === activeEmergency?.stationId;

  const setDpad = (x: number, z: number) => {
    dpadRef.current = { x, z };
  };

  const activeHazards: string[] = [];
  if (systems.dustCoatPct >= 15) activeHazards.push(`Regolith Dust ${systems.dustCoatPct}%`);
  if (systems.frozenCells > 0) activeHazards.push(`${systems.frozenCells} Frozen Battery`);
  if (systems.hullLeakActive) activeHazards.push('Hull Micro-Leak');
  if (systems.scrubberSaturated) activeHazards.push('CO2 Scrubber Clogged');
  if (systems.bioContamActive) activeHazards.push('Bio-Dome Fungus');
  if (systems.perchlorateLock) activeHazards.push('Toxic Perchlorate Soil');
  if (systems.radiatorHealthPct < 95)
    activeHazards.push(`Radiators ${systems.radiatorHealthPct}%`);
  if (systems.juryRigValveActive) activeHazards.push('Jury-Rigged Valve');

  const tabs: Array<{ id: DockTab; label: string; icon: typeof Wrench }> = [
    { id: 'STATION', label: 'Walk & Fix', icon: Wrench },
    { id: 'POWER', label: `Power Grid (${freeKw}⚡)`, icon: Zap },
    {
      id: 'BACKPACK',
      label: `Backpack (${
        backpack.megaBattery +
        backpack.sunBlanket +
        backpack.waterCartridge +
        backpack.filamentSpool
      })`,
      icon: Backpack
    },
    { id: 'RADIO', label: radioSpeaking ? 'Radio Live...' : 'Earth Radio', icon: Headphones }
  ];

  if (isSandbox) {
    tabs.push({ id: 'SANDBOX_LAB', label: 'Sandbox Lab', icon: FlaskConical });
  }

  if (!isOpen) {
    return (
      <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2">
        {activeEmergency && (
          <button
            type="button"
            onClick={onOpenEmergencyModal}
            className="btn-tactile px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white text-xs font-extrabold shadow-xl flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>
              {emergencyHandsOnReady ? 'Solve On-Site (Bonus!)' : 'Solve Emergency!'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleOpen}
          className="btn-tactile px-4 py-2 rounded-2xl bg-slate-950/92 hover:bg-slate-900 border border-sky-400/70 text-sky-100 text-xs font-extrabold shadow-xl flex items-center gap-2 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-sky-300" />
          <span>Show Interface</span>
          {stationMeta && (
            <span className="text-[11px] font-mono-tabular text-emerald-300">
              · {stationMeta.shortName}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-sky-300" />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-[980px] mx-auto rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl text-slate-100 overflow-hidden">
      {/* Persistent Top Strip inside Dock */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-800 bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {stationMeta ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
              <Compass className="w-4 h-4 shrink-0" />
              <span>At: {stationMeta.name}</span>
              <span className="text-slate-400 font-semibold hidden sm:inline">
                (Press E or tap fixes)
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Footprints className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Walk with WASD / Click Ground · Space Jump · Click any Station</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeEmergency && (
            <button
              type="button"
              onClick={onOpenEmergencyModal}
              className="btn-tactile px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {emergencyHandsOnReady ? 'Solve On-Site (Bonus!)' : 'Solve Emergency!'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleOpen}
            className="btn-tactile px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Interface</span>
          </button>

          <button
            type="button"
            disabled={phase !== 'ACTIVE_SHIFT'}
            onClick={onBraceForStorm}
            className={`btn-tactile px-3 py-1 rounded-xl disabled:opacity-50 border text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
              isSandbox
                ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isSandbox ? 'Test Storm Shield' : 'Brace for Storm'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Body */}
      <div className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border ${
                      active
                        ? 'bg-sky-500 text-slate-950 border-sky-300'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeHazards.length > 0 && (
              <div className="text-[11px] font-bold text-amber-300 truncate max-w-full">
                Active Hazards: {activeHazards.join(' · ')}
              </div>
            )}
          </div>

          {/* TAB 1: WALK & HANDS-ON STATION FIXES */}
          {activeTab === 'STATION' && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 min-h-[104px] flex flex-col justify-between">
                {stationMeta ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="font-display font-extrabold text-sm text-white">
                          {stationMeta.name}
                        </div>
                        <p className="text-xs text-slate-300">{stationMeta.role}</p>
                      </div>
                      {activeEmergency && activeEmergency.stationId === stationMeta.id && (
                        <button
                          type="button"
                          onClick={onOpenEmergencyModal}
                          className="btn-tactile px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
                        >
                          Handle {activeEmergency.title}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {stationMeta.id === 'SOLAR_GRID' && (
                        <>
                          <button
                            type="button"
                            disabled={systems.dustCoatPct === 0}
                            onClick={() => onStationRepair('SCRUB_DUST')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sun className="w-3.5 h-3.5" />
                            <span>Scrub Dust ({systems.dustCoatPct}% · -6% H2O)</span>
                          </button>
                          <button
                            type="button"
                            disabled={systems.frozenCells === 0}
                            onClick={() => onStationRepair('THAW_BATTERY')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Thaw Cryo Cell ({systems.frozenCells} · -10⚡)</span>
                          </button>
                        </>
                      )}

                      {stationMeta.id === 'LIFE_SUPPORT' && (
                        <>
                          <button
                            type="button"
                            disabled={!systems.hullLeakActive}
                            onClick={() => onStationRepair('SEAL_LEAK')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-400/50 text-cyan-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Droplets className="w-3.5 h-3.5" />
                            <span>
                              {systems.hullLeakActive ? 'Seal Hull Leak (-8⚡)' : 'Hull Airtight'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!systems.scrubberSaturated && systems.co2Ppm < 1100}
                            onClick={() => onStationRepair('BAKEOUT_CO2')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Wind className="w-3.5 h-3.5" />
                            <span>Bake-Out CO2 Scrubbers (-12⚡)</span>
                          </button>
                        </>
                      )}

                      {stationMeta.id === 'HYDROPONICS' && (
                        <>
                          <button
                            type="button"
                            disabled={!systems.bioContamActive}
                            onClick={() => onStationRepair('STERILIZE_MOLD')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sprout className="w-3.5 h-3.5" />
                            <span>
                              {systems.bioContamActive
                                ? 'UV Sterilize Fungus (-6% Crops)'
                                : 'Bio-Dome Clean'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!systems.perchlorateLock}
                            onClick={() => onStationRepair('WASH_PERCHLORATE')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Droplets className="w-3.5 h-3.5" />
                            <span>
                              {systems.perchlorateLock
                                ? 'Wash Toxic Perchlorate Dirt (-8% H2O)'
                                : 'Soil Washed'}
                            </span>
                          </button>
                        </>
                      )}

                      {stationMeta.id === 'THERMAL_WORKSHOP' && (
                        <>
                          <button
                            type="button"
                            disabled={systems.radiatorHealthPct >= 100 && systems.cabinTempC < 29}
                            onClick={() => onStationRepair('REPAIR_RADIATOR')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-40 border border-orange-400/50 text-orange-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>
                              Fix Radiators ({systems.radiatorHealthPct}% · -5⚡ -5% H2O)
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!systems.juryRigValveActive || backpack.filamentSpool <= 0}
                            onClick={() => onStationRepair('PRINT_VALVE')}
                            className="btn-tactile px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>3D-Print Valve ({backpack.filamentSpool} Spool)</span>
                          </button>
                        </>
                      )}

                      {stationMeta.id === 'COMMAND_BRIDGE' && (
                        <button
                          type="button"
                          onClick={() => onStationRepair('OVERBOOST_SHIELD')}
                          className="btn-tactile px-3 py-1.5 rounded-xl bg-blue-500/25 hover:bg-blue-500/35 border border-blue-400/50 text-blue-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Overcharge Spire (+10⚡ Shield for -10⚡ Grid)</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-200">
                      Outpost Regolith Yard — Walk near any glowing station pad to inspect &amp;
                      repair!
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                      {BASE_STATIONS.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 font-semibold"
                        >
                          {s.shortName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 justify-center">
                <div className="grid grid-cols-3 gap-1 w-[108px]">
                  <div />
                  <button
                    type="button"
                    aria-label="Walk Forward"
                    onPointerDown={() => setDpad(0, -1)}
                    onPointerUp={() => setDpad(0, 0)}
                    onPointerLeave={() => setDpad(0, 0)}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 border border-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <div />
                  <button
                    type="button"
                    aria-label="Walk Left"
                    onPointerDown={() => setDpad(-1, 0)}
                    onPointerUp={() => setDpad(0, 0)}
                    onPointerLeave={() => setDpad(0, 0)}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 border border-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Walk Backward"
                    onPointerDown={() => setDpad(0, 1)}
                    onPointerUp={() => setDpad(0, 0)}
                    onPointerLeave={() => setDpad(0, 0)}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 border border-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Walk Right"
                    onPointerDown={() => setDpad(1, 0)}
                    onPointerUp={() => setDpad(0, 0)}
                    onPointerLeave={() => setDpad(0, 0)}
                    className="h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-sky-500 active:text-slate-950 border border-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onJump}
                  className="btn-tactile h-16 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-extrabold cursor-pointer"
                >
                  Jump
                  <div className="text-[10px] font-mono-tabular text-sky-300">
                    {world === 'MOON' ? '0.16g' : '0.38g'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: POWER DISTRIBUTION */}
          {activeTab === 'POWER' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    key: 'electrolysisKw',
                    title: 'Air & Water Electrolysis',
                    value: power.electrolysisKw,
                    needed: reqElec,
                    accent: 'text-cyan-300',
                    bar: 'bg-cyan-400'
                  },
                  {
                    key: 'growHeatKw',
                    title: 'Grow Lights & Cryo-Heaters',
                    value: power.growHeatKw,
                    needed: reqGrow,
                    accent: 'text-emerald-300',
                    bar: 'bg-emerald-400'
                  },
                  {
                    key: 'shieldingKw',
                    title: 'Magnetic Forcefield',
                    value: power.shieldingKw,
                    needed: systems.radarScrambled ? 35 : reqShield,
                    accent: 'text-sky-300',
                    bar: 'bg-sky-400'
                  }
                ] as const
              ).map((channel) => {
                const segCount = Math.round(SLIDER_MAX_KW / SLIDER_STEP_KW);
                const filledCount = Math.round(channel.value / SLIDER_STEP_KW);
                const deficit = channel.value < channel.needed;

                return (
                  <div
                    key={channel.key}
                    className="rounded-xl bg-slate-900 border border-slate-800 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-xs font-extrabold ${channel.accent}`}>
                        {channel.title}
                      </span>
                      <span className="font-mono-tabular text-xs font-extrabold text-white">
                        {channel.value}⚡{' '}
                        <span className={deficit ? 'text-amber-300' : 'text-slate-400'}>
                          (Need{' '}
                          {channel.key === 'shieldingKw' && systems.radarScrambled
                            ? '?'
                            : channel.needed}
                          ⚡)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={channel.value <= 0}
                        onClick={() => onUpdatePower(channel.key, -SLIDER_STEP_KW)}
                        className="btn-tactile w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 border border-slate-600 flex items-center justify-center cursor-pointer"
                        aria-label={`Decrease ${channel.title}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1 grid grid-cols-16 gap-0.5 h-4 items-center">
                        {Array.from({ length: segCount }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-3 rounded-xs transition-colors ${
                              idx < filledCount ? channel.bar : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={freeKw < SLIDER_STEP_KW || channel.value >= SLIDER_MAX_KW}
                        onClick={() => onUpdatePower(channel.key, SLIDER_STEP_KW)}
                        className="btn-tactile w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 border border-slate-600 flex items-center justify-center cursor-pointer"
                        aria-label={`Increase ${channel.title}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: SPACE BACKPACK GADGETS */}
          {activeTab === 'BACKPACK' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={backpack.megaBattery <= 0}
                onClick={() => onUseGadget('megaBattery')}
                className="btn-tactile rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-400/50 p-2.5 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-amber-200">
                  <span className="flex items-center gap-1">
                    <BatteryCharging className="w-4 h-4" />
                    Mega Battery
                  </span>
                  <span className="font-mono-tabular">x{backpack.megaBattery}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">+25⚡ bonus power today</div>
              </button>

              <button
                type="button"
                disabled={backpack.sunBlanket <= 0 || systems.sunBlanketActive}
                onClick={() => onUseGadget('sunBlanket')}
                className="btn-tactile rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 border border-sky-400/50 p-2.5 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-sky-200">
                  <span className="flex items-center gap-1">
                    <Umbrella className="w-4 h-4" />
                    Sun Blanket
                  </span>
                  <span className="font-mono-tabular">x{backpack.sunBlanket}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {systems.sunBlanketActive ? 'Deployed!' : 'Blocks 1 Solar Storm'}
                </div>
              </button>

              <button
                type="button"
                disabled={backpack.waterCartridge <= 0}
                onClick={() => onUseGadget('waterCartridge')}
                className="btn-tactile rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 border border-cyan-400/50 p-2.5 text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-cyan-200">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-4 h-4" />
                    Water/O2 Tank
                  </span>
                  <span className="font-mono-tabular">x{backpack.waterCartridge}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">+25% Water/O2 &amp; freshens air</div>
              </button>

              <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-left">
                <div className="flex items-center justify-between text-xs font-extrabold text-orange-200">
                  <span className="flex items-center gap-1">
                    <Printer className="w-4 h-4" />
                    3D Filament
                  </span>
                  <span className="font-mono-tabular">x{backpack.filamentSpool}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Used at Thermal Lab to print broken valves!
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EARTH RADIO WITH REAL RADIO-EFFECT VOICE */}
          {activeTab === 'RADIO' && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-sky-300 mb-1">
                  <Radio className="w-4 h-4 shrink-0" />
                  <span>
                    Earth Buddy Voice Radio ({commsTarget === 'MOON' ? 'Moon 3s Delay' : 'Mars 12s Lag'})
                  </span>
                  {radioSpeaking && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                      <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                        <span className="w-0.5 h-2 bg-emerald-400 animate-dsn-bar" />
                        <span
                          className="w-0.5 h-3 bg-emerald-400 animate-dsn-bar"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="w-0.5 h-1.5 bg-emerald-400 animate-dsn-bar"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </span>
                      UHF Voice Active
                    </span>
                  )}
                  {commsMessage?.isAiGenerated && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                      <Sparkles className="w-3 h-3" />
                      Live Helper
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {commsDelaySeconds > 0
                    ? `Radio beam flying across space... arriving in ${commsDelaySeconds}s`
                    : commsMessage
                    ? commsMessage.text
                    : 'Press Ask Earth Buddy to hear live UHF radio-effect voice advice on balancing your power sliders!'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {commsMessage && commsDelaySeconds === 0 && (
                  <button
                    type="button"
                    onClick={onReplayRadioVoice}
                    className="btn-tactile px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Hear Radio</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={commsLoading || commsDelaySeconds > 0}
                  onClick={onAskEarthBuddy}
                  className="btn-tactile px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  {commsDelaySeconds > 0 ? `Wait ${commsDelaySeconds}s...` : 'Ask Earth Buddy'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SANDBOX SAFE PRACTICE CONTROLS */}
          {activeTab === 'SANDBOX_LAB' && isSandbox && (
            <div className="rounded-xl bg-indigo-950/50 border border-indigo-500/40 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-indigo-100 font-semibold">
                Test physics problems safely without any risk of Game Over:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onSandboxTrigger('DUST')}
                  className="btn-tactile px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer"
                >
                  + Dust Storm
                </button>
                <button
                  type="button"
                  onClick={() => onSandboxTrigger('LEAK')}
                  className="btn-tactile px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-bold cursor-pointer"
                >
                  + Hull Leak
                </button>
                <button
                  type="button"
                  onClick={() => onSandboxTrigger('OVERHEAT')}
                  className="btn-tactile px-2.5 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/50 text-orange-200 text-xs font-bold cursor-pointer"
                >
                  + Overheat
                </button>
                <button
                  type="button"
                  onClick={() => onSandboxTrigger('CO2')}
                  className="btn-tactile px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-bold cursor-pointer"
                >
                  + High CO2
                </button>
                <button
                  type="button"
                  onClick={() => onSandboxTrigger('RESET')}
                  className="btn-tactile px-2.5 py-1.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset 100%</span>
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
