import {
  CommanderRank,
  CommsTarget,
  DifficultyMode,
  PowerAllocation,
  SolarFlareEvent
} from '../types/game';

export interface CapcomDebriefInput {
  sol: number;
  mode: DifficultyMode;
  lifeSupportKw: number;
  shieldingKw: number;
  classType: string;
  sourceLocation: string;
  requiredShieldKw: number;
  osdrDoseMsv: number;
  lifeSupportChange: number;
  lifeSupportLevel: number;
  cropPenaltyTriggered: boolean;
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
  const shieldHeld = input.shieldingKw >= input.requiredShieldKw;

  if (!shieldHeld) {
    return `Heads up, Commander! Radiation Shielding (${input.shieldingKw} kW) needed ${input.requiredShieldKw} kW to block the ${input.classType} flare, so boost Shields next storm.`;
  }
  if (input.cropPenaltyTriggered) {
    return `Your ${input.shieldingKw} kW shields stopped the ${input.classType} flare! Because Life Support dipped low, give Hydroponics extra power tomorrow to recover crop yields.`;
  }
  return `Great balancing on Sol ${input.sol}! Your ${input.shieldingKw} kW Radiation Shielding blocked the ${input.classType} flare while Life Support kept air, heat, and crops thriving.`;
}

function buildFallbackHint(
  upcomingFlare: SolarFlareEvent,
  currentSliders: PowerAllocation,
  requiredLifeSupportKw: number
): string {
  if (currentSliders.shielding < upcomingFlare.requiredShieldKw) {
    return `Houston here! Slide Radiation Shielding up to ${upcomingFlare.requiredShieldKw} kW before the ${upcomingFlare.classType} flare hits!`;
  }
  if (currentSliders.lifeSupport < requiredLifeSupportKw) {
    return `Mission Control tip: Raise Life Support to ${requiredLifeSupportKw} kW so your hydroponic crops and crew stay strong!`;
  }
  return `Houston confirms your shields and Life Support look strong for the ${upcomingFlare.classType} flare — great work!`;
}

function buildFallbackVictoryCommendation(params: {
  finalLifeSupport: number;
  totalSols: number;
  avgShielding: number;
  avgLifeSupport: number;
}): string {
  const { finalLifeSupport, totalSols, avgShielding, avgLifeSupport } = params;
  if (avgShielding >= avgLifeSupport && finalLifeSupport >= 75) {
    return `Outstanding safety-first command across all ${totalSols} Sols! You shielded the outpost from real NASA solar flares and finished at ${finalLifeSupport}% Life Support.`;
  }
  return `Congratulations on surviving all ${totalSols} Sols! Your smart tradeoffs between Life Support and Radiation Shielding kept the outpost thriving.`;
}

export async function generateSolDebriefFeedback(
  gameState: CapcomDebriefInput
): Promise<CapcomResponse> {
  const aiText = await postCapcomEndpoint('/api/capcom/debrief', {
    ...gameState
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
  requiredLifeSupportKw: number,
  commsTarget: CommsTarget
): Promise<CapcomResponse> {
  const aiText = await postCapcomEndpoint('/api/capcom/hint', {
    upcomingFlare: {
      classType: upcomingFlare.classType,
      sourceLocation: upcomingFlare.sourceLocation,
      requiredShieldKw: upcomingFlare.requiredShieldKw
    },
    currentSliders: {
      lifeSupportKw: currentSliders.lifeSupport,
      shieldingKw: currentSliders.shielding
    },
    requiredLifeSupportKw,
    commsTarget
  });

  if (aiText) {
    return { text: aiText, isAiGenerated: true };
  }
  return {
    text: buildFallbackHint(upcomingFlare, currentSliders, requiredLifeSupportKw),
    isAiGenerated: false
  };
}

export async function generateVictoryCommendation(params: {
  finalLifeSupport: number;
  totalSols: number;
  rank: CommanderRank;
  avgLifeSupport: number;
  avgShielding: number;
  mode: DifficultyMode;
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
