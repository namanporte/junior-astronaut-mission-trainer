import { useEffect } from 'react';
import { Award, Compass, Mountain, Rocket, ShieldAlert, X, Zap } from 'lucide-react';
import { MARS_TREK_SITES } from '../data/scienceData';
import { DifficultyMode, MarsSite } from '../types/game';
import { GlossaryTerm } from './GlossaryTerm';

interface OnboardingModalProps {
  isHelpMode?: boolean;
  mode: DifficultyMode;
  selectedMarsSite: MarsSite;
  onSelectMode: (mode: DifficultyMode) => void;
  onSelectMarsSite: (site: MarsSite) => void;
  onStart: () => void;
}

export function OnboardingModal({
  isHelpMode = false,
  mode,
  selectedMarsSite,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/88 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickstart-title"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#111830] border border-cyan-400/30 shadow-[0_0_50px_rgba(6,182,212,0.18)] p-5 sm:p-7 my-auto">
        {isHelpMode && (
          <button
            type="button"
            onClick={onStart}
            aria-label="Close Quick-Start Guide"
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mb-2.5 text-cyan-300">
            <Rocket className="w-7 h-7" />
          </div>
          <h1
            id="quickstart-title"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
          >
            Junior Astronaut: Space Outpost
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Balance 3 core systems using real NASA space weather and radiation data.
          </p>
        </div>

        {/* 3 Quick-Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-2">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white mb-1">1. Balance 3 Core Systems</h2>
            <p className="text-xs text-slate-300 leading-snug">
              Share your Power Grid across Life Support (<GlossaryTerm term="Hydroponics" /> &amp;
              O2) and Radiation Shielding.
            </p>
          </div>

          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-300 mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white mb-1">2. React to Real NASA Flares</h2>
            <p className="text-xs text-slate-300 leading-snug">
              When a real <GlossaryTerm term="Solar Flare" /> strikes, raise shielding fast before
              the crisis timer hits zero!
            </p>
          </div>

          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 mb-2">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white mb-1">
              3. Survive {mode === 'CADET' ? '5' : '7'} <GlossaryTerm term="Sol">Sols</GlossaryTerm>
            </h2>
            <p className="text-xs text-slate-300 leading-snug">
              Watch tomorrow&apos;s crop yield tradeoffs and earn your NASA Flight Director Badge!
            </p>
          </div>
        </div>

        {/* Difficulty / Age Mode Selector */}
        {!isHelpMode && (
          <div className="rounded-2xl bg-[#0D1429] border border-slate-700/80 p-4 mb-5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Compass className="w-4 h-4" />
                <span>Choose Difficulty / Age Mode</span>
              </div>
              <span className="text-[11px] text-slate-400">Can be reset anytime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectMode('CADET')}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  mode === 'CADET'
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'bg-[#131C36] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-sm text-white">
                    Cadet Mode (Ages 7–9)
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold text-cyan-300">
                    5 Sols · 12s Timer
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Moon Base Alpha · Full 100 kW grid &amp; extra time for emergencies.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('COMMANDER')}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  mode === 'COMMANDER'
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
                    : 'bg-[#131C36] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold text-sm text-white">
                    Commander Mode (Ages 10–12+ / Classroom)
                  </span>
                  <span className="text-[11px] font-mono-tabular font-bold text-amber-300">
                    7 Sols · 8s Timer
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Mars Trek landing sites with real elevation &amp; dust power limits!
                </p>
              </button>
            </div>

            {/* Mars Trek Site Selection for Commander Mode */}
            {mode === 'COMMANDER' && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 mb-2">
                  <Mountain className="w-4 h-4 text-amber-400" />
                  <span>Select NASA Mars Trek Landing Site:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MARS_TREK_SITES.map((site) => {
                    const active = selectedMarsSite.id === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => onSelectMarsSite(site)}
                        className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-[#131C36] border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold text-xs text-white">{site.name}</div>
                        <div className="text-[10px] font-mono-tabular text-amber-300 mt-0.5">
                          {site.elevationLabel} · {site.basePowerBudget} kW
                        </div>
                        <div className="text-[10px] text-slate-300 mt-1 leading-tight">
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
            className="w-full sm:w-auto min-w-[260px] min-h-[50px] px-8 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-[#071020] font-display font-bold text-lg shadow-[0_0_25px_rgba(34,211,238,0.45)] transition-all flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <Rocket className="w-5 h-5" />
            <span>{isHelpMode ? 'Back to Mission' : 'Launch Mission'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
