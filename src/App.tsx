import { useCallback, useEffect, useRef, useState } from 'react';
import { CrisisBanner } from './components/CrisisBanner';
import { DataSourcesModal } from './components/DataSourcesModal';
import { DonkiModal } from './components/DonkiModal';
import { EndGameModal } from './components/EndGameModal';
import { LunarOutpostVisualizer } from './components/LunarOutpostVisualizer';
import { OnboardingModal } from './components/OnboardingModal';
import { PowerConsole } from './components/PowerConsole';
import { SolDebriefModal } from './components/SolDebriefModal';
import { TopStatusHeader } from './components/TopStatusHeader';
import { MARS_TREK_SITES } from './data/scienceData';
import {
  CapcomResponse,
  generateEarthCommsHint,
  generateSolDebriefFeedback,
  generateVictoryCommendation
} from './services/capcomAiService';
import {
  NASA_ARCHIVE_FALLBACK_EVENTS,
  fetchNasaDonkiFlares
} from './services/nasaDonkiService';
import {
  CommsTarget,
  DifficultyMode,
  DonkiDataSource,
  GamePhase,
  MarsSite,
  MissionTraceEntry,
  PowerAllocation,
  SolDebriefData,
  SolarFlareEvent
} from './types/game';
import {
  DEFAULT_MAX_POWER,
  INITIAL_POWER,
  SLIDER_MAX_KW,
  SLIDER_STEP_KW,
  clampAllocationToBudget,
  getCrisisSecondsForMode,
  getLifeSupportDelta,
  getOsdrDoseRateMsv,
  getRequiredLifeSupportKw,
  getShieldStrength,
  getTotalAllocatedPower,
  getTotalSolsForMode,
  resolveSolOutcome,
  calculateCommanderRank
} from './utils/simulation';
import { soundEngine } from './utils/soundEngine';

