import { useEffect } from 'react';
import { Award, Compass, FlaskConical, Footprints, Mountain, Rocket, Sparkles, X } from 'lucide-react';
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
  onStart: (skipStory?: boolean) => void;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickstart-title"
    >
      <div className="animate-modal-pop relative w-full max-w-3xl rounded-3xl bg-white border-2 border-slate-200 shadow-2xl p-5 sm:p-6 my-auto text-slate-900">
        {isHelpMode && (
          <button
            type="button"
            onClick={() => onStart()}
            aria-label="Close Quick-Start Guide"
            className="btn-tactile absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 border-b-4 border-blue-800 flex items-center justify-center mb-2 text-white shadow-sm">
            <Rocket className="w-6 h-6" />
          </div>
          <h1
            id="quickstart-title"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-balance"
          >
            AstroJun: 3D Space Outpost
          </h1>
          <p className="text-slate-600 font-medium text-sm mt-1 max-w-xl">
            Step into Mission Control, deploy to a 3D Moon or Mars outpost, solve real space physics
            disasters, and master power allocation!
          </p>
        </div>

        {/* 3 Quick-Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-4">
          <div className="hover-option-card hover-sfx rounded-2xl bg-sky-50 border-2 border-sky-200 p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-sky-500 border-b-2 border-sky-700 flex items-center justify-center text-white mb-1.5">
              <Footprints className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-extrabold text-slate-900 mb-0.5">1. Walk &amp; Bounce</h2>
            <p className="text-[11px] text-slate-700 font-medium leading-snug">
              Move with <strong>WASD</strong> or click ground! Leap in 0.16g Moon or 0.38g Mars
              gravity with <strong>Space</strong>, and press <strong>E</strong> to fix gear!
            </p>
          </div>

          <div className="hover-option-card hover-sfx rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-400 border-b-2 border-amber-600 flex items-center justify-center text-amber-950 mb-1.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-extrabold text-slate-900 mb-0.5">2. Real Space Physics</h2>
            <p className="text-[11px] text-slate-700 font-medium leading-snug">
              Battle sharp <GlossaryTerm term="Regolith Dust" />, damaged{' '}
              <GlossaryTerm term="Vacuum Radiator">Radiators</GlossaryTerm>, CO2 buildup, and{' '}
              <GlossaryTerm term="Perchlorates" />!
            </p>
          </div>

          <div className="hover-option-card hover-sfx rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 border-b-2 border-emerald-700 flex items-center justify-center text-white mb-1.5">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-extrabold text-slate-900 mb-0.5">
              3. 7-<GlossaryTerm term="Sol">Sol</GlossaryTerm> Mission or Sandbox
            </h2>
            <p className="text-[11px] text-slate-700 font-medium leading-snug">
              Play the 7-Sol Hero Story or practice freely in safe <strong>Sandbox Mode</strong>{' '}
              with zero game-ending crises!
            </p>
          </div>
        </div>

        {/* World + Mode Selector */}
        {!isHelpMode && (
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3.5 mb-4 space-y-3">
            {/* World Gravity Picker */}
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-1.5">
                <Compass className="w-4 h-4" />
                <span>Step A · Pick Your World &amp; Gravity</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectWorld('MOON')}
                  className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    world === 'MOON'
                      ? 'bg-sky-50 border-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-display font-extrabold text-sm text-slate-900">
                      Moon Base Alpha
                    </span>
                    <span className="text-[11px] font-mono-tabular font-extrabold text-blue-700">
                      0.16g Jumps
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Floaty jumps &amp; -130°C shadow battery freezes!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectWorld('MARS')}
                  className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    world === 'MARS'
                      ? 'bg-orange-50 border-orange-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-display font-extrabold text-sm text-slate-900">
                      Mars Red Outpost
                    </span>
                    <span className="text-[11px] font-mono-tabular font-extrabold text-orange-800">
                      0.38g Horizon
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Dust storms, toxic perchlorates &amp; long Earth radio lag!
                  </p>
                </button>
              </div>
            </div>

            {/* 3 Game Modes: Cadet, Commander, Sandbox */}
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-700 mb-1.5">
                Step B · Pick Your Mode
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectMode('CADET')}
                  className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    mode === 'CADET'
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="font-display font-extrabold text-xs text-slate-900">
                    Cadet (Ages 7–9)
                  </div>
                  <div className="text-[11px] font-mono-tabular font-bold text-emerald-700 mt-0.5">
                    7-Sol Story · Guided
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('COMMANDER')}
                  className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    mode === 'COMMANDER'
                      ? 'bg-amber-50 border-amber-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="font-display font-extrabold text-xs text-slate-900">
                    Commander (10–12+)
                  </div>
                  <div className="text-[11px] font-mono-tabular font-bold text-amber-800 mt-0.5">
                    7-Sol Story · Tough!
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('SANDBOX')}
                  className={`btn-tactile rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    mode === 'SANDBOX'
                      ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-1 font-display font-extrabold text-xs text-slate-900">
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sandbox Mode</span>
                  </div>
                  <div className="text-[11px] font-bold text-indigo-700 mt-0.5">
                    Safe Lab · No Crises!
                  </div>
                </button>
              </div>
              {mode === 'SANDBOX' && (
                <p className="mt-2 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-[11px] font-semibold text-indigo-950">
                  <strong>Sandbox Safe Lab:</strong> Experiment freely with power allocation, walk all
                  5 stations, trigger optional practice storms &amp; radio voices—with zero
                  game-ending crises!
                </p>
              )}
            </div>

            {/* Mars Landing Site Selection */}
            {world === 'MARS' && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                  <Mountain className="w-4 h-4 text-amber-600" />
                  <span>Mars Landing Zone:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MARS_TREK_SITES.map((site) => {
                    const active = selectedMarsSite.id === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => onSelectMarsSite(site)}
                        className={`btn-tactile rounded-xl border-2 p-2 text-left cursor-pointer ${
                          active
                            ? 'bg-amber-100 border-amber-500 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <div className="font-extrabold text-xs text-slate-900">{site.name}</div>
                        <div className="text-[10px] font-mono-tabular font-bold text-amber-800 mt-0.5">
                          {site.elevationLabel} · {site.basePowerBudget}⚡
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {!isHelpMode && mode === 'SANDBOX' ? (
            <>
              <button
                type="button"
                onClick={() => onStart(true)}
                className="group btn-tactile flex-1 sm:flex-none min-w-[240px] min-h-[50px] px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-800 active:border-b-0 text-white font-display font-extrabold text-base shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <FlaskConical className="w-5 h-5" />
                <span>Enter Sandbox Lab</span>
              </button>
              <button
                type="button"
                onClick={() => onStart(false)}
                className="btn-tactile px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-800 font-display font-extrabold text-sm cursor-pointer"
              >
                Play NASA Intro Story First
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onStart(false)}
              className="group btn-tactile w-full sm:w-auto min-w-[260px] min-h-[50px] px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 border-b-4 border-blue-800 active:border-b-0 text-white font-display font-extrabold text-lg shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Rocket className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>{isHelpMode ? 'Back to Base' : 'Start 7-Sol Mission!'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
