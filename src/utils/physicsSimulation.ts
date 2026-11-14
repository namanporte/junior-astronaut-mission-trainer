import { SPACE_PHYSICS_FACTS } from '../data/scienceData';
import {
  BaseSystemsState,
  CommanderRank,
  DifficultyMode,
  FlareSeverity,
  MarsSite,
  PowerAllocation,
  SolDebriefData,
  SolarFlareEvent,
  WorldBody
} from '../types/game';

export const DEFAULT_MAX_POWER = 100;
export const SLIDER_MAX_KW = 80;
export const SLIDER_STEP_KW = 5;
export const BASELINE_OSDR_DOSE_MSV = 0.5;

export const INITIAL_POWER: PowerAllocation = {
  electrolysisKw: 35,
  growHeatKw: 30,
  shieldingKw: 35
};

export function getGravityLabel(world: WorldBody): string {
  return world === 'MOON' ? '0.16g (Moon)' : '0.38g (Mars)';
}

export function getTotalSolsForMode(_world: WorldBody, _mode: DifficultyMode): number {
  return 7;
}

export function getTotalAllocatedPower(power: PowerAllocation): number {
  return power.electrolysisKw + power.growHeatKw + power.shieldingKw;
}

export function getShieldStrength(shieldingPower: number): number {
  return Math.min(100, shieldingPower * 2);
}

export function getFlareNickname(severity: FlareSeverity): string {
  if (severity === 'EXTREME') return 'Monster Sun Blast!';
  if (severity === 'MODERATE') return 'Medium Solar Storm';
  return 'Tiny Sun Burp';
}

export function getSunburnRisk(doseMsv: number): {
  label: string;
  shortLabel: string;
  tone: 'safe' | 'warm' | 'danger';
} {
  if (doseMsv <= 1.0) return { label: 'Safe Shade', shortLabel: 'Safe', tone: 'safe' };
  if (doseMsv <= 8.0) return { label: 'Warm Sun', shortLabel: 'Warm', tone: 'warm' };
  if (doseMsv <= 18.0) return { label: 'Spicy Storm!', shortLabel: 'Spicy!', tone: 'danger' };
  return { label: 'Mega Zap!', shortLabel: 'Mega Zap!', tone: 'danger' };
}

export function computeEffectiveGridBudget(params: {
  world: WorldBody;
  marsSite: MarsSite | null;
  systems: BaseSystemsState;
}): number {
  const base =
    params.world === 'MARS' && params.marsSite ? params.marsSite.basePowerBudget : DEFAULT_MAX_POWER;
  const dustLoss = Math.round(params.systems.dustCoatPct * 0.45);
  const frozenLoss = params.systems.frozenCells * 15;
  return Math.max(
    40,
    base +
      params.systems.permanentGridBonusKw +
      params.systems.tempGridDeltaKw -
      dustLoss -
      frozenLoss
  );
}

export function getRequiredElectrolysisKw(world: WorldBody, systems: BaseSystemsState): number {
  const base = world === 'MARS' ? 30 : 25;
  const leakExtra = systems.hullLeakActive ? 10 : 0;
  const scrubberExtra = systems.scrubberSaturated ? 10 : 0;
  return base + leakExtra + scrubberExtra;
}

export function getRequiredGrowHeatKw(
  world: WorldBody,
  marsSite: MarsSite | null,
  systems: BaseSystemsState
): number {
  const base = world === 'MARS' ? 30 : 25;
  const siteCold = world === 'MARS' && marsSite ? marsSite.lifeSupportExtraKw : 0;
  const freezeExtra = systems.frozenCells > 0 ? 5 : 0;
  return base + siteCold + freezeExtra;
}