const INITIAL_LIFE_SUPPORT = 80;

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('ONBOARDING');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSourcesModal, setShowSourcesModal] = useState<boolean>(false);

  const [mode, setMode] = useState<DifficultyMode>('CADET');
  const [selectedMarsSite, setSelectedMarsSite] = useState<MarsSite>(MARS_TREK_SITES[0]);

  const [sol, setSol] = useState<number>(1);
  const [lifeSupportLevel, setLifeSupportLevel] = useState<number>(INITIAL_LIFE_SUPPORT);
  const [maxPowerBudget, setMaxPowerBudget] = useState<number>(DEFAULT_MAX_POWER);
  const [power, setPower] = useState<PowerAllocation>(INITIAL_POWER);
  const [powerHistory, setPowerHistory] = useState<PowerAllocation[]>([]);
  const [traceLog, setTraceLog] = useState<MissionTraceEntry[]>([]);
  const [cropPenaltyActive, setCropPenaltyActive] = useState<boolean>(false);

  const [donkiEvents, setDonkiEvents] = useState<SolarFlareEvent[]>(
    NASA_ARCHIVE_FALLBACK_EVENTS
  );
  const [dataSource, setDataSource] = useState<DonkiDataSource>('NASA_ARCHIVE_FALLBACK');
  const [isLoadingDonki, setIsLoadingDonki] = useState<boolean>(true);

  const [simProgress, setSimProgress] = useState<number>(0);
  const [isFinalizingSol, setIsFinalizingSol] = useState<boolean>(false);
  const [crisisTriggeredThisSol, setCrisisTriggeredThisSol] = useState<boolean>(false);
  const [crisisCountdown, setCrisisCountdown] = useState<number>(12);
  const [radiationWarningFlash, setRadiationWarningFlash] = useState<boolean>(false);
  const [impactShakeActive, setImpactShakeActive] = useState<boolean>(false);
  const [dashboardVignetteFlash, setDashboardVignetteFlash] = useState<boolean>(false);
  const [floatingDeltas, setFloatingDeltas] = useState<{
    lifeSupport: number;
    key: number;
  } | null>(null);

  const [commsTarget, setCommsTarget] = useState<CommsTarget>('MOON');
  const [commsRemainingSec, setCommsRemainingSec] = useState<number | null>(null);
  const [earthTip, setEarthTip] = useState<{ text: string; isAiGenerated: boolean } | null>(null);
  const pendingHintRef = useRef<Promise<CapcomResponse> | null>(null);

  const [debrief, setDebrief] = useState<SolDebriefData | null>(null);
  const [victoryCommendation, setVictoryCommendation] = useState<{
    text: string;
    isAiGenerated: boolean;
  } | null>(null);
  const [showDonkiModal, setShowDonkiModal] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  const totalSols = getTotalSolsForMode(mode);
  const currentFlare = donkiEvents[sol - 1] ?? NASA_ARCHIVE_FALLBACK_EVENTS[0];
  const activeMarsSite = mode === 'COMMANDER' ? selectedMarsSite : null;
  const requiredLifeSupportKw = getRequiredLifeSupportKw({
    mode,
    marsSite: activeMarsSite,
    cropPenaltyActive
  });
  const commsTotalSec = commsTarget === 'MOON' ? 3 : 45;

  const latestStateRef = useRef({
    sol,
    totalSols,
    mode,
    activeMarsSite,
    lifeSupportLevel,
    power,
    currentFlare,
    cropPenaltyActive,
    requiredLifeSupportKw,
    crisisTriggeredThisSol,
    isFinalizingSol
  });

  latestStateRef.current = {
    sol,
    totalSols,
    mode,
    activeMarsSite,
    lifeSupportLevel,
    power,
    currentFlare,
    cropPenaltyActive,
    requiredLifeSupportKw,
    crisisTriggeredThisSol,
    isFinalizingSol
  };

  useEffect(() => {
    let active = true;
    fetchNasaDonkiFlares().then((result) => {
      if (!active) return;
      setDonkiEvents(result.events);
      setDataSource(result.dataSource);
      setIsLoadingDonki(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const remainingPowerKw = Math.max(0, maxPowerBudget - getTotalAllocatedPower(power));
  const shieldStrength = getShieldStrength(power.shielding);
  const osdrDoseMsv = getOsdrDoseRateMsv(power.shielding, currentFlare);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.muted = next;
      if (!next) {
        soundEngine.unlock();
        soundEngine.playSliderTick(40);
      }
      return next;
    });
  }, []);

  const applyBudgetForMode = useCallback(
    (nextMode: DifficultyMode, nextSite: MarsSite) => {
      const budget = nextMode === 'COMMANDER' ? nextSite.basePowerBudget : DEFAULT_MAX_POWER;
      setMaxPowerBudget(budget);
      setPower(clampAllocationToBudget(INITIAL_POWER, budget));
    },
    []
  );

  const handleSelectMode = useCallback(
    (nextMode: DifficultyMode) => {
      soundEngine.unlock();
      soundEngine.playSliderTick(50);
      setMode(nextMode);
      setCommsTarget(nextMode === 'COMMANDER' ? 'MARS' : 'MOON');
      applyBudgetForMode(nextMode, selectedMarsSite);
    },
    [selectedMarsSite, applyBudgetForMode]
  );

  const handleSelectMarsSite = useCallback(
    (site: MarsSite) => {
      soundEngine.unlock();
      soundEngine.playSliderTick(55);
      setSelectedMarsSite(site);
      applyBudgetForMode('COMMANDER', site);
    },
    [applyBudgetForMode]
  );

  const handleLaunchMission = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playSolSurvivedChime();
    applyBudgetForMode(mode, selectedMarsSite);
    setPhase('PLANNING');
  }, [mode, selectedMarsSite, applyBudgetForMode]);

  const handleResetMission = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playSolSurvivedChime();
    const budget = mode === 'COMMANDER' ? selectedMarsSite.basePowerBudget : DEFAULT_MAX_POWER;
    setSol(1);
    setLifeSupportLevel(INITIAL_LIFE_SUPPORT);
    setMaxPowerBudget(budget);
    setPower(clampAllocationToBudget(INITIAL_POWER, budget));
    setPowerHistory([]);
    setTraceLog([]);
    setCropPenaltyActive(false);
    setSimProgress(0);
    setIsFinalizingSol(false);
    setCrisisTriggeredThisSol(false);
    setCrisisCountdown(getCrisisSecondsForMode(mode));
    setRadiationWarningFlash(false);
    setImpactShakeActive(false);
    setDashboardVignetteFlash(false);
    setFloatingDeltas(null);
    setCommsRemainingSec(null);
    pendingHintRef.current = null;
    setEarthTip(null);
    setDebrief(null);
    setVictoryCommendation(null);
    setShowHelpModal(false);
    setShowDonkiModal(false);
    setShowSourcesModal(false);
    setPhase('PLANNING');
  }, [mode, selectedMarsSite]);

  const handleChangePower = useCallback(
    (key: keyof PowerAllocation, requestedValue: number) => {
      setPower((prev) => {
        const snapped = Math.round(requestedValue / SLIDER_STEP_KW) * SLIDER_STEP_KW;
        const clampedRange = Math.max(0, Math.min(SLIDER_MAX_KW, snapped));
        const totalOthers = getTotalAllocatedPower(prev) - prev[key];
        const maxAllowedForSlider = Math.min(
          SLIDER_MAX_KW,
          Math.max(0, maxPowerBudget - totalOthers)
        );
        const finalValue = Math.min(clampedRange, maxAllowedForSlider);
        if (finalValue === prev[key]) return prev;
        soundEngine.playSliderTick(finalValue);
        return { ...prev, [key]: finalValue };
      });
    },
    [maxPowerBudget]
  );

  const handleAskEarthControl = useCallback(() => {
    if (commsRemainingSec !== null || phase !== 'PLANNING') return;
    soundEngine.playCommsPing();
    pendingHintRef.current = generateEarthCommsHint(
      currentFlare,
      power,
      requiredLifeSupportKw,
      commsTarget
    );
    setCommsRemainingSec(commsTotalSec);
  }, [
    commsRemainingSec,
    phase,
    currentFlare,
    power,
    requiredLifeSupportKw,
    commsTarget,
    commsTotalSec
  ]);

  const handleFastForwardComms = useCallback(() => {
    if (commsRemainingSec === null) return;
    const hintPromise = pendingHintRef.current;
    pendingHintRef.current = null;
    setCommsRemainingSec(null);
    if (hintPromise) {
      hintPromise.then((res) => {
        soundEngine.playCommsReturnChirp();
        setEarthTip(res);
      });
    }
  }, [commsRemainingSec]);

  useEffect(() => {
    if (commsRemainingSec === null) return;
    const timer = window.setInterval(() => {
      setCommsRemainingSec((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(timer);
          const hintPromise = pendingHintRef.current;
          pendingHintRef.current = null;
          if (hintPromise) {
            hintPromise.then((res) => {
              soundEngine.playCommsReturnChirp();
              setEarthTip(res);
              setCommsRemainingSec(null);
            });
          } else {
            setCommsRemainingSec(null);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [commsRemainingSec !== null]);

  const handleRunSimulation = useCallback(() => {
    if (phase !== 'PLANNING' || isFinalizingSol) return;
    soundEngine.playSliderTick(55);
    setSimProgress(0);
    setIsFinalizingSol(false);
    setCrisisTriggeredThisSol(false);
    setRadiationWarningFlash(false);
    setImpactShakeActive(false);
    setDashboardVignetteFlash(false);
    setCommsRemainingSec(null);
    pendingHintRef.current = null;
    setPhase('SIMULATING');
  }, [phase, isFinalizingSol]);

  const triggerDamageImpactFX = useCallback(() => {
    soundEngine.playImpactSound();
    setImpactShakeActive(true);
    setDashboardVignetteFlash(true);
    window.setTimeout(() => setImpactShakeActive(false), 550);
    window.setTimeout(() => setDashboardVignetteFlash(false), 900);
  }, []);

  const finalizeCurrentSol = useCallback(async () => {
    const state = latestStateRef.current;
    const flare = state.currentFlare;
    const p = state.power;

    const baseDelta = getLifeSupportDelta({
      lifeSupportKw: p.lifeSupport,
      requiredLifeSupportKw: state.requiredLifeSupportKw,
      cropPenaltyActive: state.cropPenaltyActive
    });

    const shieldHeld = p.shielding >= flare.requiredShieldKw;
    const radiationPenalty = shieldHeld ? 0 : -flare.radiationDamage;
    const projectedEndLife = Math.max(
      0,
      Math.min(100, state.lifeSupportLevel + baseDelta + radiationPenalty)
    );
    const lifeSupportChange = projectedEndLife - state.lifeSupportLevel;
    const osdrMsv = getOsdrDoseRateMsv(p.shielding, flare);

    const baselineThreshold = getRequiredLifeSupportKw({
      mode: state.mode,
      marsSite: state.activeMarsSite,
      cropPenaltyActive: false
    });
    const cropPenaltyTriggered = p.lifeSupport < baselineThreshold;

    if (!shieldHeld) {
      triggerDamageImpactFX();
      if (flare.severityLevel === 'EXTREME') {
        setRadiationWarningFlash(true);
      }
    }

    const capcomFeedback = await generateSolDebriefFeedback({
      sol: state.sol,
      mode: state.mode,
      lifeSupportKw: p.lifeSupport,
      shieldingKw: p.shielding,
      classType: flare.classType,
      sourceLocation: flare.sourceLocation,
      requiredShieldKw: flare.requiredShieldKw,
      osdrDoseMsv: osdrMsv,
      lifeSupportChange,
      lifeSupportLevel: projectedEndLife,
      cropPenaltyTriggered
    });

    const outcome = resolveSolOutcome({
      sol: state.sol,
      startLifeSupport: state.lifeSupportLevel,
      power: p,
      flareEvent: flare,
      mode: state.mode,
      marsSite: state.activeMarsSite,
      cropPenaltyActive: state.cropPenaltyActive,
      capcomMessage: capcomFeedback.text,
      capcomAiPowered: capcomFeedback.isAiGenerated
    });

    const traceEntry: MissionTraceEntry = {
      sol: state.sol,
      flrID: flare.flrID,
      classType: flare.classType,
      sourceLocation: flare.sourceLocation,
      osdrDoseMsv: outcome.osdrDoseMsv,
      lifeSupportKw: p.lifeSupport,
      shieldingKw: p.shielding,
      lifeSupportAfter: outcome.endLifeSupport,
      shieldHeld: outcome.shieldHeld,
      triggeredCropPenaltyNextSol: outcome.cropPenaltyTriggeredNextSol
    };

    setPowerHistory((prev) => [...prev, p]);
    setTraceLog((prev) => [...prev, traceEntry]);
    setLifeSupportLevel(outcome.endLifeSupport);
    setFloatingDeltas({
      lifeSupport: outcome.lifeSupportDelta,
      key: Date.now()
    });
    setDebrief(outcome);
    setIsFinalizingSol(false);
    setPhase('DEBRIEF');

    if (outcome.shieldHeld && outcome.endLifeSupport > 0) {
      soundEngine.playSolSurvivedChime();
    }
  }, [triggerDamageImpactFX]);

  // 6-second Sol Simulation loop with Cadet (12s) / Commander (8s) Crisis Interrupt
  useEffect(() => {
    if (phase !== 'SIMULATING' || isFinalizingSol) return;

    const interval = window.setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 100 / 60;
        const state = latestStateRef.current;
        const flare = state.currentFlare;
        const requiresCrisisInterrupt =
          flare.severityLevel === 'MODERATE' || flare.severityLevel === 'EXTREME';

        if (requiresCrisisInterrupt && !state.crisisTriggeredThisSol && next >= 50) {
          window.clearInterval(interval);
          const crisisSecs = getCrisisSecondsForMode(state.mode);
          setCrisisTriggeredThisSol(true);
          setCrisisCountdown(crisisSecs);
          setPhase('CRISIS_PAUSE');
          soundEngine.playCrisisBeep(crisisSecs);
          return 50;
        }

        if (next >= 100) {
          window.clearInterval(interval);
          setIsFinalizingSol(true);
          finalizeCurrentSol();
          return 100;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [phase, isFinalizingSol, finalizeCurrentSol]);

  useEffect(() => {
    if (phase !== 'CRISIS_PAUSE') return;

    const timer = window.setInterval(() => {
      setCrisisCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          window.clearInterval(timer);
          const state = latestStateRef.current;
          if (
            state.currentFlare.severityLevel === 'EXTREME' &&
            state.power.shielding < state.currentFlare.requiredShieldKw
          ) {
            setRadiationWarningFlash(true);
          }
          setPhase('SIMULATING');
          return 0;
        }
        soundEngine.playCrisisBeep(next);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  const handleResolveCrisis = useCallback(() => {
    if (phase !== 'CRISIS_PAUSE') return;
    soundEngine.playSolSurvivedChime();
    setPhase('SIMULATING');
  }, [phase]);

  const handleNextSol = useCallback(() => {
    if (!debrief) return;
    soundEngine.playSliderTick(50);

    if (debrief.endLifeSupport <= 0) {
      setDebrief(null);
      setRadiationWarningFlash(false);
      setPhase('GAME_OVER');
      return;
    }

    if (debrief.sol >= totalSols) {
      const finalLife = debrief.endLifeSupport;
      const shieldedCount = traceLog.filter((t) => t.shieldHeld).length;
      const rank = calculateCommanderRank(finalLife, shieldedCount, totalSols);
      const historyCount = Math.max(1, powerHistory.length);
      const avgLifeSupport = Math.round(
        powerHistory.reduce((acc, p) => acc + p.lifeSupport, 0) / historyCount
      );
      const avgShielding = Math.round(
        powerHistory.reduce((acc, p) => acc + p.shielding, 0) / historyCount
      );

      setDebrief(null);
      setRadiationWarningFlash(false);
      setVictoryCommendation(null);
      soundEngine.playVictoryChime();
      setPhase('VICTORY');

      generateVictoryCommendation({
        finalLifeSupport: finalLife,
        totalSols,
        rank,
        avgLifeSupport,
        avgShielding,
        mode,
        siteName: mode === 'COMMANDER' ? selectedMarsSite.name : 'Moon Base Alpha'
      }).then((res) => {
        setVictoryCommendation(res);
      });
      return;
    }

    setSol(debrief.sol + 1);
    setCropPenaltyActive(debrief.cropPenaltyTriggeredNextSol);
    setSimProgress(0);
    setIsFinalizingSol(false);
    setCrisisTriggeredThisSol(false);
    setRadiationWarningFlash(false);
    setEarthTip(null);
    setCommsRemainingSec(null);
    pendingHintRef.current = null;
    setDebrief(null);
    setPhase('PLANNING');
  }, [debrief, totalSols, traceLog, powerHistory, mode, selectedMarsSite]);

  return (
    <div
      className={`min-h-screen lg:h-screen lg:overflow-hidden bg-[#0B1021] text-slate-100 flex flex-col transition-shadow duration-300 ${
        dashboardVignetteFlash
          ? 'shadow-[inset_0_0_95px_rgba(244,63,94,0.55)] ring-2 ring-inset ring-rose-500/70'
          : ''
      }`}
    >
      <main className="flex-1 min-h-0 w-full max-w-[1440px] mx-auto p-2.5 sm:p-3.5 flex flex-col gap-2.5">
        <TopStatusHeader
          sol={sol}
          totalSols={totalSols}
          mode={mode}
          siteLabel={mode === 'COMMANDER' ? selectedMarsSite.name : 'Moon Base'}
          remainingPowerKw={remainingPowerKw}
          maxPowerBudget={maxPowerBudget}
          lifeSupportLevel={lifeSupportLevel}
          shieldStrength={shieldStrength}
          osdrDoseMsv={osdrDoseMsv}
          flareEvent={currentFlare}
          dataSource={dataSource}
          isLoadingDonki={isLoadingDonki}
          floatingDeltas={floatingDeltas}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenDonki={() => {
            soundEngine.playSliderTick(48);
            setShowDonkiModal(true);
          }}
          onOpenSources={() => {
            soundEngine.playSliderTick(50);
            setShowSourcesModal(true);
          }}
          onOpenHelp={() => {
            soundEngine.playSliderTick(52);
            setShowHelpModal(true);
          }}
          onResetMission={handleResetMission}
        />

        {phase === 'CRISIS_PAUSE' && (
          <CrisisBanner
            flareEvent={currentFlare}
            countdown={crisisCountdown}
            power={power}
            onResolveCrisis={handleResolveCrisis}
          />
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          <div className="lg:col-span-7 min-h-0">
            <LunarOutpostVisualizer
              sol={sol}
              mode={mode}
              marsSite={activeMarsSite}
              phase={phase}
              simProgress={simProgress}
              power={power}
              maxPowerBudget={maxPowerBudget}
              requiredLifeSupportKw={requiredLifeSupportKw}
              flareEvent={currentFlare}
              crisisCountdown={crisisCountdown}
              radiationWarningFlash={radiationWarningFlash}
              impactShakeActive={impactShakeActive}
              isCommsTransmitting={commsRemainingSec !== null}
            />
          </div>

          <div className="lg:col-span-5 min-h-0">
            <PowerConsole
              sol={sol}
              phase={phase}
              power={power}
              maxPowerBudget={maxPowerBudget}
              requiredLifeSupportKw={requiredLifeSupportKw}
              cropPenaltyActive={cropPenaltyActive}
              currentFlare={currentFlare}
              onChangePower={handleChangePower}
              onRunSimulation={handleRunSimulation}
              isFinalizingSol={isFinalizingSol}
              commsTarget={commsTarget}
              onChangeCommsTarget={(target) => {
                soundEngine.playSliderTick(45);
                setCommsTarget(target);
              }}
              commsRemainingSec={commsRemainingSec}
              commsTotalSec={commsTotalSec}
              earthTip={earthTip}
              onAskEarthControl={handleAskEarthControl}
              onFastForwardComms={handleFastForwardComms}
            />
          </div>
        </div>
      </main>

      {(phase === 'ONBOARDING' || showHelpModal) && (
        <OnboardingModal
          isHelpMode={showHelpModal}
          mode={mode}
          selectedMarsSite={selectedMarsSite}
          onSelectMode={handleSelectMode}
          onSelectMarsSite={handleSelectMarsSite}
          onStart={() => {
            if (showHelpModal) {
              soundEngine.playSliderTick(45);
              setShowHelpModal(false);
            } else {
              handleLaunchMission();
            }
          }}
        />
      )}

      {showDonkiModal && (
        <DonkiModal
          currentSol={sol}
          events={donkiEvents.slice(0, totalSols)}
          dataSource={dataSource}
          onClose={() => setShowDonkiModal(false)}
        />
      )}

      {showSourcesModal && (
        <DataSourcesModal
          dataSource={dataSource}
          onClose={() => setShowSourcesModal(false)}
        />
      )}

      {phase === 'DEBRIEF' && debrief && (
        <SolDebriefModal
          debrief={debrief}
          totalSols={totalSols}
          dataSource={dataSource}
          onNextSol={handleNextSol}
        />
      )}

      {(phase === 'VICTORY' || phase === 'GAME_OVER') && (
        <EndGameModal
          outcome={phase}
          solReached={sol}
          totalSols={totalSols}
          lifeSupportLevel={lifeSupportLevel}
          dataSource={dataSource}
          traceLog={traceLog}
          victoryCommendation={victoryCommendation}
          onPlayAgain={handleResetMission}
        />
      )}
    </div>
  );
}
