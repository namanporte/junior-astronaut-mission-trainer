import { useEffect } from 'react';
import { Award, Headphones, RotateCcw, ShieldAlert } from 'lucide-react';
import { CommanderRank, MissionTraceEntry, WorldBody } from '../types/game';
import { calculateCommanderRank } from '../utils/physicsSimulation';
import { MissionHistoryPanel } from './MissionHistoryPanel';

interface EndGameModalProps {
  outcome: 'VICTORY' | 'GAME_OVER';
  world: WorldBody;
  solReached: number;
  totalSols: number;
  waterO2Pct: number;
  cropsPct: number;
  failureReason: string | null;
  traceLog: MissionTraceEntry[];
  victoryCommendation?: { text: string; isLiveTransmission: boolean } | null;
  onPlayAgain: () => void;
}

const RANK_CONFIG: Record<
  CommanderRank,
  { label: string; colorClass: string; borderClass: string }
> = {
  GOLD: {
    label: 'Gold Space Hero',
    colorClass: 'text-amber-900',
    borderClass: 'border-amber-400 bg-amber-100'
  },
  SILVER: {
    label: 'Silver Explorer',
    colorClass: 'text-slate-800',
    borderClass: 'border-slate-300 bg-slate-100'
  },
  BRONZE: {
    label: 'Bronze Cadet',
    colorClass: 'text-orange-900',
    borderClass: 'border-orange-300 bg-orange-100'
  }
};

export function EndGameModal({
  outcome,
  world,
  solReached,
  totalSols,
  waterO2Pct,
  cropsPct,
  failureReason,
  traceLog,
  victoryCommendation,
  onPlayAgain
}: EndGameModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPlayAgain();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayAgain]);

  const shieldedCount = traceLog.filter((t) => t.shieldHeld).length;
  const rank = calculateCommanderRank(waterO2Pct, cropsPct, shieldedCount, totalSols);
  const rankInfo = RANK_CONFIG[rank];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="endgame-title"
    >
      <div
        className={`animate-modal-pop w-full max-w-2xl rounded-3xl bg-white border-2 p-6 sm:p-7 text-center my-auto shadow-2xl text-slate-900 ${
          outcome === 'VICTORY' ? 'border-emerald-400' : 'border-rose-400'
        }`}
      >
        {outcome === 'GAME_OVER' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-600 mx-auto mb-3">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2
              id="endgame-title"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5"
            >
              Outpost Emergency on {world} Sol {solReached}!
            </h2>
            <p className="text-sm text-rose-800 font-semibold mb-4">
              {failureReason ??
                'Base life support dropped to critical levels! Walk between stations faster next mission to stop leaks, mold, and overheating!'}
            </p>
          </>
        ) : (
          <>
            <div
              className={`w-16 h-16 rounded-3xl border-2 flex items-center justify-center mx-auto mb-3 ${rankInfo.borderClass}`}
            >
              <Award className={`w-9 h-9 ${rankInfo.colorClass}`} />
            </div>
            <div className="text-xs font-mono-tabular font-extrabold text-emerald-700 mb-1">
              ALL {totalSols} {world} SOLS SURVIVED!
            </div>
            <h2
              id="endgame-title"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2"
            >
              AstroJun Hero Certified!
            </h2>
            <div
              className={`inline-block px-4 py-1 rounded-xl border-2 font-display font-extrabold text-sm mb-4 ${rankInfo.borderClass} ${rankInfo.colorClass}`}
            >
              {rankInfo.label} · Air/H2O {Math.round(waterO2Pct)}% · Crops {Math.round(cropsPct)}%
            </div>

            <div className="rounded-2xl bg-sky-50 border-2 border-sky-300 p-3.5 mb-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-800">
                  <Headphones className="w-4 h-4" />
                  <span>Earth Buddy Victory High-Five</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                {victoryCommendation
                  ? victoryCommendation.text
                  : 'Cheering for your awesome adventure from Earth...'}
              </p>
            </div>
          </>
        )}

        <div className="mb-5">
          <MissionHistoryPanel
            traceLog={traceLog}
            title="Mission Adventure Log"
            maxHeightClass="max-h-52"
          />
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className={`group btn-tactile w-full min-h-[50px] px-6 py-3 rounded-2xl border-b-4 active:border-b-0 font-display font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer text-white ${
            outcome === 'VICTORY'
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-800'
              : 'bg-blue-600 hover:bg-blue-500 border-blue-800'
          }`}
        >
          <RotateCcw className="w-5 h-5 transition-transform group-hover:-rotate-45" />
          <span>{outcome === 'VICTORY' ? 'Play Again!' : 'Try Again!'}</span>
        </button>
      </div>
    </div>
  );
}
