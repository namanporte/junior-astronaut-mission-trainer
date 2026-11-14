export type GamePhase =
  | 'ONBOARDING'
  | 'PLANNING'
  | 'SIMULATING'
  | 'CRISIS_PAUSE'
  | 'DEBRIEF'
  | 'VICTORY'
  | 'GAME_OVER';

export type DifficultyMode = 'CADET' | 'COMMANDER';

export type CommsTarget = 'MOON' | 'MARS';

export type FlareSeverity = 'MILD' | 'MODERATE' | 'EXTREME';

export type DonkiDataSource = 'LIVE_NASA_API' | 'NASA_ARCHIVE_FALLBACK';

export interface MarsSite {
  id: 'JEZERO' | 'OLYMPUS' | 'HELLAS';
  name: string;
  elevationLabel: string;
  dustCondition: string;
  basePowerBudget: number;
  lifeSupportExtraKw: number;
  description: string;
}

export interface SolarFlareEvent {
  flrID: string;
  beginTime: string;
  peakTime: string;
  classType: string;
  sourceLocation: string;
  severityLevel: FlareSeverity;
  requiredShieldKw: number;
  radiationDamage: number;
  unshieldedDoseMsv: number;
  kidSummary: string;
}

export interface DonkiFetchResult {
  events: SolarFlareEvent[];
  dataSource: DonkiDataSource;
}

export interface PowerAllocation {
  lifeSupport: number;
  shielding: number;
}

export interface MissionTraceEntry {
  sol: number;
  flrID: string;
  classType: string;
  sourceLocation: string;
  osdrDoseMsv: number;
  lifeSupportKw: number;
  shieldingKw: number;
  lifeSupportAfter: number;
  shieldHeld: boolean;
  triggeredCropPenaltyNextSol: boolean;
}

export interface SolDebriefData {
  sol: number;
  startLifeSupport: number;
  endLifeSupport: number;
  lifeSupportDelta: number;
  shieldStrength: number;
  shieldPowerUsed: number;
  lifeSupportPowerUsed: number;
  requiredLifeSupportKw: number;
  osdrDoseMsv: number;
  unshieldedDoseMsv: number;
  flareEvent: SolarFlareEvent;
  shieldHeld: boolean;
  radiationPenalty: number;
  cropPenaltyTriggeredNextSol: boolean;
  recoveredFromCropPenalty: boolean;
  csaFoodFact: string;
  capcomMessage: string;
  capcomAiPowered: boolean;
  whyItMattersNote: string;
}

export type CommanderRank = 'GOLD' | 'SILVER' | 'BRONZE';
