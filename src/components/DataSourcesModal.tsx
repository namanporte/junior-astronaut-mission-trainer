import { useEffect } from 'react';
import { Activity, Database, Globe, Sprout, Sun, X } from 'lucide-react';
import { DonkiDataSource } from '../types/game';

interface DataSourcesModalProps {
  dataSource: DonkiDataSource;
  onClose: () => void;
}

export function DataSourcesModal({ dataSource, onClose }: DataSourcesModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLive = dataSource === 'LIVE_NASA_API';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/85 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-modal-title"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-[#111830] border border-cyan-400/35 shadow-2xl p-6 sm:p-7 my-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 id="sources-modal-title" className="text-xl font-bold text-white">
                NASA &amp; CSA Data Sources
              </h2>
              <p className="text-xs text-slate-300">
                Active Status:{' '}
                <strong className={isLive ? 'text-emerald-300' : 'text-cyan-300'}>
                  {isLive ? 'LIVE NASA DONKI API' : 'CURATED NASA DONKI / OSDR ARCHIVE'}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close data sources"
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {/* 1. NASA DONKI */}
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-white">
                  1. NASA DONKI (Space Weather Database)
                </h3>
                <span className="text-[11px] font-mono-tabular text-amber-300">
                  /DONKI/FLR Endpoint
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Supplies real C, M, and X-class solar flare IDs, Sun coordinates, and peak times so
                real space weather drives every emergency alert.
              </p>
            </div>
          </div>

          {/* 2. NASA OSDR / RadLab */}
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-white">
                  2. NASA OSDR / RadLab Dosimetry Data
                </h3>
                <span className="text-[11px] font-mono-tabular text-cyan-300">
                  0.5 – 38.6 mSv/day
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Grounds the Radiation Shielding gauge in real ISS and deep-space absorbed dose rates
                (0.5 mSv/day baseline vs. 12.4 mSv/day during M-class storms).
              </p>
            </div>
          </div>

          {/* 3. CSA Food Production */}
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-white">
                  3. CSA (Canadian Space Agency) Lunar Food Science
                </h3>
                <span className="text-[11px] text-emerald-300">Food Production on the Moon</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Powers the closed-loop hydroponic crop rules and “Lunar Greenhouse Facts” teaching
                how astronauts grow fresh food and recycle water on the Moon.
              </p>
            </div>
          </div>

          {/* 4. NASA Mars Trek */}
          <div className="rounded-2xl bg-[#162040] border border-slate-700/80 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-300 shrink-0 mt-0.5">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-white">
                  4. NASA Mars Trek Elevation &amp; Dust Profiles
                </h3>
                <span className="text-[11px] text-rose-300">Commander Mode</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sets realistic landing-site solar power and thermal tradeoffs across Jezero Crater,
                Olympus Mons Slope, and Hellas Planitia.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] px-5 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-[#071020] font-display font-bold text-base cursor-pointer transition-colors"
        >
          Close Data Sources
        </button>
      </div>
    </div>
  );
}
