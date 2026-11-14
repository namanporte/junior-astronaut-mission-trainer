import {
  BackpackInventory,
  BaseSystemsState,
  DilemmaCard,
  SurpriseEmergency,
  WorldBody
} from '../types/game';

export function createInitialSystems(world: WorldBody): BaseSystemsState {
  return {
    waterO2Pct: 84,
    cropsPct: 82,
    cabinTempC: 21,
    co2Ppm: 520,
    dustCoatPct: world === 'MARS' ? 12 : 6,
    radiatorHealthPct: 100,
    frozenCells: 0,
    hullLeakActive: false,
    scrubberSaturated: false,
    bioContamActive: false,
    perchlorateLock: world === 'MARS',
    juryRigValveActive: false,
    permanentGridBonusKw: 0,
    tempGridDeltaKw: 0,
    nextSolShieldBonusKw: 0,
    sunBlanketActive: false,
    radarScrambled: false
  };
}

export const INITIAL_BACKPACK: BackpackInventory = {
  megaBattery: 1,
  sunBlanket: 1,
  waterCartridge: 1,
  filamentSpool: 2
};

/**
 * All 11 practical space-physics surprise emergencies that erupt on real
 * stations around the 3D outpost while the player walks & manages the base.
 */
export const SURPRISE_EMERGENCIES: SurpriseEmergency[] = [
  {
    id: 'dust-contamination',
    category: 'POWER',
    title: 'Razor Regolith Dust Storm!',
    stationId: 'SOLAR_GRID',
    physicsFact:
      'Moon & Mars dust has never been smoothed by rain—it acts like microscopic sandpaper on seals and blocks sunlight on solar wings!',
    description:
      'Sharp dust just coated Solar Wing #2 (+35% Dust) and is grinding into the tilt-motor joints!',
    severity: 'URGENT',
    options: [
      {
        id: 'air-scrub-joints',
        label: 'Walk & Blast Joints + Wipe Panels',
        costSummary: '-8% Air/Water · -10⚡ Grid',
        outcomeSummary: 'Clears ALL dust & saves motors permanently!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            dustCoatPct: 0,
            waterO2Pct: Math.max(0, systems.waterO2Pct - (handsOnBonus ? 4 : 8)),
            tempGridDeltaKw: systems.tempGridDeltaKw - (handsOnBonus ? 5 : 10)
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'Hands-On Hero! You scrubbed the joints at the Solar Yard—0% dust and saved half water/power!'
            : 'Compressed air blasted the razor dust clean! Solar output restored to 100%.',
          choiceTag: 'Blasted Regolith Clean'
        })
      },
      {
        id: 'dry-wipers',
        label: 'Run Dry Wipers Only',
        costSummary: 'Free Now',
        outcomeSummary: 'Dust stays at +25% (-12⚡ output) & joints grind tomorrow',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            dustCoatPct: Math.min(70, systems.dustCoatPct + 25)
          },
          nextBackpack: backpack,
          bannerText:
            'Dry wipers smeared sharp grit into the bearings—solar output stays lowered until washed!',
          choiceTag: 'Dry Wipers (Dust Remains)'
        })
      }
    ]
  },
  {
    id: 'battery-freezing',
    category: 'POWER',
    title: 'Cryo Freeze Alert (-130°C)!',
    stationId: 'SOLAR_GRID',
    physicsFact:
      'Outside shadows drop down to -130°C! Lithium batteries freeze solid and lose capacity unless thermal heaters run.',
    description:
      'Shadow temp plunged to -130°C! Cryo-battery Bank B is frosting over fast—freeze ruins cells!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'pulse-cryo-heaters',
        label: 'Run Full Cryo-Heaters',
        costSummary: '-15⚡ Today',
        outcomeSummary: 'Zero frozen cells · Keeps full max battery!',
        tone: 'sky',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - (handsOnBonus ? 10 : 15),
            cabinTempC: Math.max(12, systems.cabinTempC - 1)
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'You wrapped thermal blankets at the Cryo-Bank—batteries warm for only -10⚡!'
            : 'Cryo-heaters fired up! Battery chemistry saved from freezing.',
          choiceTag: 'Heated Cryo-Bank (-130°C)'
        })
      },
      {
        id: 'coast-unheated',
        label: 'Save Grid & Let Cells Chill',
        costSummary: '0⚡ Today',
        outcomeSummary: 'Freezes 1 Battery Cell (-15⚡ Max Power until thawed)',
        tone: 'rose',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            frozenCells: systems.frozenCells + 1
          },
          nextBackpack: backpack,
          bannerText:
            'Ouch! 1 battery bank froze at -130°C (-15⚡ Max Power). Visit Solar Yard to thaw it!',
          choiceTag: 'Froze 1 Battery Cell (-15⚡)'
        })
      }
    ]
  },
  {
    id: 'grid-overload',
    category: 'POWER',
    title: 'Heavy Machinery Grid Spike!',
    stationId: 'SOLAR_GRID',
    physicsFact:
      'When heavy water pumps and 3D heaters kick on together, massive startup amperage spikes can trip the whole micro-grid dark!',
    description:
      'Main breakers are arcing! A massive current surge threatens a total habitat blackout!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'shunt-to-shield',
        label: 'Shunt Surge Into Forcefield!',
        costSummary: '+15⚡ Shield Surge · +6°C Heat',
        outcomeSummary: 'Avoids blackout & boosts Shield, heats cabin!',
        tone: 'sky',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            cabinTempC: systems.cabinTempC + (handsOnBonus ? 4 : 6)
          },
          nextBackpack: backpack,
          bannerText:
            'Smart engineering! Surge dumped into Forcefield capacitors (+15⚡ Shield today, +Heat)!',
          choiceTag: 'Shunted Surge (+15⚡ Shield)',
          extraShieldKw: 15
        })
      },
      {
        id: 'trip-grow-lights',
        label: 'Cut Grow Lights Breaker',
        costSummary: '-12% Crops Today',
        outcomeSummary: 'Protects grid & keeps cabin cool',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            cropsPct: Math.max(0, systems.cropsPct - 12)
          },
          nextBackpack: backpack,
          bannerText: 'Grow lights tripped offline safely—grid stabilized, crops lost 12% growth.',
          choiceTag: 'Cut Grow Lights (-12% Crops)'
        })
      }
    ]
  },
  {
    id: 'water-oxygen-trap',
    category: 'AIR_WATER',
    title: 'The Water-Oxygen Trap!',
    stationId: 'LIFE_SUPPORT',
    physicsFact:
      'Space bases make breathable O2 by splitting recycled water via electrolysis—losing your purifier cuts drinking water AND air simultaneously!',
    description:
      'Main water purifier clogged! O2 electrolysis tanks are starving right alongside drinking taps!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'backflush-purifier',
        label: 'High-Pressure Purifier Backflush',
        costSummary: '-15⚡ Power',
        outcomeSummary: 'Restores +10% Water/O2 & saves crops!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - (handsOnBonus ? 10 : 15),
            waterO2Pct: Math.min(100, systems.waterO2Pct + 10)
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'Hands-On Backflush! Purifier cleared cleanly for -10⚡ and O2 electrolysis restored!'
            : 'Purifier flushed! Drinking water and O2 electrolysis flow restored (+10%).',
          choiceTag: 'Backflushed O2 Purifier'
        })
      },
      {
        id: 'steal-crop-water',
        label: 'Siphon Hydroponics Tray Water',
        costSummary: '-15% Crops',
        outcomeSummary: '+12% Emergency Water/O2 without spending ⚡',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            cropsPct: Math.max(0, systems.cropsPct - 15),
            waterO2Pct: Math.min(100, systems.waterO2Pct + 12)
          },
          nextBackpack: backpack,
          bannerText: 'Diverted greenhouse tank water to keep astronauts breathing (+12% Water/O2, -15% Crops).',
          choiceTag: 'Siphoned Crop Water'
        })
      }
    ]
  },
  {
    id: 'micro-leaks',
    category: 'AIR_WATER',
    title: 'Micrometeorite Hull Pinhole!',
    stationId: 'LIFE_SUPPORT',
    physicsFact:
      'Heating and -130°C cooling flex metal hulls every day, while tiny hyper-velocity pebbles punch invisible leaks into vacuum!',
    description:
      'HISS! A microscopic hull leak near the airlock is bleeding precious air into space every second!',
    severity: 'URGENT',
    options: [
      {
        id: 'seal-hull-patch',
        label: 'Weld & Seal with Epoxy Patch',
        costSummary: '-10⚡ Grid (or -5⚡ if walked here)',
        outcomeSummary: 'Stops hull leak permanently!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            hullLeakActive: false,
            tempGridDeltaKw: systems.tempGridDeltaKw - (handsOnBonus ? 5 : 10)
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'You slapped thermal epoxy right over the hiss—airlock sealed airtight!'
            : 'Repair bot welded the pinhole shut—cabin pressure steady!',
          choiceTag: 'Patched Hull Leak'
        })
      },
      {
        id: 'overpressure-pump',
        label: 'Over-Pump O2 to Outrun Leak',
        costSummary: 'Free Now',
        outcomeSummary: 'Air & Water bleed continuously until sealed at Air Bay!',
        tone: 'rose',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            hullLeakActive: true
          },
          nextBackpack: backpack,
          bannerText:
            'Leak left open! Walk to Air & Water Bay anytime to seal it before your O2 bleeds dry!',
          choiceTag: 'Left Micro-Leak Open!'
        })
      }
    ]
  },
  {
    id: 'co2-poisoning',
    category: 'AIR_WATER',
    title: 'CO2 Scrubber Bake-Out Failure!',
    stationId: 'LIFE_SUPPORT',
    physicsFact:
      'When CO2 scrubbers saturate, silent invisible carbon dioxide climbs—crew lose focus and feel dizzy before realizing why!',
    description:
      'CO2 scrubbers are 100% saturated and the bake-out heater tripped! Cabin CO2 is climbing past 1,900 ppm!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'emergency-bakeout',
        label: 'Reset & Run Scrubber Bake-Out',
        costSummary: '-15⚡ Power · +4°C Cabin Temp',
        outcomeSummary: 'Clears CO2 down to fresh 480 ppm!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            scrubberSaturated: false,
            co2Ppm: 480,
            cabinTempC: systems.cabinTempC + 4,
            tempGridDeltaKw: systems.tempGridDeltaKw - (handsOnBonus ? 10 : 15)
          },
          nextBackpack: backpack,
          bannerText: 'Scrubber baked clean! Fresh crisp air flowing—CO2 back to 480 ppm!',
          choiceTag: 'Baked Out CO2 Scrubber'
        })
      },
      {
        id: 'let-co2-climb',
        label: 'Hold Power & Open Helmet Visors Later',
        costSummary: '0⚡ Now',
        outcomeSummary: 'CO2 keeps climbing (screen fog + cognitive hazard!)',
        tone: 'rose',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            scrubberSaturated: true,
            co2Ppm: Math.min(4800, systems.co2Ppm + 1100)
          },
          nextBackpack: backpack,
          bannerText:
            'Warning: CO2 climbing fast! Walk to Air & Water Bay to purge scrubbers before crew faints!',
          choiceTag: 'Ignored High CO2!'
        })
      }
    ]
  },
  {
    id: 'biocontamination',
    category: 'AGRICULTURE',
    title: 'Bio-Dome Mold Outbreak!',
    stationId: 'HYDROPONICS',
    physicsFact:
      'Inside a 100% sealed greenhouse with zero outside predators, one tiny invasive fungus can wipe out an entire food supply in 48 hours!',
    description:
      'Spores detected on Tray #4! Invasive space fungus will destroy all crops unless contained right now!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'uv-quarantine',
        label: 'UV Flash & Quarantine Infected Tray',
        costSummary: '-10% Crops Sacrificed · -5⚡',
        outcomeSummary: 'Saves remaining 90% of Space Veggies permanently!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            bioContamActive: false,
            cropsPct: Math.max(0, systems.cropsPct - (handsOnBonus ? 6 : 10)),
            tempGridDeltaKw: systems.tempGridDeltaKw - 5
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'Fast hands-on quarantine! You burned out spores losing only 6% crops!'
            : 'UV quarantine worked—fungus stopped cold (-10% infected tray)!',
          choiceTag: 'UV Quarantined Fungus'
        })
      },
      {
        id: 'chemical-fog',
        label: 'Wait & Spray Mild Air Mist',
        costSummary: 'Free Now',
        outcomeSummary: 'Mold spreads! -12% Crops/Sol until sterilized at Bio-Dome',
        tone: 'rose',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            bioContamActive: true
          },
          nextBackpack: backpack,
          bannerText:
            'Biocontamination active! Walk to the Bio-Dome to sterilize trays before harvest dies!',
          choiceTag: 'Fungus Spreading!'
        })
      }
    ]
  },
  {
    id: 'energy-drain-lights',
    category: 'AGRICULTURE',
    title: 'Grow Lights vs. Freezing Cold!',
    stationId: 'HYDROPONICS',
    physicsFact:
      'Hydroponic grow LEDs drink huge electricity—during dust storms, crews face a brutal choice between food calories and staying warm!',
    description:
      'Grow light ballasts are pulling massive current as outside temps plunge! Balance power fast!',
    severity: 'URGENT',
    options: [
      {
        id: 'dim-pink-spectrum',
        label: 'Switch to 40% Pink-Spectrum LEDs',
        costSummary: '+15⚡ Grid Saved · -8% Crops',
        outcomeSummary: 'Frees power for Heat & Forcefields!',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw + 15,
            cropsPct: Math.max(0, systems.cropsPct - 8)
          },
          nextBackpack: backpack,
          bannerText: 'Dimmed to efficient pink LEDs! +15⚡ freed for heaters and Forcefield!',
          choiceTag: 'Dimmed LEDs (+15⚡)'
        })
      },
      {
        id: 'keep-full-lights',
        label: 'Keep Full Sun-Lamps Blazing',
        costSummary: '-12⚡ Grid · +4°C Warmth',
        outcomeSummary: 'Crops thrive (+8%) if grid holds!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - 12,
            cropsPct: Math.min(100, systems.cropsPct + 8),
            cabinTempC: systems.cabinTempC + 3
          },
          nextBackpack: backpack,
          bannerText: 'Full-spectrum lamps glowing bright! Crops boosted +8%!',
          choiceTag: 'Full Grow Lights (+8% Crops)'
        })
      }
    ]
  },
  {
    id: 'toxic-perchlorates',
    category: 'AGRICULTURE',
    title: 'Toxic Perchlorate Salts!',
    stationId: 'HYDROPONICS',
    physicsFact:
      'Real Martian dirt is packed with poisonous perchlorate salts—eating crops grown in unwashed dirt harms the crew!',
    description:
      'Raw exterior dirt contaminated Planter Bay B with toxic perchlorates! Scrub it out or dump the soil?',
    severity: 'URGENT',
    options: [
      {
        id: 'chemical-water-wash',
        label: 'Chemical Water-Wash Scrub',
        costSummary: '-10% Water/O2',
        outcomeSummary: 'Cleans soil completely & boosts Crops +12%!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            perchlorateLock: false,
            waterO2Pct: Math.max(0, systems.waterO2Pct - (handsOnBonus ? 6 : 10)),
            cropsPct: Math.min(100, systems.cropsPct + 12)
          },
          nextBackpack: backpack,
          bannerText: 'Perchlorates neutralized! Rich washed minerals boost Space Veggies +12%!',
          choiceTag: 'Washed Perchlorate Soil'
        })
      },
      {
        id: 'hydro-tubes-only',
        label: 'Lock Dirt Bays & Use Pure Water Tubes',
        costSummary: '-10⚡ Grid Pump',
        outcomeSummary: 'Safe food with zero water wasted on dirt',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            perchlorateLock: true,
            tempGridDeltaKw: systems.tempGridDeltaKw - 10
          },
          nextBackpack: backpack,
          bannerText: 'Switched to closed hydro-tubes (-10⚡ pump power) to avoid toxic salts.',
          choiceTag: 'Pure Hydro-Tubes (-10⚡)'
        })
      }
    ]
  },
  {
    id: 'vacuum-overheating',
    category: 'THERMAL',
    title: 'Vacuum Heat Trap (Radiators Hit)!',
    stationId: 'THERMAL_WORKSHOP',
    physicsFact:
      'A vacuum is a perfect insulator! With no air outside to cool walls, servers and bodies will literally cook the habitat if radiators break!',
    description:
      'Micrometeorite bent Radiator Fin #1! Cabin temperature just jumped toward +39°C!',
    severity: 'CRITICAL',
    options: [
      {
        id: 'ammonia-vent-fix',
        label: 'Repair Fin & Vent Coolant Loop',
        costSummary: '-10% Water/O2 · -5⚡',
        outcomeSummary: 'Restores 100% Radiators & cools cabin -14°C!',
        tone: 'emerald',
        apply: ({ systems, backpack, handsOnBonus }) => ({
          nextSystems: {
            ...systems,
            radiatorHealthPct: 100,
            cabinTempC: Math.max(20, systems.cabinTempC - 14),
            waterO2Pct: Math.max(0, systems.waterO2Pct - (handsOnBonus ? 5 : 10)),
            tempGridDeltaKw: systems.tempGridDeltaKw - 5
          },
          nextBackpack: backpack,
          bannerText: handsOnBonus
            ? 'Hands-On Radiator Fix! Fin straight & cabin cooled to crisp 21°C!'
            : 'Coolant vented and radiator aligned—temperature dropping fast!',
          choiceTag: 'Fixed Vacuum Radiators'
        })
      },
      {
        id: 'throttle-computers',
        label: 'Shut Down Half Base Servers',
        costSummary: 'Free Now',
        outcomeSummary: 'Radiators stay at 60% (cabin stays warm until fixed)',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            radiatorHealthPct: Math.max(45, systems.radiatorHealthPct - 35),
            cabinTempC: Math.min(48, systems.cabinTempC + 6)
          },
          nextBackpack: backpack,
          bannerText:
            'Heat still trapped inside vacuum-insulated walls! Visit Thermal Lab to fix radiators!',
          choiceTag: 'Throttled Servers (Warm!)'
        })
      }
    ]
  },
  {
    id: 'supply-chain-gap',
    category: 'THERMAL',
    title: 'Broken Valve & 9-Month Supply Gap!',
    stationId: 'THERMAL_WORKSHOP',
    physicsFact:
      'Earth resupply rockets take 6–9 months to reach Mars! Without the right 3D-printer filament, astronauts must jury-rig risky bypasses!',
    description:
      'Main Coolant Valve #3 cracked in half! Next Earth cargo rocket is 8 months away!',
    severity: 'URGENT',
    options: [
      {
        id: 'print-custom-valve',
        label: '3D-Print Precision Valve (Uses Filament)',
        costSummary: 'Uses 1 Filament Spool · -10⚡',
        outcomeSummary: '100% permanent titanium-polymer seal!',
        tone: 'emerald',
        requiresItem: 'filamentSpool',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            juryRigValveActive: false,
            tempGridDeltaKw: systems.tempGridDeltaKw - 10
          },
          nextBackpack: {
            ...backpack,
            filamentSpool: Math.max(0, backpack.filamentSpool - 1)
          },
          bannerText: '3D printer forged a brand-new custom valve! Crisis solved permanently!',
          choiceTag: '3D-Printed Valve (1 Spool)'
        })
      },
      {
        id: 'jury-rig-bypass',
        label: 'Jury-Rig Duct Tape & Spare Hose',
        costSummary: 'Free (Saves Filament)',
        outcomeSummary: 'Risky! May burst (-12% Water/Temp) until 3D-printed',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            juryRigValveActive: true
          },
          nextBackpack: backpack,
          bannerText:
            'Jury-rigged hose is pulsing nervously—print a real valve at Thermal Lab when you can!',
          choiceTag: 'Jury-Rigged Bypass (Risky)'
        })
      }
    ]
  }
];

