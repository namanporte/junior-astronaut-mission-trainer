import { useEffect } from 'react';
import { Award, Compass, Footprints, Mountain, Rocket, Sparkles, X } from 'lucide-react';
import { MARS_TREK_SITES } from '../data/scienceData';
import { DifficultyMode, MarsSite, WorldBody } from '../types/game';
import { GlossaryTerm } from './GlossaryTerm';

interface OnboardingModalProps {
  isHelpMode?: boolean;
  world: WorldBody;
  mode: DifficultyMode;
  selectedMarsSite: MarsSite;
  onSelectWorld: (world: WorldBody) => void;
  onSelectMode: (mode: DifficultyMode) => void;
  onSelectMarsSite: (site: MarsSite) => void;
  onStart: () => void;
}

export function OnboardingModal({
  isHelpMode = false,
  world,
  mode,
  selectedMarsSite,
  onSelectWorld,
  onSelectMode,
  onSelectMarsSite,
  onStart
}: OnboardingModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  const totalDays =
    world === 'MARS' ? (mode === 'COMMANDER' ? 7 : 6) : mode === 'COMMANDER' ? 6 : 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickstart-title"
    >
      <div className="animate-modal-pop relative w-full max-w-3xl rounded-3xl bg-white border-2 border-slate-200 shadow-2xl p-5 sm:p-7 my-auto text-slate-900">
        {isHelpMode && (
          <button
            type="button"
            onClick={onStart}
            aria-label="Close Quick-Start Guide"
            className="btn-tactile absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-13 h-13 rounded-2xl bg-blue-600 border-b-4 border-blue-800 flex items-center justify-center mb-2 text-white shadow-sm">
            <Rocket className="w-7 h-7" />
          </div>
          <h1
            id="quickstart-title"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-balance"
          >
            Junior Astronaut: 3D Base Walker
          </h1>
          <p className="text-slate-600 font-medium text-sm mt-1 max-w-xl">
            Walk a real 3D Moon or Mars outpost! Fix surprise space physics disasters, balance{' '}
            <GlossaryTerm term="Electrolysis" /> &amp; heat, and shield your crew from solar storms!
          </p>
        </div>

        {/* 3 Quick-Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="hover-option-card hover-sfx rounded-2xl bg-sky-50 border-2 border-sky-200 p-3.5 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-500 border-b-2 border-sky-700 flex items-center justify-center text-white mb-1.5">
              <Footprints className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-1">1. Walk &amp; Bounce</h2>
            <p className="text-xs text-slate-700 font-medium leading-snug">
              Move with <strong>WASD</strong> or click any ground spot! Press{' '}
              <strong>Space</strong> to leap in 0.16g Moon or 0.38g Mars gravity, and{' '}
              <strong>E</strong> to fix gear!
            </p>
          </div>

          <div className="hover-option-card hover-sfx rounded-2xl bg-amber-50 border-2 border-amber-200 p-3.5 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-amber-400 border-b-2 border-amber-600 flex items-center justify-center text-amber-950 mb-1.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-1">2. Handle Surprises</h2>
            <p className="text-xs text-slate-700 font-medium leading-snug">
              Watch out for sharp <GlossaryTerm term="Regolith Dust" />, broken{' '}
              <GlossaryTerm term="Vacuum Radiator">Radiators</GlossaryTerm>, CO2 buildup, and{' '}
              <GlossaryTerm term="Perchlorates" />!
            </p>
          </div>

          <div className="hover-option-card hover-sfx rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3.5 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 border-b-2 border-emerald-700 flex items-center justify-center text-white mb-1.5">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-1">
              3. Survive {totalDays} <GlossaryTerm term="Sol">Sols</GlossaryTerm>
            </h2>
            <p className="text-xs text-slate-700 font-medium leading-snug">
              Charge your <GlossaryTerm term="Forcefield" /> before shift ends and earn your Gold
              Commander badge!
            </p>
          </div>
        </div>

        {/* World + Difficulty Selector */}
        {!isHelpMode && (
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 mb-4 space-y-3">
            {/* World Gravity Picker */}
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-2">
                <Compass className="w-4 h-4" />
                <span>Step A · Pick Your World &amp; Gravity</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onSelectWorld('MOON')}
                  className={`btn-tactile hover-option-card rounded-xl border-2 p-3 text-left cursor-pointer ${
                    world === 'MOON'
                      ? 'bg-sky-50 border-blue-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-extrabold text-sm text-slate-900">
                      Moon Base Alpha
                    </span>
                    <span className="text-[11px] font-mono-tabular font-extrabold text-blue-700">
                      0.16g High Jumps
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Floaty lunar jumps, pitch-black sky, -130°C battery freeze risks!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectWorld('MARS')}
                  className={`btn-tactile hover-option-card rounded-xl border-2 p-3 text-left cursor-pointer ${
                    world === 'MARS'
                      ? 'bg-orange-50 border-orange-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-extrabold text-sm text-slate-900">
                      Mars Red Outpost
                    </span>
                    <span className="text-[11px] font-mono-tabular font-extrabold text-orange-800">
                      0.38g Dusty Horizon
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Rusty red soil with toxic perchlorates, dust storms &amp; 45s Earth radio lag!
                  </p>
                </button>
              </div>
            </div>

            {/* Cadet vs Commander */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectMode('CADET')}
                className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                  mode === 'CADET'
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-xs text-slate-900">
                    Cadet Mode (Ages 7–9)
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold text-emerald-700">
                    {world === 'MOON' ? '5 Sols' : '6 Sols'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('COMMANDER')}
                className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                  mode === 'COMMANDER'
                    ? 'bg-amber-50 border-amber-500'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-xs text-slate-900">
                    Commander Mode (Ages 10–12+)
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold text-amber-800">
                    {world === 'MOON' ? '6 Sols' : '7 Sols'}
                  </span>
                </div>
              </button>
            </div>

            {/* Mars Landing Site Selection */}
            {world === 'MARS' && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                  <Mountain className="w-4 h-4 text-amber-600" />
                  <span>Choose Your Mars Landing Zone:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MARS_TREK_SITES.map((site) => {
                    const active = selectedMarsSite.id === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => onSelectMarsSite(site)}
                        className={`btn-tactile hover-option-card rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                          active
                            ? 'bg-amber-100 border-amber-500 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <div className="font-extrabold text-xs text-slate-900">{site.name}</div>
                        <div className="text-[10px] font-mono-tabular font-bold text-amber-800 mt-0.5">
                          {site.elevationLabel} · {site.basePowerBudget}⚡
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1 leading-tight font-medium">
                          {site.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onStart}
            className="group btn-tactile w-full sm:w-auto min-w-[260px] min-h-[50px] px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 active:border-b-0 text-white font-display font-extrabold text-lg shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Rocket className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span>{isHelpMode ? 'Back to Base' : 'Launch 3D Shift!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
