import { MarsSite } from '../types/game';

export type GlossaryTermKey =
  | 'Sol'
  | 'Radiation Dose'
  | 'Solar Flare'
  | 'Comms Delay'
  | 'Hydroponics';

export const GLOSSARY_TERMS: Record<GlossaryTermKey, string> = {
  Sol: 'One full day-and-night cycle on Mars (24h 39m) or a lunar shift.',
  'Radiation Dose': 'Invisible space energy measured in mSv/day that shields must block.',
  'Solar Flare': 'A sudden burst of bright energy and particles erupting from the Sun.',
  'Comms Delay': 'Time it takes radio waves at light speed to reach Earth and return.',
  Hydroponics: 'Growing fresh astronaut food in water and nutrients without any soil.'
};

/**
 * Curated facts grounded in the Canadian Space Agency (CSA)
 * "Food Production on the Moon" closed-loop hydroponic crop research.
 */
export const CSA_LUNAR_FOOD_FACTS: string[] = [
  'CSA Lunar Greenhouse Fact: Compact dwarf wheat and leafy greens grow cleanly in hydroponic water trays without heavy Moon dirt.',
  'CSA Lunar Greenhouse Fact: Tuned red and blue LED lights help astronauts grow crisp lettuce using far less electricity.',
  'CSA Lunar Greenhouse Fact: Closed-loop lunar greenhouses recycle up to 95% of plant water vapor back into clean crew drinking water.',
  'CSA Lunar Greenhouse Fact: Microgreens sprout in just 7–10 days, giving astronauts fast vitamins when supply rockets are far away.',
  'CSA Lunar Greenhouse Fact: Hydroponic plants naturally scrub carbon dioxide from cabin air while releasing fresh oxygen to breathe.',
  'CSA Lunar Greenhouse Fact: Automated nutrient sensors monitor plant roots continuously so crops stay healthy even during solar storms.',
  'CSA Lunar Greenhouse Fact: Growing fresh vegetables in orbit or on the Moon boosts astronaut morale alongside nutrition.'
];

/**
 * Real NASA Mars Trek elevation & dust profiles for Commander Mode site selection.
 */
export const MARS_TREK_SITES: MarsSite[] = [
  {
    id: 'JEZERO',
    name: 'Jezero Crater',
    elevationLabel: '-2,500 m (Ancient Lakebed)',
    dustCondition: 'Moderate Dust',
    basePowerBudget: 95,
    lifeSupportExtraKw: 0,
    description: 'Balanced crater basin with steady sunlight and mild afternoon dust.'
  },
  {
    id: 'OLYMPUS',
    name: 'Olympus Mons Slope',
    elevationLabel: '+14,000 m (High Volcano)',
    dustCondition: 'Clear Thin Air',
    basePowerBudget: 100,
    lifeSupportExtraKw: 5,
    description: 'Bright 100 kW solar power, but freezing high altitude needs +5 kW heat.'
  },
  {
    id: 'HELLAS',
    name: 'Hellas Planitia',
    elevationLabel: '-7,152 m (Deep Basin)',
    dustCondition: 'Heavy Dust Swirls',
    basePowerBudget: 85,
    lifeSupportExtraKw: 0,
    description: 'Deep basin dust cuts solar grid to 85 kW—tight power tradeoffs!'
  }
];