export const MORNING_DILEMMAS: DilemmaCard[] = [
  {
    id: 'night-cryo-prep',
    title: 'Deep Shadow Freeze Incoming!',
    badge: 'Power Physics',
    stationHint: 'SOLAR_GRID',
    story:
      'A 14-hour thermal shadow hits tonight (-130°C)! Prepare cryo-insulation or trust the grid?',
    options: [
      {
        id: 'preheat-cells',
        label: 'Pre-Heat Cryo-Batteries Now',
        nowCostLabel: '-10⚡ This Sol',
        laterEffectLabel: 'Thaws 1 frozen cell + blocks frost!',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - 10,
            frozenCells: Math.max(0, systems.frozenCells - 1)
          },
          nextBackpack: backpack,
          bannerText: 'Battery banks pre-warmed! Zero cold lockups expected today.',
          choiceTag: 'Pre-Warmed Cryo-Cells'
        })
      },
      {
        id: 'save-battery-morning',
        label: 'Keep Full Grid Power',
        nowCostLabel: '0⚡ Cost',
        laterEffectLabel: 'Extra Filament Spool from cargo bay!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: systems,
          nextBackpack: { ...backpack, filamentSpool: backpack.filamentSpool + 1 },
          bannerText: 'Grabbed a spare 3D-printer Filament Spool while saving full power!',
          choiceTag: 'Stocked 3D Filament (+1)'
        })
      }
    ]
  },
  {
    id: 'dust-sweep-schedule',
    title: 'Electrostatic Dust Coating!',
    badge: 'Solar Array',
    stationHint: 'SOLAR_GRID',
    story:
      'Fine razor-sharp regolith drifted across Solar Wing #1 overnight. Clean it or keep moving?',
    options: [
      {
        id: 'morning-wipe',
        label: 'Brush Solar Arrays Clean',
        nowCostLabel: '-6% Water/Air',
        laterEffectLabel: '+15⚡ Permanent Solar Boost!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            dustCoatPct: 0,
            waterO2Pct: Math.max(0, systems.waterO2Pct - 6),
            permanentGridBonusKw: systems.permanentGridBonusKw + 15
          },
          nextBackpack: backpack,
          bannerText: 'Sparkling solar wings! Permanent +15⚡ solar output unlocked!',
          choiceTag: 'Brushed Solar (+15⚡ forever)'
        })
      },
      {
        id: 'skip-wipe',
        label: 'Leave Dust for Later',
        nowCostLabel: 'Keep Water & O2',
        laterEffectLabel: '+15% Dust stays on panels',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            dustCoatPct: Math.min(70, systems.dustCoatPct + 15)
          },
          nextBackpack: backpack,
          bannerText: 'Saved water for drinking & O2, though dusty panels generate less power.',
          choiceTag: 'Skipped Solar Sweep'
        })
      }
    ]
  },
  {
    id: 'supply-pod-rescue',
    title: 'Supply Crate on Crater Rim!',
    badge: 'Supply Chain',
    stationHint: 'THERMAL_WORKSHOP',
    story:
      'An Earth supply drop landed 400 meters outside the airlock! Send the rover before solar wind hits?',
    options: [
      {
        id: 'fetch-crate',
        label: 'Drive Rover Out',
        nowCostLabel: '-10⚡ Power',
        laterEffectLabel: '+1 Sun-Bounce Blanket + 1 Water Tank!',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - 10
          },
          nextBackpack: {
            ...backpack,
            sunBlanket: backpack.sunBlanket + 1,
            waterCartridge: backpack.waterCartridge + 1
          },
          bannerText: 'Rover returned loaded! Packed +1 Sun-Bounce Blanket & +1 Water/O2 Tank!',
          choiceTag: 'Rescued Supply Crate'
        })
      },
      {
        id: 'dock-rover',
        label: 'Keep Rover Charging',
        nowCostLabel: 'Keep Full ⚡',
        laterEffectLabel: 'Save battery for today’s storm',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: systems,
          nextBackpack: backpack,
          bannerText: 'Rover stays docked—100% grid ready for today’s shift.',
          choiceTag: 'Saved Rover Power'
        })
      }
    ]
  },
  {
    id: 'water-electrolysis-tune',
    title: 'Tune Electrolysis Fuel Cells?',
    badge: 'Air & Water',
    stationHint: 'LIFE_SUPPORT',
    story:
      'Water splits into O2 + H2! We can burn spare Hydrogen to charge a Mega Battery, or feed extra O2 into the cabin.',
    options: [
      {
        id: 'capture-h2-battery',
        label: 'Charge a Mega Battery!',
        nowCostLabel: '-8% Water/O2',
        laterEffectLabel: '+1 Mega Battery (+25⚡ surge)',
        tone: 'amber',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            waterO2Pct: Math.max(0, systems.waterO2Pct - 8)
          },
          nextBackpack: { ...backpack, megaBattery: backpack.megaBattery + 1 },
          bannerText: 'Hydrogen fuel cell charged a Mega Battery (+25⚡) in your Backpack!',
          choiceTag: 'Charged Mega Battery'
        })
      },
      {
        id: 'fresh-o2-cabin',
        label: 'Flush Fresh O2 & Scrub CO2',
        nowCostLabel: 'Free Today',
        laterEffectLabel: '+10% Water/O2 & drops CO2!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            waterO2Pct: Math.min(100, systems.waterO2Pct + 10),
            co2Ppm: Math.max(420, systems.co2Ppm - 220)
          },
          nextBackpack: backpack,
          bannerText: 'Crisp mountain-fresh O2 pumped through the domes (+10% Air/Water)!',
          choiceTag: 'Flushed Fresh O2 (+10%)'
        })
      }
    ]
  },
  {
    id: 'radiator-coatings',
    title: 'Vacuum Radiator Upgrade!',
    badge: 'Thermal Physics',
    stationHint: 'THERMAL_WORKSHOP',
    story:
      'Our 3D printer can extrude mirror-white thermal fins to dump server heat into space twice as fast!',
    options: [
      {
        id: 'print-fins',
        label: '3D-Print Mirror Fins',
        nowCostLabel: '-1 Filament Spool · -5⚡',
        laterEffectLabel: 'Cools cabin -6°C & fixes Radiators 100%!',
        tone: 'sky',
        apply: ({ systems, backpack }) => {
          if (backpack.filamentSpool <= 0) {
            return {
              nextSystems: { ...systems, cabinTempC: Math.max(19, systems.cabinTempC - 3) },
              nextBackpack: backpack,
              bannerText: 'Out of Filament! Adjusted fin angle manually for -3°C cooling.',
              choiceTag: 'Adjusted Fin Angle'
            };
          }
          return {
            nextSystems: {
              ...systems,
              radiatorHealthPct: 100,
              cabinTempC: Math.max(19, systems.cabinTempC - 6),
              tempGridDeltaKw: systems.tempGridDeltaKw - 5
            },
            nextBackpack: { ...backpack, filamentSpool: backpack.filamentSpool - 1 },
            bannerText: 'Radiator fins upgraded! Habitat temperature steady and cool.',
            choiceTag: 'Printed Radiator Fins'
          };
        }
      },
      {
        id: 'save-filament',
        label: 'Save 3D Filament for Valves',
        nowCostLabel: 'Keep Spools Safe',
        laterEffectLabel: 'Ready for any Supply Chain Gap!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: systems,
          nextBackpack: backpack,
          bannerText: 'Smart supply discipline! 3D Filament saved in case a custom valve breaks.',
          choiceTag: 'Saved 3D Filament'
        })
      }
    ]
  },
  {
    id: 'perchlorate-soil-lab',
    title: 'Exterior Soil Harvest Test',
    badge: 'Space Farming',
    stationHint: 'HYDROPONICS',
    story:
      'Outside regolith is packed with minerals—AND toxic perchlorate salts! Try washing a batch for the Bio-Dome?',
    options: [
      {
        id: 'wash-batch',
        label: 'Wash Exterior Dirt Batch',
        nowCostLabel: '-8% Water/O2',
        laterEffectLabel: '+15% Crop Harvest & clears toxic lock!',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            perchlorateLock: false,
            waterO2Pct: Math.max(0, systems.waterO2Pct - 8),
            cropsPct: Math.min(100, systems.cropsPct + 15)
          },
          nextBackpack: backpack,
          bannerText: 'Perchlorate salts washed out cleanly—Space Veggies shot up +15%!',
          choiceTag: 'Washed Soil (+15% Crops)'
        })
      },
      {
        id: 'stay-hydro',
        label: 'Stay Pure Hydroponic',
        nowCostLabel: 'Save Water',
        laterEffectLabel: '+1 Reserve Water Cartridge!',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: systems,
          nextBackpack: { ...backpack, waterCartridge: backpack.waterCartridge + 1 },
          bannerText: 'Closed hydroponics saved extra recycled water (+1 Water Tank)!',
          choiceTag: 'Saved Water (+1 Tank)'
        })
      }
    ]
  },
  {
    id: 'precharge-shield-coils',
    title: 'Magnetic Shield Coil Bank',
    badge: 'Storm Defense',
    stationHint: 'COMMAND_BRIDGE',
    story:
      'Command Bridge coils can bank spare juice now so today’s Sun-Zap Forcefield starts strong!',
    options: [
      {
        id: 'bank-coils',
        label: 'Pre-Charge Shield Spire',
        nowCostLabel: '-10⚡ Today',
        laterEffectLabel: '+15⚡ Free Forcefield Both Today & Tomorrow!',
        tone: 'sky',
        apply: ({ systems, backpack }) => ({
          nextSystems: {
            ...systems,
            tempGridDeltaKw: systems.tempGridDeltaKw - 10,
            nextSolShieldBonusKw: systems.nextSolShieldBonusKw + 15
          },
          nextBackpack: backpack,
          bannerText: 'Forcefield spire humming! +15⚡ shield bonus locked in!',
          choiceTag: 'Pre-Charged Forcefield (+15⚡)'
        })
      },
      {
        id: 'hold-grid-open',
        label: 'Keep Power Flexible',
        nowCostLabel: '0⚡ Locked',
        laterEffectLabel: 'Full battery ready for emergencies',
        tone: 'emerald',
        apply: ({ systems, backpack }) => ({
          nextSystems: systems,
          nextBackpack: backpack,
          bannerText: 'Grid kept 100% flexible for whatever surprises pop up!',
          choiceTag: 'Kept Flexible Grid'
        })
      }
    ]
  }
];

export function pickMorningDilemma(sol: number): DilemmaCard {
  return MORNING_DILEMMAS[(sol - 1) % MORNING_DILEMMAS.length];
}

export function pickSurpriseDeckForSol(sol: number, world: WorldBody): SurpriseEmergency[] {
  // Guarantee rich variety covering Power, Air/Water, Agriculture, and Thermal physics!
  const pool = [...SURPRISE_EMERGENCIES];
  // Bias perchlorates slightly toward Mars, battery freezing toward Moon/Commander
  const weighted = pool.filter((e) => !(world === 'MOON' && e.id === 'toxic-perchlorates'));
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }
  // Pick 2 distinct emergencies from different categories so each Sol has varied active walking!
  const first = weighted[0];
  const second = weighted.find((e) => e.category !== first.category && e.id !== first.id) ?? weighted[1];
  // Sol 1 starts gentle with 1 surprise, Sol 2+ brings 2 surprises across the station!
  return sol === 1 ? [first] : [first, second];
}
