import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { BottomControlDock } from './components/BottomControlDock';
import {
  DecisionActionOverlay,
  resolveOptionActionAnim,
  resolveStationRepairAnim
} from './components/DecisionActionOverlay';
import { DilemmaModal } from './components/DilemmaModal';
import { DonkiModal } from './components/DonkiModal';
import { EndGameModal } from './components/EndGameModal';
import { HudTopBar } from './components/HudTopBar';
import { OnboardingModal } from './components/OnboardingModal';
import { DpadVector, Outpost3DViewport } from './components/Outpost3DViewport';
import { SolDebriefModal } from './components/SolDebriefModal';
import { StormImpactOverlay } from './components/StormImpactOverlay';
import { StoryCutsceneOverlay } from './components/StoryCutsceneOverlay';
import { SurpriseEmergencyModal } from './components/SurpriseEmergencyModal';
import {
  createInitialSystems,
  INITIAL_BACKPACK,
  pickMorningDilemma,
  pickSurpriseDeckForSol
} from './data/physicsEvents';
import { BASE_STATIONS, MARS_TREK_SITES } from './data/scienceData';
import { buildStoryBeats } from './data/storyScript';
import {
  generateEarthCommsHint,
  generateSolDebriefFeedback,
  generateVictoryCommendation
} from './services/capcomAiService';
import {
  fetchNasaDonkiFlares,
  NASA_ARCHIVE_FALLBACK_EVENTS
} from './services/nasaDonkiService';
import {
  ActiveActionSequence,
  BackpackInventory,
  BaseSystemsState,
  CommsTarget,
  DifficultyMode,
  DilemmaOption,
  GamePhase,
  MarsSite,
  MissionTraceEntry,
  PowerAllocation,
  SolDebriefData,
  SolarFlareEvent,
  StationId,
  SurpriseEmergency,
  SurpriseOption,
  WorldBody
} from './types/game';
import { haptics } from './utils/haptics';
import {
  calculateCommanderRank,
  clampAllocationToBudget,
  computeEffectiveGridBudget,
  getRequiredElectrolysisKw,
  getRequiredGrowHeatKw,
  getTotalAllocatedPower,
  getTotalSolsForMode,
  INITIAL_POWER,
  resolveEndOfSolStorm,
  SLIDER_MAX_KW,
  stepShiftPhysics
} from './utils/physicsSimulation';
import { radioVoiceEngine } from './utils/radioVoiceEngine';
import { soundEngine } from './utils/soundEngine';

const SHIFT_DURATION_SECONDS = 38;

const SANDBOX_BACKPACK: BackpackInventory = {
  megaBattery: 3,
  sunBlanket: 3,
  waterCartridge: 3,
  filamentSpool: 4
};

