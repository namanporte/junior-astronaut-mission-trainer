import { CSA_LUNAR_FOOD_FACTS } from '../data/scienceData';
import {
  CommanderRank,
  DifficultyMode,
  MarsSite,
  PowerAllocation,
  SolDebriefData,
  SolarFlareEvent
} from '../types/game';

export const DEFAULT_MAX_POWER = 100;
export const SLIDER_MAX_KW = 80;
export const SLIDER_STEP_KW = 5;
export const BASELINE_OSDR_DOSE_MSV = 0.5;

export const INITIAL_POWER: PowerAllocation = {
  lifeSupport: 45,
  shielding: 35
};

export function getTotalSolsForMode(mode: DifficultyMode): number {
  return mode === 'CADET' ? 5 : 7;
}

export function getCrisisSecondsForMode(mode: DifficultyMode): number {
  return mode === 'CADET' ? 12 : 8;
}

export function getTotalAllocatedPower(power: PowerAllocation): number {
  return power.lifeSupport + power.shielding;
}

export function getShieldStrength(shieldingPower: number): number {
  return Math.min(100, shieldingPower * 2);
}

/**
 * Calculates required Life Support kW (O2, Heat, & Hydroponics) including
 * Mars site elevation penalty and compounding -15% crop yield recovery cost.
 */
export function getRequiredLifeSupportKw(params: {
  mode: DifficultyMode;
  marsSite: MarsSite | null;
  cropPenaltyActive: boolean;
}): number {
  const baseNeed = params.mode === 'CADET' ? 35 : 40;
  const siteExtra = params.mode === 'COMMANDER' && params.marsSite ? params.marsSite.lifeSupportExtraKw : 0;
  const cropRecoveryExtra = params.cropPenaltyActive ? 10 : 0;
  return baseNeed + siteExtra + cropRecoveryExtra;
}

export function getLifeSupportDelta(params: {
  lifeSupportKw: number;
  requiredLifeSupportKw: number;
  cropPenaltyActive: boolean;
}): number {
  const { lifeSupportKw, requiredLifeSupportKw, cropPenaltyActive } = params;
  const basePenalty = cropPenaltyActive ? -15 : 0;

  if (lifeSupportKw < requiredLifeSupportKw) {
    const deficitPenalty = -Math.max(5, Math.round((requiredLifeSupportKw - lifeSupportKw) * 0.8));
    return Math.max(-40, basePenalty + deficitPenalty);
  }
  if (lifeSupportKw >= requiredLifeSupportKw + 15) {
    // High Life Support recovers crop yield AND heals +5% (net +5% even if crop penalty was active)
    return 5;
  }
  // Meeting requiredLifeSupportKw stabilizes base & clears crop penalty cleanly
  return 0;
}

/**
 * Calculates NASA OSDR / RadLab absorbed radiation dose rate (mSv/day)
 * based on incoming flare strength and active magnetic shielding kW.
 */
export function getOsdrDoseRateMsv(
  shieldingKw: number,
  flareEvent: SolarFlareEvent | null
): number {
  if (!flareEvent) return BASELINE_OSDR_DOSE_MSV;
  const ratio = Math.min(1, shieldingKw / flareEvent.requiredShieldKw);
  const raw =
    flareEvent.unshieldedDoseMsv -
    ratio * (flareEvent.unshieldedDoseMsv - BASELINE_OSDR_DOSE_MSV);
  return Math.round(raw * 10) / 10;
}

export function clampAllocationToBudget(
  power: PowerAllocation,
  maxBudget: number
): PowerAllocation {
  const next = { ...power };
  let excess = getTotalAllocatedPower(next) - maxBudget;
  if (excess <= 0) return next;

  const keys: (keyof PowerAllocation)[] = ['shielding', 'lifeSupport'];
  while (excess > 0) {
    let changed = false;
    for (const key of keys) {
      if (excess <= 0) break;
      if (next[key] >= SLIDER_STEP_KW) {
        next[key] -= SLIDER_STEP_KW;
        excess -= SLIDER_STEP_KW;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
}

export function resolveSolOutcome(params: {
  sol: number;
  startLifeSupport: number;
  power: PowerAllocation;
  flareEvent: SolarFlareEvent;
  mode: DifficultyMode;
  marsSite: MarsSite | null;
  cropPenaltyActive: boolean;
  capcomMessage: string;
  capcomAiPowered: boolean;
}): SolDebriefData {
  const {
    sol,
    startLifeSupport,
    power,
    flareEvent,
    mode,
    marsSite,
    cropPenaltyActive,
    capcomMessage,
    capcomAiPowered
  } = params;

  const requiredLifeSupportKw = getRequiredLifeSupportKw({
    mode,
    marsSite,
    cropPenaltyActive
  });

  const lifeSupportBaseDelta = getLifeSupportDelta({
    lifeSupportKw: power.lifeSupport,
    requiredLifeSupportKw,
    cropPenaltyActive
  });

  const shieldHeld = power.shielding >= flareEvent.requiredShieldKw;
  const radiationPenalty = shieldHeld ? 0 : -flareEvent.radiationDamage;
  const shieldStrength = getShieldStrength(power.shielding);
  const osdrDoseMsv = getOsdrDoseRateMsv(power.shielding, flareEvent);

  const rawEnd = startLifeSupport + lifeSupportBaseDelta + radiationPenalty;
  const endLifeSupport = Math.max(0, Math.min(100, rawEnd));
  const lifeSupportDelta = endLifeSupport - startLifeSupport;

  // Compounding tradeoff: diverting power away from Life Support today triggers -15% crop yield tomorrow
  const baselineThreshold = getRequiredLifeSupportKw({
    mode,
    marsSite,
    cropPenaltyActive: false
  });
  const cropPenaltyTriggeredNextSol = power.lifeSupport < baselineThreshold;
  const recoveredFromCropPenalty = cropPenaltyActive && power.lifeSupport >= requiredLifeSupportKw;

  const csaFoodFact = CSA_LUNAR_FOOD_FACTS[(sol - 1) % CSA_LUNAR_FOOD_FACTS.length];

  const whyItMattersNote = shieldHeld
    ? `Because space outposts lack Earth's thick atmosphere and magnetic field, your ${power.shielding} kW shield kept the NASA OSDR dose down to ${osdrDoseMsv} mSv/day during this ${flareEvent.classType} flare!`
    : `Without ${flareEvent.requiredShieldKw} kW of shielding against this ${flareEvent.classType} flare, radiation spiked to ${osdrDoseMsv} mSv/day (compared to ${BASELINE_OSDR_DOSE_MSV} mSv/day safe baseline)!`;

  return {
    sol,
    startLifeSupport,
    endLifeSupport,
    lifeSupportDelta,
    shieldStrength,
    shieldPowerUsed: power.shielding,
    lifeSupportPowerUsed: power.lifeSupport,
    requiredLifeSupportKw,
    osdrDoseMsv,
    unshieldedDoseMsv: flareEvent.unshieldedDoseMsv,
    flareEvent,
    shieldHeld,
    radiationPenalty,
    cropPenaltyTriggeredNextSol,
    recoveredFromCropPenalty,
    csaFoodFact,
    capcomMessage,
    capcomAiPowered,
    whyItMattersNote
  };
}

export function calculateCommanderRank(lifeSupport: number, shieldedCount: number, totalSols: number): CommanderRank {
  const ratio = shieldedCount / Math.max(1, totalSols);
  if (lifeSupport >= 75 && ratio >= 0.8) return 'GOLD';
  if (lifeSupport >= 50 && ratio >= 0.5) return 'SILVER';
  return 'BRONZE';
}
