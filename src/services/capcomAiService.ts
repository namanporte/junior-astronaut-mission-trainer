import {
  CommanderRank,
  CommsTarget,
  DifficultyMode,
  FlareSeverity,
  PowerAllocation,
  SolarFlareEvent,
  WorldBody
} from '../types/game';
import { getFlareNickname } from '../utils/physicsSimulation';

export interface CapcomDebriefInput {
  sol: number;
  world: WorldBody;
  mode: DifficultyMode;
  electrolysisKw: number;
  growHeatKw: number;
  shieldingKw: number;
  severityLevel: FlareSeverity;
  requiredShieldKw: number;
  waterO2Pct: number;
  cropsPct: number;
  cabinTempC: number;
  co2Ppm: number;
  sunBlanketSaved?: boolean;
}

export interface CapcomResponse {
  text: string;
  isAiGenerated: boolean;
}

const CAPCOM_TIMEOUT_MS = 4500;

async function postCapcomEndpoint(
  url: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), CAPCOM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text === 'string' && data.text.trim().length > 0) {
      return data.text.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildFallbackDebrief(input: CapcomDebriefInput): string {
  const flareName = getFlareNickname(input.severityLevel);
  const shieldHeld = input.shieldingKw >= input.requiredShieldKw || input.sunBlanketSaved;

  if (input.sunBlanketSaved) {
    return `Smart emergency move on ${input.world}! Your Sun-Bounce Blanket deflected the ${flareName} while keeping Air/Water (${input.waterO2Pct}%) steady!`;
  }
  if (!shieldHeld) {
    return `Storm impact on Sol ${input.sol}! Forcefield needed ${input.requiredShieldKw}⚡ against the ${flareName}—check your radiators & Shield next shift!`;
  }
  if (input.cabinTempC >= 36) {
    return `Storm blocked! Careful though—cabin hit ${input.cabinTempC}°C inside the vacuum walls. Walk to the Thermal Lab next shift!`;
  }
  if (input.co2Ppm >= 1800) {
    return `Forcefield held! Watch out for ${input.co2Ppm} ppm CO2 though—visit Air & Water Bay to bake out those scrubbers!`;
  }
  return `Solid shift on ${input.world} Sol ${input.sol}! Your ${input.shieldingKw}⚡ Forcefield blocked the ${flareName} with ${input.waterO2Pct}% Water/O2!`;
}

function buildFallbackHint(
  upcomingFlare: SolarFlareEvent,
  currentSliders: PowerAllocation,
  reqElecKw: number,
  reqGrowKw: number
): string {
  const flareName = getFlareNickname(upcomingFlare.severityLevel);
  if (currentSliders.shieldingKw < upcomingFlare.requiredShieldKw) {
    return `Earth Buddy: Boost Forcefield to ${upcomingFlare.requiredShieldKw}⚡ before today’s ${flareName} arrives!`;
  }
  if (currentSliders.electrolysisKw < reqElecKw) {
    return `Earth Buddy: Give Air & Water Electrolysis at least ${reqElecKw}⚡ or O2 & CO2 will suffer!`;
  }
  if (currentSliders.growHeatKw < reqGrowKw) {
    return `Earth Buddy: Grow Lights & Heaters need ${reqGrowKw}⚡ to keep crops alive and batteries warm!`;
  }
  return `Earth Buddy: All systems balanced for today’s ${flareName}—keep patrolling for surprises!`;
}

function buildFallbackVictoryCommendation(params: {
  finalWaterO2: number;
  finalCrops: number;
  totalSols: number;
  world: WorldBody;
}): string {
  return `Mission Accomplished on ${params.world}! You walked the base, beat real space hazards across ${params.totalSols} Sols, and finished with ${params.finalWaterO2}% Water/O2 and ${params.finalCrops}% Crops!`;
}

export async function generateSolDebriefFeedback(
  gameState: CapcomDebriefInput
): Promise<CapcomResponse> {
  const aiText = await postCapcomEndpoint('/api/capcom/debrief', {
    ...gameState,
    stormName: getFlareNickname(gameState.severityLevel)
  });

  if (aiText) {
    return { text: aiText, isAiGenerated: true };
  }
  return {
    text: buildFallbackDebrief(gameState),
    isAiGenerated: false
  };
}

export async function generateEarthCommsHint(
  upcomingFlare: SolarFlareEvent,
  currentSliders: PowerAllocation,
  reqElecKw: number,
  reqGrowKw: number,
  commsTarget: CommsTarget
): Promise<CapcomResponse> {
  const aiText = await postCapcomEndpoint('/api/capcom/hint', {
    upcomingFlare: {
      stormName: getFlareNickname(upcomingFlare.severityLevel),
      requiredShieldKw: upcomingFlare.requiredShieldKw
    },
    currentSliders,
    requiredLifeSupportKw: reqElecKw,
    requiredGrowHeatKw: reqGrowKw,
    commsTarget
  });

  if (aiText) {
    return { text: aiText, isAiGenerated: true };
  }
  return {
    text: buildFallbackHint(upcomingFlare, currentSliders, reqElecKw, reqGrowKw),
    isAiGenerated: false
  };
}

export async function generateVictoryCommendation(params: {
  finalWaterO2: number;
  finalCrops: number;
  totalSols: number;
  rank: CommanderRank;
  world: WorldBody;
  siteName: string;
}): Promise<CapcomResponse> {
  const aiText = await postCapcomEndpoint('/api/capcom/victory', params);

  if (aiText) {
    return { text: aiText, isAiGenerated: true };
  }
  return {
    text: buildFallbackVictoryCommendation(params),
    isAiGenerated: false
  };
}