export function clampAllocationToBudget(
  power: PowerAllocation,
  maxBudget: number
): PowerAllocation {
  const next = { ...power };
  let excess = getTotalAllocatedPower(next) - maxBudget;
  if (excess <= 0) return next;

  const keys: (keyof PowerAllocation)[] = ['shieldingKw', 'growHeatKw', 'electrolysisKw'];
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

/**
 * Steps live physical habitat equations every 1 second during an active walking shift!
 * Real physics:
 * - Vacuum radiator damage traps heat (+0.45°C/s)
 * - Unpowered electrolysis or hull micro-leaks bleed Water & O2
 * - Saturated scrubbers or low electrolysis push CO2 ppm upward
 */
export function stepShiftPhysics(params: {
  world: WorldBody;
  marsSite: MarsSite | null;
  power: PowerAllocation;
  systems: BaseSystemsState;
  sandboxMode?: boolean;
}): BaseSystemsState {
  const { world, marsSite, power, systems, sandboxMode = false } = params;
  const reqElec = getRequiredElectrolysisKw(world, systems);
  const reqGrow = getRequiredGrowHeatKw(world, marsSite, systems);

  let nextWaterO2 = systems.waterO2Pct;
  if (systems.hullLeakActive) nextWaterO2 -= 0.45;
  if (power.electrolysisKw < reqElec) nextWaterO2 -= 0.35;
  else if (power.electrolysisKw >= reqElec + 10) nextWaterO2 += 0.12;

  let nextCrops = systems.cropsPct;
  if (systems.bioContamActive) nextCrops -= 0.45;
  if (power.growHeatKw < reqGrow) nextCrops -= 0.25;
  else if (power.growHeatKw >= reqGrow + 10 && !systems.perchlorateLock) nextCrops += 0.14;

  // Vacuum thermal insulation physics: damaged radiators trap body & server heat!
  let nextTemp = systems.cabinTempC;
  const radiatorDeficit = (100 - systems.radiatorHealthPct) / 100;
  if (radiatorDeficit > 0.05) {
    nextTemp += radiatorDeficit * 0.65;
  } else if (power.growHeatKw < reqGrow - 5) {
    nextTemp -= 0.35; // freezing cold outside!
  } else {
    // Radiators gently pull cabin toward comfortable 21°C
    nextTemp += (21 - nextTemp) * 0.08;
  }

  // CO2 scrubber physics
  let nextCo2 = systems.co2Ppm;
  if (systems.scrubberSaturated) {
    nextCo2 += 38;
  } else if (power.electrolysisKw < reqElec - 5) {
    nextCo2 += 18;
  } else {
    nextCo2 += (520 - nextCo2) * 0.12;
  }

  const minStat = sandboxMode ? 18 : 0;
  const minTemp = sandboxMode ? 11 : -10;
  const maxTemp = sandboxMode ? 39 : 60;
  const maxCo2 = sandboxMode ? 2200 : 5000;

  return {
    ...systems,
    waterO2Pct: Math.max(minStat, Math.min(100, Number(nextWaterO2.toFixed(2)))),
    cropsPct: Math.max(minStat, Math.min(100, Number(nextCrops.toFixed(2)))),
    cabinTempC: Math.max(minTemp, Math.min(maxTemp, Number(nextTemp.toFixed(1)))),
    co2Ppm: Math.max(400, Math.min(maxCo2, Math.round(nextCo2)))
  };
}

export function resolveEndOfSolStorm(params: {
  sol: number;
  world: WorldBody;
  marsSite: MarsSite | null;
  startWaterO2: number;
  startCrops: number;
  power: PowerAllocation;
  systems: BaseSystemsState;
  flareEvent: SolarFlareEvent;
  capcomMessage: string;
  capcomAiPowered: boolean;
}): {
  debrief: SolDebriefData;
  endSystems: BaseSystemsState;
  juryRigBurst: boolean;
} {
  const {
    sol,
    world,
    marsSite,
    startWaterO2,
    startCrops,
    power,
    systems,
    flareEvent,
    capcomMessage,
    capcomAiPowered
  } = params;

  const reqElec = getRequiredElectrolysisKw(world, systems);
  const reqGrow = getRequiredGrowHeatKw(world, marsSite, systems);

  const effectiveShield = power.shieldingKw + systems.nextSolShieldBonusKw;
  const heldByPower = effectiveShield >= flareEvent.requiredShieldKw;
  const sunBlanketSaved = !heldByPower && systems.sunBlanketActive;
  const shieldHeld = heldByPower || sunBlanketSaved;
  const radiationDamage = shieldHeld ? 0 : -flareEvent.radiationDamage;

  let endWaterO2 = systems.waterO2Pct;
  let endCrops = systems.cropsPct;
  let endTempC = systems.cabinTempC;
  let endCo2Ppm = systems.co2Ppm;

  if (power.electrolysisKw >= reqElec + 10) endWaterO2 += 6;
  else if (power.electrolysisKw < reqElec) endWaterO2 -= 8;

  if (power.growHeatKw >= reqGrow + 10 && !systems.perchlorateLock && !systems.bioContamActive) {
    endCrops += 6;
  } else if (power.growHeatKw < reqGrow) {
    endCrops -= 8;
  }

  // Jury-rigged bypass valve risk check (Supply Chain Gap consequence!)
  let juryRigBurst = false;
  if (systems.juryRigValveActive && Math.random() < 0.4) {
    juryRigBurst = true;
    endWaterO2 -= 10;
    endTempC += 6;
  }

  // Overheat & CO2 crew impact
  if (endTempC >= 38) {
    endWaterO2 -= 8;
    endCrops -= 8;
  }
  if (endCo2Ppm >= 2200) {
    endWaterO2 -= 6;
  }

  // Radiation hits both Water/O2 crew health and Crops!
  endWaterO2 += radiationDamage;
  endCrops += Math.round(radiationDamage * 0.65);

  endWaterO2 = Math.max(0, Math.min(100, Math.round(endWaterO2)));
  endCrops = Math.max(0, Math.min(100, Math.round(endCrops)));
  endTempC = Number(Math.max(-5, Math.min(58, endTempC)).toFixed(1));
  endCo2Ppm = Math.max(400, Math.min(5000, Math.round(endCo2Ppm)));

  const spacePhysicsLesson = SPACE_PHYSICS_FACTS[(sol - 1) % SPACE_PHYSICS_FACTS.length];

  const endSystems: BaseSystemsState = {
    ...systems,
    waterO2Pct: endWaterO2,
    cropsPct: endCrops,
    cabinTempC: endTempC,
    co2Ppm: endCo2Ppm,
    tempGridDeltaKw: 0,
    nextSolShieldBonusKw: 0,
    sunBlanketActive: false,
    radarScrambled: false
  };

  return {
    debrief: {
      sol,
      world,
      startWaterO2,
      endWaterO2,
      startCrops,
      endCrops,
      endTempC,
      endCo2Ppm,
      shieldPowerUsed: power.shieldingKw,
      effectiveShieldPower: effectiveShield,
      flareEvent,
      shieldHeld,
      sunBlanketSaved,
      radiationDamage,
      spacePhysicsLesson,
      capcomMessage,
      capcomAiPowered
    },
    endSystems,
    juryRigBurst
  };
}

export function calculateCommanderRank(
  waterO2: number,
  crops: number,
  shieldedCount: number,
  totalSols: number
): CommanderRank {
  const avg = (waterO2 + crops) / 2;
  const ratio = shieldedCount / Math.max(1, totalSols);
  if (avg >= 70 && ratio >= 0.8) return 'GOLD';
  if (avg >= 45 && ratio >= 0.5) return 'SILVER';
  return 'BRONZE';
}
