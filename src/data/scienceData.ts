import { MarsSite, StationMeta } from '../types/game';

export type GlossaryTermKey =
  | 'Sol'
  | 'Electrolysis'
  | 'Perchlorates'
  | 'Vacuum Radiator'
  | 'Forcefield'
  | 'Regolith Dust';

export const GLOSSARY_TERMS: Record<GlossaryTermKey, string> = {
  Sol: 'One full planetary day! On Mars a Sol lasts 24 hours and 39 minutes—almost like an Earth day.',
  Electrolysis:
    'Splitting recycled water with electricity to make breathable Oxygen (O2)! That is why a broken water purifier hurts both water and air at once.',
  Perchlorates:
    'Toxic chlorine salts packed inside real Martian dirt! Crops cannot grow in it unless we wash it thoroughly first.',
  'Vacuum Radiator':
    'Empty space has no air to carry heat away, so habitats are like giant thermos flasks. External radiators glow and beam excess heat out into space!',
  Forcefield:
    'A magnetic energy dome powered by your base grid that bends dangerous solar storm particles safely away from the domes.',
  'Regolith Dust':
    'Razor-sharp, jagged Moon and Mars rock powder that never gets worn smooth by rain—it clings to solar panels and grinds into robot joints.'
};

export const BASE_STATIONS: StationMeta[] = [
  {
    id: 'SOLAR_GRID',
    name: 'Solar & Cryo-Battery Yard',
    shortName: 'Solar Yard',
    role: 'Power generation, regolith dust scrubbing, -130°C battery heaters & overload breakers',
    position: [-12.5, 0, -8.5],
    accentHex: '#F59E0B'
  },
  {
    id: 'LIFE_SUPPORT',
    name: 'Air & Water Electrolysis Bay',
    shortName: 'Air & Water',
    role: 'Water-to-O2 electrolysis tanks, CO2 scrubbers & hull airlock seal checks',
    position: [12.5, 0, -8.5],
    accentHex: '#0EA5E9'
  },
  {
    id: 'HYDROPONICS',
    name: 'Hydroponics Bio-Dome',
    shortName: 'Bio-Dome',
    role: 'Grow lights, crop biocontamination shields & Martian perchlorate soil washers',
    position: [-12.5, 0, 9.5],
    accentHex: '#10B981'
  },
  {
    id: 'THERMAL_WORKSHOP',
    name: 'Radiator & 3D Workshop',
    shortName: 'Thermal & 3D Lab',
    role: 'External vacuum cooling radiators, thermal loops & 3D-printed custom valves',
    position: [12.5, 0, 9.5],
    accentHex: '#F97316'
  },
  {
    id: 'COMMAND_BRIDGE',
    name: 'Command Hub & Shield Spire',
    shortName: 'Command Hub',
    role: 'Forcefield emitter spire, Sun-Storm Radar, power distribution & Earth radio',
    position: [0, 0, 0],
    accentHex: '#3B82F6'
  }
];

export const MARS_TREK_SITES: MarsSite[] = [
  {
    id: 'JEZERO',
    name: 'Jezero Delta Ridge',
    elevationLabel: 'Ancient Lakebed (-2.5 km)',
    dustCondition: 'Moderate Dust',
    basePowerBudget: 105,
    lifeSupportExtraKw: 0,
    description: 'Flat crater lakebed with steady sunlight and rich clays—but perchlorates lurk in the soil.'
  },
  {
    id: 'OLYMPUS',
    name: 'Olympus High Plateau',
    elevationLabel: 'High Ridge (+12 km)',
    dustCondition: 'Crisp Sun, Freezing Night',
    basePowerBudget: 115,
    lifeSupportExtraKw: 5,
    description: 'Thin air means bright solar power (+115⚡), but brutal -130°C cold nights tax heaters!'
  },
  {
    id: 'HELLAS',
    name: 'Hellas Deep Basin',
    elevationLabel: 'Deep Crater (-7 km)',
    dustCondition: 'Heavy Red Dust Storms',
    basePowerBudget: 95,
    lifeSupportExtraKw: 5,
    description: 'Thick red dust coats solar wings fast—stay sharp with cleaning & 3D-printed spares!'
  }
];

export const SPACE_PHYSICS_FACTS: string[] = [
  'Water = Air in Space! Bases use electricity (electrolysis) to split recycled H2O into breathable oxygen—losing water means losing air too.',
  'Space is a giant thermos bottle! With no air outside, servers and astronauts overheat rapidly unless external radiator fins beam heat into space.',
  'Moon and Mars dust has zero wind erosion from rain, making every speck sharp like tiny glass shards that grind down seals and coat solar panels.',
  'Martian dirt contains toxic perchlorate salts—real astronauts must chemically wash soil or grow veggies purely in misting water tubes!',
  'At -130°C lunar nights, lithium batteries freeze and lose voltage unless precious power keeps their thermal blankets warm.',
  'When CO2 scrubbers clog, astronauts lose focus and get dizzy before noticing—keeping scrubbers baked out saves your brainpower!',
  'Because Mars resupply rockets only launch every 6–9 months, 3D printers are lifelines for making broken custom valves on the spot.'
];