export function App() {
  const [world, setWorld] = useState<WorldBody>('MOON');
  const [mode, setMode] = useState<DifficultyMode>('CADET');
  const [selectedMarsSite, setSelectedMarsSite] = useState<MarsSite>(MARS_TREK_SITES[0]);
  const [phase, setPhase] = useState<GamePhase>('ONBOARDING');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);

  const [sol, setSol] = useState(1);
  const [shiftSecondsLeft, setShiftSecondsLeft] = useState(SHIFT_DURATION_SECONDS);
  const [systems, setSystems] = useState<BaseSystemsState>(() => createInitialSystems('MOON'));
  const [power, setPower] = useState<PowerAllocation>(INITIAL_POWER);
  const [backpack, setBackpack] = useState<BackpackInventory>(INITIAL_BACKPACK);

  const [solStartWaterO2, setSolStartWaterO2] = useState(84);
  const [solStartCrops, setSolStartCrops] = useState(82);

  const [morningChoiceTag, setMorningChoiceTag] = useState<string | undefined>(undefined);
  const [solSurpriseDecisions, setSolSurpriseDecisions] = useState<string[]>([]);
  const [solGadgetsUsed, setSolGadgetsUsed] = useState<string[]>([]);

  const [surpriseDeck, setSurpriseDeck] = useState<SurpriseEmergency[]>([]);
  const [firedSurpriseIds, setFiredSurpriseIds] = useState<string[]>([]);
  const [activeEmergency, setActiveEmergency] = useState<SurpriseEmergency | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveActionSequence | null>(null);
  const [actionStage, setActionStage] = useState<'WALKING' | 'WORKING'>('WALKING');
  const actionNonceRef = useRef(0);

  const [nearestStation, setNearestStation] = useState<StationId | null>(null);
  const [nearestDistance, setNearestDistance] = useState(99);
  const [jumpNonce, setJumpNonce] = useState(0);
  const dpadRef = useRef<DpadVector>({ x: 0, z: 0 });

  const [flareEvents, setFlareEvents] = useState<SolarFlareEvent[]>(NASA_ARCHIVE_FALLBACK_EVENTS);
  const [debriefData, setDebriefData] = useState<SolDebriefData | null>(null);
  const [traceLog, setTraceLog] = useState<MissionTraceEntry[]>([]);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [victoryCommendation, setVictoryCommendation] = useState<{
    text: string;
    isAiGenerated: boolean;
  } | null>(null);

  const [bannerText, setBannerText] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const [commsDelaySeconds, setCommsDelaySeconds] = useState(0);
  const [commsLoading, setCommsLoading] = useState(false);
  const [radioSpeaking, setRadioSpeaking] = useState(false);
  const [commsMessage, setCommsMessage] = useState<{
    text: string;
    isAiGenerated: boolean;
  } | null>(null);

  const isSandbox = mode === 'SANDBOX';
  const totalSols = getTotalSolsForMode(world, mode);
  const activeMarsSite = world === 'MARS' ? selectedMarsSite : null;
  const siteName = world === 'MARS' ? selectedMarsSite.name : 'Lunar Outpost Alpha';

  const maxGridBudgetKw = useMemo(
    () => computeEffectiveGridBudget({ world, marsSite: activeMarsSite, systems }),
    [world, activeMarsSite, systems]
  );

  const upcomingFlare = flareEvents[(sol - 1) % flareEvents.length] ?? null;
  const morningDilemma = useMemo(() => pickMorningDilemma(sol), [sol]);
  const storyBeats = useMemo(() => buildStoryBeats(world, siteName), [world, siteName]);

  // Fetch solar storm progression silently on mount
  useEffect(() => {
    let mounted = true;
    fetchNasaDonkiFlares().then((res) => {
      if (mounted && res.events.length > 0) {
        setFlareEvents(res.events);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Clamp allocated power whenever grid budget shrinks
  useEffect(() => {
    setPower((prev) => clampAllocationToBudget(prev, maxGridBudgetKw));
  }, [maxGridBudgetKw]);

  // Unlock Web Audio + global subtle click pop & whisper-quiet hover tick
  useEffect(() => {
    let lastHoverTarget: Element | null = null;
    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlock();
      const target = e.target as Element | null;
      const btn = target?.closest('button');
      if (btn && !btn.disabled) {
        soundEngine.playButtonClick('ui');
        haptics.click();
        btn.classList.remove('animate-btn-pop');
        void (btn as HTMLElement).offsetWidth;
        btn.classList.add('animate-btn-pop');
      }
    };
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const interactive = target?.closest('button, .hover-sfx, .hover-option-card') ?? null;
      if (interactive && interactive !== lastHoverTarget) {
        lastHoverTarget = interactive;
        if (!(interactive instanceof HTMLButtonElement && interactive.disabled)) {
          soundEngine.playHoverTick();
        }
      } else if (!interactive) {
        lastHoverTarget = null;
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerover', onPointerOver, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerover', onPointerOver, true);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setBannerText(msg);
  }, []);

  useEffect(() => {
    if (!bannerText) return;
    const t = window.setTimeout(() => setBannerText(null), 5000);
    return () => window.clearTimeout(t);
  }, [bannerText]);

  // Safety fallback for post-decision & repair Action Execution animations
  useEffect(() => {
    if (!activeAction) return;
    const t = window.setTimeout(() => {
      setActiveAction(null);
      setPhase((p) => (p === 'ACTION_EXECUTION' ? 'ACTIVE_SHIFT' : p));
    }, 4800);
    return () => window.clearTimeout(t);
  }, [activeAction]);

  const checkFatalThresholds = useCallback(
    (next: BaseSystemsState): string | null => {
      if (isSandbox) return null;
      if (next.waterO2Pct <= 0) {
        return 'Water & Electrolysis Oxygen hit 0%! Remember: in space, recycled water makes your breathable air too!';
      }
      if (next.cropsPct <= 0) {
        return 'Hydroponics Crops dropped to 0%! Watch out for invasive bio-mold and keep grow lights powered!';
      }
      if (next.cabinTempC >= 52) {
        return 'Habitat Overheated past 52°C! Without working external radiators, a vacuum traps heat like a giant thermos!';
      }
      if (next.co2Ppm >= 4500) {
        return 'Cabin CO2 exceeded 4,500 ppm! Saturated CO2 scrubbers must be baked out before the crew loses focus!';
      }
      return null;
    },
    [isSandbox]
  );

  // Trigger end-of-Sol solar storm impact animation + Gemini AI debrief
  const handleBraceForStorm = useCallback(() => {
    if (phase !== 'ACTIVE_SHIFT') return;
    soundEngine.playButtonClick('launch');
    haptics.launch();
    setActiveEmergency(null);
    setPhase('STORM_SIM');
  }, [phase]);

  // Resolve storm after 3.2s visual impact
  useEffect(() => {
    if (phase !== 'STORM_SIM' || !upcomingFlare) return;
    const timer = window.setTimeout(async () => {
      const effectiveShield = power.shieldingKw + systems.nextSolShieldBonusKw;
      const capcomResp = await generateSolDebriefFeedback({
        sol,
        world,
        mode,
        electrolysisKw: power.electrolysisKw,
        growHeatKw: power.growHeatKw,
        shieldingKw: effectiveShield,
        severityLevel: upcomingFlare.severityLevel,
        requiredShieldKw: upcomingFlare.requiredShieldKw,
        waterO2Pct: Math.round(systems.waterO2Pct),
        cropsPct: Math.round(systems.cropsPct),
        cabinTempC: systems.cabinTempC,
        co2Ppm: systems.co2Ppm,
        sunBlanketSaved:
          effectiveShield < upcomingFlare.requiredShieldKw && systems.sunBlanketActive
      });

      const { debrief, endSystems, juryRigBurst } = resolveEndOfSolStorm({
        sol,
        world,
        marsSite: activeMarsSite,
        startWaterO2: solStartWaterO2,
        startCrops: solStartCrops,
        power,
        systems,
        flareEvent: upcomingFlare,
        capcomMessage: capcomResp.text,
        capcomAiPowered: capcomResp.isAiGenerated
      });

      // Keep Sandbox Mode strictly safe even after a test storm
      const safeEndSystems: BaseSystemsState = isSandbox
        ? {
            ...endSystems,
            waterO2Pct: Math.max(20, endSystems.waterO2Pct),
            cropsPct: Math.max(20, endSystems.cropsPct),
            cabinTempC: Math.min(39, Math.max(12, endSystems.cabinTempC)),
            co2Ppm: Math.min(2200, endSystems.co2Ppm)
          }
        : endSystems;

      if (debrief.shieldHeld) {
        soundEngine.playSolSurvivedChime();
      } else {
        soundEngine.playImpactSound();
        haptics.alert();
      }

      if (juryRigBurst) {
        showToast('Jury-rigged valve burst during the storm (-10% Water/O2, +6°C)!');
      }

      const summaryNote = debrief.shieldHeld
        ? `Forcefield blocked storm (${debrief.effectiveShieldPower}/${upcomingFlare.requiredShieldKw}⚡).`
        : `Solar zap penetrated shields (${debrief.radiationDamage}% impact)!`;

      const logEntry: MissionTraceEntry = {
        sol,
        world,
        severityLevel: upcomingFlare.severityLevel,
        requiredShieldKw: upcomingFlare.requiredShieldKw,
        effectiveShieldKw: debrief.effectiveShieldPower,
        shieldHeld: debrief.shieldHeld,
        waterO2After: safeEndSystems.waterO2Pct,
        cropsAfter: safeEndSystems.cropsPct,
        cabinTempAfter: safeEndSystems.cabinTempC,
        co2PpmAfter: safeEndSystems.co2Ppm,
        morningChoice: morningChoiceTag,
        surpriseDecisions: solSurpriseDecisions,
        gadgetsUsed: solGadgetsUsed,
        summaryNote
      };

      setSystems(safeEndSystems);
      setDebriefData({
        ...debrief,
        endWaterO2: safeEndSystems.waterO2Pct,
        endCrops: safeEndSystems.cropsPct,
        endTempC: safeEndSystems.cabinTempC,
        endCo2Ppm: safeEndSystems.co2Ppm
      });
      setTraceLog((prev) => [...prev, logEntry]);

      const fail = checkFatalThresholds(safeEndSystems);
      if (fail) {
        setFailureReason(fail);
      }

      setPhase('DEBRIEF');
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [
    phase,
    upcomingFlare,
    power,
    systems,
    sol,
    world,
    mode,
    isSandbox,
    activeMarsSite,
    solStartWaterO2,
    solStartCrops,
    morningChoiceTag,
    solSurpriseDecisions,
    solGadgetsUsed,
    checkFatalThresholds,
    showToast
  ]);

  // Active shift 1-second physics + countdown + surprise emergency triggers (disabled in Sandbox!)
  useEffect(() => {
    if (phase !== 'ACTIVE_SHIFT' || showForecastModal || showHelpModal) return;

    const interval = window.setInterval(() => {
      setSystems((prev) => {
        const next = stepShiftPhysics({
          world,
          marsSite: activeMarsSite,
          power,
          systems: prev,
          sandboxMode: isSandbox
        });
        const fatal = checkFatalThresholds(next);
        if (fatal) {
          setFailureReason(fatal);
          setPhase('GAME_OVER');
        }
        return next;
      });

      if (isSandbox) return; // No timer pressure or surprise ambushes in Sandbox Mode

      setShiftSecondsLeft((prevLeft) => {
        const nextLeft = prevLeft - 1;
        if (nextLeft === 28 && surpriseDeck[0] && !firedSurpriseIds.includes(surpriseDeck[0].id)) {
          const em = surpriseDeck[0];
          setFiredSurpriseIds((f) => [...f, em.id]);
          setActiveEmergency(em);
          setPhase('SURPRISE_DECISION');
          soundEngine.playCrisisBeep(3);
          haptics.alert();
        } else if (
          nextLeft === 14 &&
          surpriseDeck[1] &&
          !firedSurpriseIds.includes(surpriseDeck[1].id)
        ) {
          const em = surpriseDeck[1];
          setFiredSurpriseIds((f) => [...f, em.id]);
          setActiveEmergency(em);
          setPhase('SURPRISE_DECISION');
          soundEngine.playCrisisBeep(2);
          haptics.alert();
        } else if (nextLeft <= 0) {
          setPhase('STORM_SIM');
          return 0;
        }
        return nextLeft;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    phase,
    isSandbox,
    showForecastModal,
    showHelpModal,
    world,
    activeMarsSite,
    power,
    surpriseDeck,
    firedSurpriseIds,
    checkFatalThresholds
  ]);

  // Earth radio light-speed delay ticker
  useEffect(() => {
    if (commsDelaySeconds <= 0) return;
    const t = window.setTimeout(() => {
      setCommsDelaySeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [commsDelaySeconds]);

  // Press 'E' near a station to handle active emergency or inspect
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'ACTIVE_SHIFT') return;
      if (e.key === 'e' || e.key === 'E') {
        if (activeEmergency && nearestStation === activeEmergency.stationId) {
          setPhase('SURPRISE_DECISION');
        } else if (nearestStation) {
          const st = BASE_STATIONS.find((s) => s.id === nearestStation);
          if (st) showToast(`Inspecting ${st.name}: Use the Walk & Fix buttons below!`);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, activeEmergency, nearestStation, showToast]);

  const handleStartMission = (skipStory = false) => {
    soundEngine.unlock();
    soundEngine.playButtonClick('launch');
    haptics.launch();
    radioVoiceEngine.stop();

    const initSys = createInitialSystems(world);
    const budget = computeEffectiveGridBudget({
      world,
      marsSite: world === 'MARS' ? selectedMarsSite : null,
      systems: initSys
    });

    setSol(1);
    setSystems(initSys);
    setBackpack(mode === 'SANDBOX' ? SANDBOX_BACKPACK : INITIAL_BACKPACK);
    setPower(clampAllocationToBudget(INITIAL_POWER, budget));
    setSolStartWaterO2(initSys.waterO2Pct);
    setSolStartCrops(initSys.cropsPct);
    setTraceLog([]);
    setFailureReason(null);
    setVictoryCommendation(null);
    setDebriefData(null);
    setCommsMessage(null);
    setActiveEmergency(null);
    setMorningChoiceTag(undefined);
    setSolSurpriseDecisions([]);
    setSolGadgetsUsed([]);
    setShiftSecondsLeft(SHIFT_DURATION_SECONDS);

    if (skipStory && mode === 'SANDBOX') {
      showToast('Welcome to Sandbox Safe Lab! Experiment with power & walk all 5 stations freely.');
      setPhase('ACTIVE_SHIFT');
    } else {
      setPhase('STORY_INTRO');
    }
  };

  const handleStoryComplete = () => {
    if (mode === 'SANDBOX') {
      showToast('Sandbox Lab ready! Test sliders, stations, and radio voices with zero crises.');
      setPhase('ACTIVE_SHIFT');
    } else {
      setPhase('MORNING_DILEMMA');
    }
  };

  const triggerActionSequence = useCallback(
    (payload: Omit<ActiveActionSequence, 'nonce'>) => {
      actionNonceRef.current += 1;
      setActionStage('WALKING');
      setActiveAction({ ...payload, nonce: actionNonceRef.current });
      if (payload.blocking) {
        setPhase('ACTION_EXECUTION');
      }
    },
    []
  );

  const handleChooseMorningDilemma = (opt: DilemmaOption) => {
    const result = opt.apply({ systems, backpack, world });
    setSystems(result.nextSystems);
    setBackpack(result.nextBackpack);
    setMorningChoiceTag(result.choiceTag);
    setSolSurpriseDecisions([]);
    setSolGadgetsUsed([]);
    setSolStartWaterO2(result.nextSystems.waterO2Pct);
    setSolStartCrops(result.nextSystems.cropsPct);

    const deck = pickSurpriseDeckForSol(sol, world);
    setSurpriseDeck(deck);
    setFiredSurpriseIds([]);
    setActiveEmergency(null);
    setShiftSecondsLeft(SHIFT_DURATION_SECONDS);
    showToast(result.bannerText);

    const anim = resolveOptionActionAnim(opt.id);
    soundEngine.playSolSurvivedChime();
    triggerActionSequence({
      title: opt.label,
      actionLabel: anim.actionLabel,
      resultBanner: result.bannerText,
      stationId: morningDilemma.stationHint,
      visualId: morningDilemma.id,
      animKind: anim.animKind,
      tone: opt.tone,
      blocking: true
    });
  };

  const handleChooseSurpriseOption = (opt: SurpriseOption) => {
    if (!activeEmergency) return;
    const handsOnBonus = nearestStation === activeEmergency.stationId;
    const res = opt.apply({ systems, backpack, handsOnBonus });
    setSystems(res.nextSystems);
    setBackpack(res.nextBackpack);
    if (res.extraShieldKw) {
      setPower((p) => ({
        ...p,
        shieldingKw: Math.min(SLIDER_MAX_KW, p.shieldingKw + res.extraShieldKw!)
      }));
    }
    setSolSurpriseDecisions((prev) => [...prev, res.choiceTag]);
    showToast(res.bannerText);

    const anim = resolveOptionActionAnim(opt.id);
    if (anim.animKind === 'SHORTCUT_WARN') soundEngine.playBudgetLimitBuzz();
    else soundEngine.playSolSurvivedChime();

    triggerActionSequence({
      title: opt.label,
      actionLabel: anim.actionLabel,
      resultBanner: res.bannerText,
      stationId: activeEmergency.stationId,
      visualId: activeEmergency.id,
      animKind: anim.animKind,
      tone: opt.tone,
      blocking: true
    });
    setActiveEmergency(null);
  };

  const handleStationRepair = (actionId: string) => {
    let resultMsg = '';
    let didAct = false;
    const next = { ...systems };

    if (actionId === 'SCRUB_DUST' && systems.dustCoatPct > 0) {
      next.dustCoatPct = 0;
      next.waterO2Pct = Math.max(0, systems.waterO2Pct - 6);
      resultMsg = 'Solar panels scrubbed mirror-clean! Full sunlight power restored.';
      didAct = true;
    } else if (actionId === 'THAW_BATTERY' && systems.frozenCells > 0) {
      next.frozenCells = systems.frozenCells - 1;
      next.tempGridDeltaKw = systems.tempGridDeltaKw - 10;
      resultMsg = 'Cryo-battery cell thawed (+15⚡ max grid restored)!';
      didAct = true;
    } else if (actionId === 'SEAL_LEAK' && systems.hullLeakActive) {
      next.hullLeakActive = false;
      next.tempGridDeltaKw = systems.tempGridDeltaKw - 8;
      resultMsg = 'Airlock micro-leak welded airtight!';
      didAct = true;
    } else if (actionId === 'BAKEOUT_CO2') {
      next.scrubberSaturated = false;
      next.co2Ppm = 520;
      next.cabinTempC = systems.cabinTempC + 3;
      next.tempGridDeltaKw = systems.tempGridDeltaKw - 12;
      resultMsg = 'CO2 scrubbers baked out! Crisp air restored to 520 ppm.';
      didAct = true;
    } else if (actionId === 'STERILIZE_MOLD' && systems.bioContamActive) {
      next.bioContamActive = false;
      next.cropsPct = Math.max(0, systems.cropsPct - 6);
      resultMsg = 'Bio-Dome sterilized with UV light—Space Veggies safe!';
      didAct = true;
    } else if (actionId === 'WASH_PERCHLORATE' && systems.perchlorateLock) {
      next.perchlorateLock = false;
      next.waterO2Pct = Math.max(0, systems.waterO2Pct - 8);
      next.cropsPct = Math.min(100, systems.cropsPct + 8);
      resultMsg = 'Toxic Martian perchlorates washed away (+8% Crops boost)!';
      didAct = true;
    } else if (actionId === 'REPAIR_RADIATOR') {
      next.radiatorHealthPct = 100;
      next.cabinTempC = Math.max(20, systems.cabinTempC - 8);
      next.waterO2Pct = Math.max(0, systems.waterO2Pct - 5);
      next.tempGridDeltaKw = systems.tempGridDeltaKw - 5;
      resultMsg = 'External vacuum radiators repaired—habitat cooling steadily!';
      didAct = true;
    } else if (
      actionId === 'PRINT_VALVE' &&
      systems.juryRigValveActive &&
      backpack.filamentSpool > 0
    ) {
      next.juryRigValveActive = false;
      setBackpack((bp) => ({ ...bp, filamentSpool: bp.filamentSpool - 1 }));
      resultMsg = '3D-printed precision valve installed! Supply gap hazard resolved.';
      didAct = true;
    } else if (actionId === 'OVERBOOST_SHIELD') {
      next.tempGridDeltaKw = systems.tempGridDeltaKw - 10;
      next.nextSolShieldBonusKw = systems.nextSolShieldBonusKw + 10;
      resultMsg = 'Forcefield spire overcharged (+10⚡ bonus shield today)!';
      didAct = true;
    }

    if (!didAct) return;

    setSystems(next);
    showToast(resultMsg);

    const repairMeta = resolveStationRepairAnim(actionId);
    soundEngine.playSolSurvivedChime();
    triggerActionSequence({
      title: repairMeta.title,
      actionLabel: repairMeta.actionLabel,
      resultBanner: resultMsg,
      stationId: repairMeta.stationId,
      visualId: repairMeta.visualId,
      animKind: repairMeta.animKind,
      tone: repairMeta.tone,
      blocking: false
    });
  };

  const handleSandboxTrigger = (action: 'DUST' | 'LEAK' | 'OVERHEAT' | 'CO2' | 'RESET' | 'STORM') => {
    if (action === 'STORM') {
      handleBraceForStorm();
      return;
    }
    if (action === 'RESET') {
      const fresh = createInitialSystems(world);
      setSystems({ ...fresh, dustCoatPct: 0, perchlorateLock: false });
      setBackpack(SANDBOX_BACKPACK);
      showToast('Sandbox reset! All base systems back to 100% optimal condition.');
      return;
    }
    setSystems((prev) => {
      if (action === 'DUST') {
        showToast('Practice Hazard: Regolith Dust coated solar panels! Visit Solar Yard to scrub.');
        return { ...prev, dustCoatPct: 45 };
      }
      if (action === 'LEAK') {
        showToast('Practice Hazard: Hull Micro-Leak opened! Visit Air & Water Bay to weld it shut.');
        return { ...prev, hullLeakActive: true };
      }
      if (action === 'OVERHEAT') {
        showToast('Practice Hazard: Vacuum Radiators hit! Visit Thermal & 3D Lab to cool down.');
        return { ...prev, radiatorHealthPct: 45, cabinTempC: 37 };
      }
      showToast('Practice Hazard: CO2 Scrubber saturated! Visit Air & Water Bay to bake out.');
      return { ...prev, scrubberSaturated: true, co2Ppm: 1950 };
    });
  };

  const handleUpdatePower = (key: keyof PowerAllocation, deltaKw: number) => {
    setPower((prev) => {
      const currentVal = prev[key];
      const nextVal = Math.max(0, Math.min(SLIDER_MAX_KW, currentVal + deltaKw));
      const allocatedWithout = getTotalAllocatedPower(prev) - currentVal;
      if (allocatedWithout + nextVal > maxGridBudgetKw) {
        soundEngine.playBudgetLimitBuzz();
        haptics.limit();
        return prev;
      }
      if (deltaKw > 0) soundEngine.playPowerUpTick(nextVal);
      else soundEngine.playPowerDownTick(nextVal);
      haptics.tick();
      return { ...prev, [key]: nextVal };
    });
  };

  const handleUseGadget = (item: 'megaBattery' | 'sunBlanket' | 'waterCartridge') => {
    if (backpack[item] <= 0) return;
    setBackpack((prev) => ({ ...prev, [item]: prev[item] - 1 }));

    if (item === 'megaBattery') {
      setSystems((s) => ({ ...s, tempGridDeltaKw: s.tempGridDeltaKw + 25 }));
      setSolGadgetsUsed((g) => [...g, 'Mega Battery (+25⚡)']);
      const msg = 'Mega Battery plugged in! +25⚡ grid power added for this shift!';
      showToast(msg);
      triggerActionSequence({
        title: 'Plugging In Mega Battery',
        actionLabel: 'Coupling +25⚡ auxiliary surge bank to main bus...',
        resultBanner: msg,
        stationId: 'SOLAR_GRID',
        visualId: 'grid-overload',
        animKind: 'GADGET_DEPLOY',
        tone: 'amber',
        blocking: false
      });
    } else if (item === 'sunBlanket') {
      setSystems((s) => ({ ...s, sunBlanketActive: true }));
      setSolGadgetsUsed((g) => [...g, 'Sun-Bounce Blanket']);
      const msg = 'Sun-Bounce Blanket deployed across the base dome!';
      showToast(msg);
      triggerActionSequence({
        title: 'Deploying Sun-Bounce Blanket',
        actionLabel: 'Unfurling gold reflective armor canopy over habitat dome...',
        resultBanner: msg,
        stationId: 'COMMAND_BRIDGE',
        visualId: 'precharge-shield-coils',
        animKind: 'SHIELD_CHARGE',
        tone: 'sky',
        blocking: false
      });
    } else if (item === 'waterCartridge') {
      setSystems((s) => ({
        ...s,
        waterO2Pct: Math.min(100, s.waterO2Pct + 25),
        co2Ppm: Math.max(480, s.co2Ppm - 400)
      }));
      setSolGadgetsUsed((g) => [...g, 'Water/O2 Tank']);
      const msg = 'Reserve Water/O2 Tank connected (+25% Air & Water)!';
      showToast(msg);
      triggerActionSequence({
        title: 'Connecting Reserve H2O/O2 Tank',
        actionLabel: 'Pumping fresh reserve water into O2 electrolysis cells...',
        resultBanner: msg,
        stationId: 'LIFE_SUPPORT',
        visualId: 'water-oxygen-trap',
        animKind: 'WATER_FLUSH',
        tone: 'emerald',
        blocking: false
      });
    }
    soundEngine.playPowerUpTick(50);
  };

  const speakRadioLine = useCallback(
    (text: string) => {
      radioVoiceEngine.play({
        text,
        profile: 'RADIO',
        muted,
        onStart: () => setRadioSpeaking(true),
        onEnd: () => setRadioSpeaking(false)
      });
    },
    [muted]
  );

  const handleAskEarthBuddy = async () => {
    if (!upcomingFlare || commsLoading || commsDelaySeconds > 0) return;
    soundEngine.playCommsPing();
    const target: CommsTarget = world;
    const delaySec = target === 'MOON' ? 3 : 8;
    setCommsDelaySeconds(delaySec);
    setCommsLoading(true);

    const reqElec = getRequiredElectrolysisKw(world, systems);
    const reqGrow = getRequiredGrowHeatKw(world, activeMarsSite, systems);

    const resp = await generateEarthCommsHint(upcomingFlare, power, reqElec, reqGrow, target);
    window.setTimeout(() => {
      setCommsMessage(resp);
      setCommsLoading(false);
      soundEngine.playCommsReturnChirp();
      speakRadioLine(resp.text);
    }, delaySec * 1000);
  };

  const handleNextSol = async () => {
    radioVoiceEngine.stop();
    if (isSandbox) {
      setDebriefData(null);
      setPhase('ACTIVE_SHIFT');
      return;
    }

    if (failureReason) {
      setPhase('GAME_OVER');
      return;
    }

    if (sol >= totalSols) {
      soundEngine.playVictoryChime();
      setPhase('VICTORY');
      const shieldedCount = traceLog.filter((t) => t.shieldHeld).length;
      const rank = calculateCommanderRank(
        systems.waterO2Pct,
        systems.cropsPct,
        shieldedCount,
        totalSols
      );
      const comm = await generateVictoryCommendation({
        finalWaterO2: Math.round(systems.waterO2Pct),
        finalCrops: Math.round(systems.cropsPct),
        totalSols,
        rank,
        world,
        siteName
      });
      setVictoryCommendation(comm);
      return;
    }

    setSol((s) => s + 1);
    setDebriefData(null);
    setMorningChoiceTag(undefined);
    setSolSurpriseDecisions([]);
    setSolGadgetsUsed([]);
    setPhase('MORNING_DILEMMA');
  };

  const handleSelectStationIn3D = useCallback(
    (stationId: StationId) => {
      if (activeEmergency && activeEmergency.stationId === stationId) {
        setPhase('SURPRISE_DECISION');
        return;
      }
      const st = BASE_STATIONS.find((s) => s.id === stationId);
      if (st) {
        showToast(`${st.name}: ${st.role}`);
      }
    },
    [activeEmergency, showToast]
  );

  const highCo2 = systems.co2Ppm >= 1800;
  const overheating = systems.cabinTempC >= 36;
  const freezing = systems.cabinTempC <= 12;

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#060913] select-none">
      {/* FULL-SCREEN INTERACTIVE 3D MOON / MARS OUTPOST */}
      <Outpost3DViewport
        world={world}
        phase={phase}
        systems={systems}
        power={power}
        upcomingFlareSeverity={upcomingFlare?.severityLevel}
        activeAction={activeAction}
        activeEmergencyStation={activeEmergency?.stationId ?? null}
        nearestStation={nearestStation}
        jumpNonce={jumpNonce}
        dpadRef={dpadRef}
        onNearestStationChange={(st, dist) => {
          setNearestStation(st);
          setNearestDistance(dist);
        }}
        onSelectStation={handleSelectStationIn3D}
        onFootstepJump={() => soundEngine.playSliderTick(35)}
        onActionStageChange={(stage) => setActionStage(stage)}
        onActionComplete={() => {
          setActiveAction(null);
          setPhase((p) => (p === 'ACTION_EXECUTION' ? 'ACTIVE_SHIFT' : p));
        }}
      />

      {/* POST-DECISION & REPAIR ANIMATED ACTION EXECUTION */}
      {activeAction && (
        <DecisionActionOverlay
          action={activeAction}
          stage={actionStage}
          onContinue={() => {
            setActiveAction(null);
            setPhase((p) => (p === 'ACTION_EXECUTION' ? 'ACTIVE_SHIFT' : p));
          }}
        />
      )}

      {/* CO2 Cognitive Haze / Thermal / Dust / Leak Physics VFX Overlays */}
      {highCo2 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-8 border-amber-500/45 bg-amber-900/12"
        />
      )}
      {overheating && !highCo2 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-8 border-rose-500/40 bg-rose-900/10"
        />
      )}
      {freezing && !highCo2 && !overheating && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-8 border-cyan-400/40 bg-cyan-950/12"
        />
      )}
      {phase === 'ACTIVE_SHIFT' && systems.dustCoatPct >= 25 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
        >
          {[14, 34, 58, 76].map((topPct, idx) => (
            <div
              key={idx}
              className="animate-dust-wind absolute h-1 rounded-full bg-gradient-to-r from-amber-300/0 via-amber-400/45 to-amber-500/0"
              style={{
                top: `${topPct}%`,
                left: `${5 + idx * 12}%`,
                width: '180px',
                animationDelay: `${idx * 0.4}s`
              }}
            />
          ))}
        </div>
      )}
      {phase === 'ACTIVE_SHIFT' && systems.hullLeakActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-4 border-sky-400/45 animate-pulse"
        />
      )}

      {/* LIVE STORM & SUN BURP ANIMATED CLASH CARD */}
      {phase === 'STORM_SIM' && upcomingFlare && (
        <StormImpactOverlay
          sol={sol}
          flareEvent={upcomingFlare}
          effectiveShieldKw={power.shieldingKw + systems.nextSolShieldBonusKw}
          sunBlanketActive={systems.sunBlanketActive}
        />
      )}

      {/* NON-BLOCKING FLOATING HUD LAYER */}
      {phase !== 'STORY_INTRO' && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
          <div className="space-y-2">
            <HudTopBar
              world={world}
              mode={mode}
              siteName={siteName}
              sol={sol}
              totalSols={totalSols}
              phase={phase}
              shiftSecondsLeft={shiftSecondsLeft}
              maxGridBudgetKw={maxGridBudgetKw}
              power={power}
              systems={systems}
              upcomingFlare={upcomingFlare}
              muted={muted}
              onOpenForecast={() => setShowForecastModal(true)}
              onOpenHelp={() => setShowHelpModal(true)}
              onToggleMute={() => {
                const next = !muted;
                soundEngine.muted = next;
                if (next) radioVoiceEngine.stop();
                setMuted(next);
              }}
              onRestart={() => {
                radioVoiceEngine.stop();
                setPhase('ONBOARDING');
              }}
            />

            {(bannerText || highCo2) && (
              <div className="pointer-events-auto max-w-xl mx-auto rounded-xl bg-slate-950/92 border border-sky-400/60 px-3.5 py-2 text-xs font-bold text-slate-100 shadow-lg flex items-center justify-center gap-2 text-center">
                {highCo2 && !bannerText ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      High CO2 ({systems.co2Ppm} ppm)! Walk to Air &amp; Water Bay to bake out the
                      scrubbers!
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>{bannerText}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {(phase === 'ACTIVE_SHIFT' || phase === 'STORM_SIM' || phase === 'SURPRISE_DECISION') && (
            <BottomControlDock
              world={world}
              mode={mode}
              marsSite={activeMarsSite}
              phase={phase}
              nearestStation={nearestStation}
              nearestDistance={nearestDistance}
              systems={systems}
              power={power}
              maxGridBudgetKw={maxGridBudgetKw}
              backpack={backpack}
              activeEmergency={activeEmergency}
              upcomingFlare={upcomingFlare}
              commsTarget={world}
              commsDelaySeconds={commsDelaySeconds}
              commsMessage={commsMessage}
              commsLoading={commsLoading}
              radioSpeaking={radioSpeaking}
              dpadRef={dpadRef}
              onJump={() => {
                setJumpNonce((n) => n + 1);
                soundEngine.playSliderTick(35);
              }}
              onOpenEmergencyModal={() => {
                if (activeEmergency) setPhase('SURPRISE_DECISION');
              }}
              onStationRepair={handleStationRepair}
              onUpdatePower={handleUpdatePower}
              onUseGadget={handleUseGadget}
              onAskEarthBuddy={handleAskEarthBuddy}
              onReplayRadioVoice={() => {
                if (commsMessage) speakRadioLine(commsMessage.text);
              }}
              onSandboxTrigger={handleSandboxTrigger}
              onBraceForStorm={handleBraceForStorm}
            />
          )}
        </div>
      )}

      {/* STORY INTRO CUTSCENE (NASA OFFICE -> TRANSIT -> OUTPOST ARRIVAL) */}
      {phase === 'STORY_INTRO' && (
        <StoryCutsceneOverlay
          world={world}
          beats={storyBeats}
          muted={muted}
          onComplete={handleStoryComplete}
        />
      )}

      {/* PHASE MODALS */}
      {(phase === 'ONBOARDING' || showHelpModal) && (
        <OnboardingModal
          isHelpMode={showHelpModal}
          world={world}
          mode={mode}
          selectedMarsSite={selectedMarsSite}
          onSelectWorld={(w) => setWorld(w)}
          onSelectMode={(m) => setMode(m)}
          onSelectMarsSite={(site) => setSelectedMarsSite(site)}
          onStart={(skipStory) => {
            if (showHelpModal) {
              setShowHelpModal(false);
            } else {
              handleStartMission(Boolean(skipStory));
            }
          }}
        />
      )}

      {phase === 'MORNING_DILEMMA' && (
        <DilemmaModal
          sol={sol}
          totalSols={totalSols}
          card={morningDilemma}
          currentBudgetKw={maxGridBudgetKw}
          onChoose={handleChooseMorningDilemma}
        />
      )}

      {phase === 'SURPRISE_DECISION' && activeEmergency && (
        <SurpriseEmergencyModal
          emergency={activeEmergency}
          backpack={backpack}
          handsOnBonus={nearestStation === activeEmergency.stationId}
          onChooseOption={handleChooseSurpriseOption}
          onDismissForNow={() => {
            showToast(
              `Head toward ${
                BASE_STATIONS.find((s) => s.id === activeEmergency.stationId)?.shortName ??
                'station'
              } for an On-Site Repair Discount!`
            );
            setPhase('ACTIVE_SHIFT');
          }}
        />
      )}

      {showForecastModal && (
        <DonkiModal
          currentSol={sol}
          events={flareEvents}
          radarHidden={systems.radarScrambled}
          onClose={() => setShowForecastModal(false)}
        />
      )}

      {phase === 'DEBRIEF' && debriefData && (
        <SolDebriefModal
          debrief={debriefData}
          totalSols={totalSols}
          sandboxMode={isSandbox}
          muted={muted}
          traceLog={traceLog}
          onNextSol={handleNextSol}
        />
      )}

      {(phase === 'VICTORY' || phase === 'GAME_OVER') && (
        <EndGameModal
          outcome={phase}
          world={world}
          solReached={sol}
          totalSols={totalSols}
          waterO2Pct={systems.waterO2Pct}
          cropsPct={systems.cropsPct}
          failureReason={failureReason}
          traceLog={traceLog}
          victoryCommendation={victoryCommendation}
          onPlayAgain={() => setPhase('ONBOARDING')}
        />
      )}
    </div>
  );
}
export default App;
