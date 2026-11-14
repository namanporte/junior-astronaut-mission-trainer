export type GamePhase =
  | 'ONBOARDING'
  | 'STORY_INTRO'
  | 'MORNING_DILEMMA'
  | 'ACTIVE_SHIFT'
  | 'SURPRISE_DECISION'
  | 'STORM_SIM'
  | 'DEBRIEF'
  | 'VICTORY'
  | 'GAME_OVER';

export type WorldBody = 'MOON' | 'MARS';
export type DifficultyMode = 'CADET' | 'COMMANDER' | 'SANDBOX';
export type CommsTarget = 'MOON' | 'MARS';
export type FlareSeverity = 'MILD' | 'MODERATE' | 'EXTREME';
export type DonkiDataSource = 'LIVE_NASA_API' | 'NASA_ARCHIVE_FALLBACK';

export type StorySceneKind = 'NASA_OFFICE' | 'TRANSIT' | 'OUTPOST_ARRIVAL';
export type VoiceProfile = 'DIRECTOR' | 'ENGINEER' | 'RADIO';

export interface StoryBeat {
  id: string;
  scene: StorySceneKind;
  locationLabel: string;
  speakerName: string;
  speakerRole: string;
  voiceProfile: VoiceProfile;
  line: string;
  sceneHint: string;
}

export type StationId =
  | 'SOLAR_GRID'
  | 'LIFE_SUPPORT'
  | 'HYDROPONICS'
  | 'THERMAL_WORKSHOP'
  | 'COMMAND_BRIDGE';

export interface StationMeta {
  id: StationId;
  name: string;
  shortName: string;
  role: string;
  position: [number, number, number];
  accentHex: string;
}

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
  electrolysisKw: number; // Powers water purifier + O2 electrolysis + CO2 scrubbers
  growHeatKw: number; // Powers hydroponic grow lights + battery cryo-heaters
  shieldingKw: number; // Powers magnetic/plasma storm Forcefield
}

export interface BackpackInventory {
  megaBattery: number;
  sunBlanket: number;
  waterCartridge: number;
  filamentSpool: number;
}

export interface BaseSystemsState {
  waterO2Pct: number; // 0-100: Drinking water & breathable O2 share electrolysis link
  cropsPct: number; // 0-100: Food & hydroponics health
  cabinTempC: number; // Ideal 18..25°C. >38°C cooks habitat; <5°C freezes pipes
  co2Ppm: number; // Ideal 400..900 ppm. >2000 causes cognitive fog; >4500 fatal
  dustCoatPct: number; // 0-80: Regolith dust reducing solar power generation
  radiatorHealthPct: number; // 20-100: Damaged radiators trap heat in vacuum
  frozenCells: number; // Count of cryo-damaged battery cells (-15⚡ each until thawed)
  hullLeakActive: boolean; // Micro-leak bleeding O2/Water every second & Sol
  scrubberSaturated: boolean; // CO2 scrubber bake-out failed -> CO2 climbs fast
  bioContamActive: boolean; // Invasive fungus wiping crops unless treated
  perchlorateLock: boolean; // Toxic Martian soil salts blocking bonus crop growth
  juryRigValveActive: boolean; // Supply chain gap: temporary valve may snap each Sol
  permanentGridBonusKw: number;
  tempGridDeltaKw: number;
  nextSolShieldBonusKw: number;
  sunBlanketActive: boolean;
  radarScrambled: boolean;
}

export interface SurpriseOption {
  id: string;
  label: string;
  costSummary: string;
  outcomeSummary: string;
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
  requiresItem?: keyof BackpackInventory;
  apply: (ctx: {
    systems: BaseSystemsState;
    backpack: BackpackInventory;
    handsOnBonus: boolean;
  }) => {
    nextSystems: BaseSystemsState;
    nextBackpack: BackpackInventory;
    bannerText: string;
    choiceTag: string;
    extraShieldKw?: number;
  };
}

export interface SurpriseEmergency {
  id: string;
  category: 'POWER' | 'AIR_WATER' | 'AGRICULTURE' | 'THERMAL';
  title: string;
  stationId: StationId;
  physicsFact: string;
  description: string;
  severity: 'URGENT' | 'CRITICAL';
  options: SurpriseOption[];
}

export interface DilemmaEffectResult {
  nextSystems: BaseSystemsState;
  nextBackpack: BackpackInventory;
  bannerText: string;
  choiceTag: string;
}

export interface DilemmaOption {
  id: string;
  label: string;
  nowCostLabel: string;
  laterEffectLabel: string;
  tone: 'emerald' | 'amber' | 'sky' | 'rose';
  apply: (ctx: {
    systems: BaseSystemsState;
    backpack: BackpackInventory;
    world: WorldBody;
  }) => DilemmaEffectResult;
}

export interface DilemmaCard {
  id: string;
  title: string;
  badge: string;
  story: string;
  stationHint: StationId;
  options: [DilemmaOption, DilemmaOption];
}

export interface MissionTraceEntry {
  sol: number;
  world: WorldBody;
  severityLevel: FlareSeverity;
  requiredShieldKw: number;
  effectiveShieldKw: number;
  shieldHeld: boolean;
  waterO2After: number;
  cropsAfter: number;
  cabinTempAfter: number;
  co2PpmAfter: number;
  morningChoice?: string;
  surpriseDecisions: string[];
  gadgetsUsed: string[];
  summaryNote: string;
}

export interface SolDebriefData {
  sol: number;
  world: WorldBody;
  startWaterO2: number;
  endWaterO2: number;
  startCrops: number;
  endCrops: number;
  endTempC: number;
  endCo2Ppm: number;
  shieldPowerUsed: number;
  effectiveShieldPower: number;
  flareEvent: SolarFlareEvent;
  shieldHeld: boolean;
  sunBlanketSaved: boolean;
  radiationDamage: number;
  spacePhysicsLesson: string;
  capcomMessage: string;
  capcomAiPowered: boolean;
}

export type CommanderRank = 'GOLD' | 'SILVER' | 'BRONZE';
