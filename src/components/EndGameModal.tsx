import { useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Headphones,
  HeartPulse,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  XCircle
} from 'lucide-react';
import {
  CommanderRank,
  DonkiDataSource,
  MissionTraceEntry
} from '../types/game';
import { calculateCommanderRank } from '../utils/simulation';

interface EndGameModalProps {
  outcome: 'VICTORY' | 'GAME_OVER';
  solReached: number;
  totalSols: number;
  lifeSupportLevel: number;
  dataSource: DonkiDataSource;
  traceLog: MissionTraceEntry[];
  victoryCommendation?: { text: string; isAiGenerated: boolean } | null;
  onPlayAgain: () => void;
}

const RANK_CONFIG: Record<
  CommanderRank,
  { label: string; colorClass: string; borderClass: string }
> = {
  GOLD: {
    label: 'Gold Commander',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-400/50 bg-amber-500/15'
  },
  SILVER: {
    label: 'Silver Commander',
    colorClass: 'text-slate-200',
    borderClass: 'border-slate-300/50 bg-slate-400/15'
  },
  BRONZE: {
    label: 'Bronze Commander',
    colorClass: 'text-orange-300',
    borderClass: 'border-orange-400/50 bg-orange-500/15'
  }
};

export function EndGameModal({
  outcome,
  solReached,
  totalSols,
  lifeSupportLevel,
  dataSource,
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
  const rank = calculateCommanderRank(lifeSupportLevel, shieldedCount, totalSols);
  const rankInfo = RANK_CONFIG[rank];
  const isLive = dataSource === 'LIVE_NASA_API';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060914]/88 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="endgame-title"
    >
      <div
        className={`w-full max-w-2xl rounded-3xl bg-[#111830] border p-6 sm:p-7 text-center my-auto ${
          outcome === 'VICTORY'
            ? 'border-emerald-400/50 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
            : 'border-rose-500/50 shadow-[0_0_45px_rgba(244,63,94,0.25)]'
        }`}
      >
        {outcome === 'GAME_OVER' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-300 mx-auto mb-3">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 id="endgame-title" className="text-2xl sm:text-3xl font-bold text-white mb-1.5">
              Mission Scrubbed — Try Again!
            </h2>
            <p className="text-sm text-rose-200 mb-4">
              Life Support (O2, Heat &amp; Food) reached 0% on Sol {solReached}. Keep Life Support
              powered and boost Radiation Shielding during solar storms!
            </p>
          </>
        ) : (
          <>
            <div
              className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto mb-3 ${rankInfo.borderClass}`}
            >
              <Award className={`w-9 h-9 ${rankInfo.colorClass}`} />
            </div>
            <div className="text-xs font-mono-tabular font-bold text-emerald-300 mb-1">
              ALL {totalSols} SOLS SURVIVED
            </div>
            <h2 id="endgame-title" className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Junior Astronaut Commander Certified!
            </h2>
            <div
              className={`inline-block px-4 py-1 rounded-xl border font-display font-bold text-sm mb-4 ${rankInfo.borderClass} ${rankInfo.colorClass}`}
            >
              Rank Earned: {rankInfo.label} · Final Life Support: {lifeSupportLevel}%
            </div>

            {/* NASA Flight Director Commendation */}
            <div className="rounded-2xl bg-[#091D34] border-2 border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.18)] p-3.5 mb-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                  <Headphones className="w-4 h-4" />
                  <span>NASA Flight Director Commendation</span>
                </div>
                {victoryCommendation?.isAiGenerated && (
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[10px] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Powered by Gemini AI</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                {victoryCommendation
                  ? victoryCommendation.text
                  : 'Analyzing your mission traceability log from Houston...'}
              </p>
            </div>
          </>
        )}

        {/* Mission Traceability Log */}
        <div className="rounded-2xl bg-[#0D1429] border border-slate-700/80 p-3.5 mb-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
              <ClipboardList className="w-4 h-4" />
              <span>Mission Traceability Log (NASA DONKI &amp; OSDR)</span>
            </div>
            <span className="text-[11px] font-mono-tabular text-slate-400">
              {isLive ? 'LIVE NASA DONKI API' : 'CURATED NASA DONKI / OSDR ARCHIVE'}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {traceLog.map((entry) => (
              <div
                key={entry.sol}
                className="rounded-xl bg-[#141D3A] border border-slate-800 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  {entry.shieldHeld ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-mono-tabular font-bold text-white">
                      Sol {entry.sol}
                    </span>{' '}
                    <span className="text-amber-300 font-mono-tabular font-semibold">
                      {entry.classType} ({entry.sourceLocation})
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      ID: {entry.flrID}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono-tabular text-[11px]">
                  <span className="text-slate-200">
                    Life: <strong>{entry.lifeSupportKw}kW</strong>
                  </span>
                  <span className="text-cyan-300">
                    Shield: <strong>{entry.shieldingKw}kW</strong>
                  </span>
                  <span
                    className={entry.osdrDoseMsv <= 1.0 ? 'text-emerald-300' : 'text-rose-300'}
                  >
                    {entry.osdrDoseMsv} mSv/d
                  </span>
                  <span className="text-white flex items-center gap-0.5">
                    <HeartPulse className="w-3 h-3 text-emerald-400" />
                    {entry.lifeSupportAfter}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className={`w-full min-h-[50px] px-6 py-3 rounded-2xl font-display font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            outcome === 'VICTORY'
              ? 'bg-emerald-400 hover:bg-emerald-300 text-[#06150E] shadow-[0_0_24px_rgba(16,185,129,0.35)]'
              : 'bg-cyan-400 hover:bg-cyan-300 text-[#071020] shadow-[0_0_24px_rgba(34,211,238,0.35)]'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          <span>{outcome === 'VICTORY' ? 'Play Again' : 'Try Again'}</span>
        </button>
      </div>
    </div>
  );
}
