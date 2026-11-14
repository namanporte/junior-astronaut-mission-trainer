import { FlareSeverity } from '../types/game';
import stormSolarFlareImg from '../assets/images/storm_solar_flare_1794695737714.jpg';
import crisisPowerDustImg from '../assets/images/crisis_power_dust_1794695738884.jpg';
import crisisAirWaterImg from '../assets/images/crisis_air_water_1794695738727.jpg';
import crisisBiodomeCropsImg from '../assets/images/crisis_biodome_crops_1794695738735.jpg';
import crisisThermalPrinterImg from '../assets/images/crisis_thermal_printer_1794695739416.jpg';

export type IncidentVisualId =
  | 'dust-contamination'
  | 'battery-freezing'
  | 'grid-overload'
  | 'water-oxygen-trap'
  | 'micro-leaks'
  | 'co2-poisoning'
  | 'biocontamination'
  | 'energy-drain-lights'
  | 'toxic-perchlorates'
  | 'vacuum-overheating'
  | 'supply-chain-gap'
  | 'night-cryo-prep'
  | 'dust-sweep-schedule'
  | 'supply-pod-rescue'
  | 'water-electrolysis-tune'
  | 'radiator-coatings'
  | 'perchlorate-soil-lab'
  | 'precharge-shield-coils'
  | 'storm-preview'
  | 'storm-outcome';

interface IncidentVisualMeta {
  image: string;
  alt: string;
  caption: string;
  badgeText: string;
  badgeClass: string;
}

const INCIDENT_META: Record<IncidentVisualId, IncidentVisualMeta> = {
  'dust-contamination': {
    image: crisisPowerDustImg,
    alt: 'Solar wings coated in swirling razor-sharp Moon and Mars dust',
    caption: 'Sharp regolith dust coats Solar Wing #2, blocking sunlight & grinding motor joints!',
    badgeText: 'DUST BLOCKING SUNLIGHT',
    badgeClass: 'bg-amber-500 text-amber-950 border-amber-300'
  },
  'battery-freezing': {
    image: crisisPowerDustImg,
    alt: 'Cryo-battery vessels freezing in deep -130 degree shadow',
    caption: 'Outside shadow plunged to -130°C—frost is locking up battery chemistry!',
    badgeText: '-130°C CRYO FROST',
    badgeClass: 'bg-cyan-400 text-slate-950 border-cyan-200'
  },
  'grid-overload': {
    image: crisisPowerDustImg,
    alt: 'Main power junction box arcing during heavy machinery startup spike',
    caption: 'Water pumps & heaters spiked together—electric arcs threaten a base blackout!',
    badgeText: 'BREAKER SURGE SPIKE',
    badgeClass: 'bg-yellow-400 text-slate-950 border-yellow-200'
  },
  'water-oxygen-trap': {
    image: crisisAirWaterImg,
    alt: 'Twin glass water electrolysis columns inside space life-support bay',
    caption: 'Water purifier clogged—losing clean water stops breathable O2 bubbles too!',
    badgeText: 'WATER = OXYGEN LINK',
    badgeClass: 'bg-sky-400 text-slate-950 border-sky-200'
  },
  'micro-leaks': {
    image: crisisAirWaterImg,
    alt: 'Pressurized airlock hatch hissing thin air jet into space vacuum',
    caption: 'A tiny micrometeorite pinhole in the airlock is jetting cabin air into space!',
    badgeText: 'AIR BLEEDING TO SPACE',
    badgeClass: 'bg-rose-500 text-white border-rose-300'
  },
  'co2-poisoning': {
    image: crisisAirWaterImg,
    alt: 'Saturated CO2 scrubber canisters leaking trapped carbon dioxide gas',
    caption: 'CO2 scrubber heater tripped—invisible gas is building up in the crew cabin!',
    badgeText: 'CO2 CLOUD RISING',
    badgeClass: 'bg-amber-400 text-amber-950 border-amber-200'
  },
  biocontamination: {
    image: crisisBiodomeCropsImg,
    alt: 'Misty green fungal spores spreading over corner tray in Mars Bio-Dome',
    caption: 'Invasive mold spores landed on Tray #4 inside the sealed greenhouse!',
    badgeText: 'SPORE OUTBREAK',
    badgeClass: 'bg-lime-400 text-slate-950 border-lime-200'
  },
  'energy-drain-lights': {
    image: crisisBiodomeCropsImg,
    alt: 'Blazing pink hydroponic grow lamps drawing heavy electrical current',
    caption: 'Grow lamps are pulling massive power right as outside cold spikes!',
    badgeText: 'LAMP POWER DRAIN',
    badgeClass: 'bg-fuchsia-400 text-slate-950 border-fuchsia-200'
  },
  'toxic-perchlorates': {
    image: crisisBiodomeCropsImg,
    alt: 'Rusty Martian soil canisters containing toxic perchlorate salts beside water pipes',
    caption: 'Poisonous Martian perchlorate salts dusted Planter Bay B—must wash before eating!',
    badgeText: 'TOXIC SOIL SALTS',
    badgeClass: 'bg-orange-400 text-slate-950 border-orange-200'
  },
  'vacuum-overheating': {
    image: crisisThermalPrinterImg,
    alt: 'External space radiator fins glowing fiery orange-red in vacuum',
    caption: 'Bent radiator fin trapped heat inside the base like a giant vacuum thermos!',
    badgeText: 'THERMOS HEAT TRAP',
    badgeClass: 'bg-orange-500 text-white border-orange-300'
  },
  'supply-chain-gap': {
    image: crisisThermalPrinterImg,
    alt: 'Robotic 3D printer forging replacement coolant valve in glowing cyan light',
    caption: 'Coolant Valve #3 cracked—Earth cargo is 8 months away, so 3D print or jury-rig!',
    badgeText: 'VALVE CRACKED · 8 MO GAP',
    badgeClass: 'bg-cyan-400 text-slate-950 border-cyan-200'
  },
  'night-cryo-prep': {
    image: crisisPowerDustImg,
    alt: 'Deep space shadow cooling cryo-battery tanks on outpost surface',
    caption: 'A 14-hour -130°C thermal shadow rolls in tonight across your battery yard!',
    badgeText: '14-HR FREEZE AHEAD',
    badgeClass: 'bg-sky-400 text-slate-950 border-sky-200'
  },
  'dust-sweep-schedule': {
    image: crisisPowerDustImg,
    alt: 'Electrostatic dust clinging to solar panels at dawn',
    caption: 'Static electricity glued sharp dust onto Solar Wing #1 overnight!',
    badgeText: 'STATIC DUST COATING',
    badgeClass: 'bg-amber-400 text-amber-950 border-amber-200'
  },
  'supply-pod-rescue': {
    image: crisisThermalPrinterImg,
    alt: 'Space cargo drop and outpost engineering bay waiting for rover pickup',
    caption: 'An Earth supply pod touched down 400m outside on the crater rim!',
    badgeText: 'CARGO DROP 400M AWAY',
    badgeClass: 'bg-emerald-400 text-slate-950 border-emerald-200'
  },
  'water-electrolysis-tune': {
    image: crisisAirWaterImg,
    alt: 'Electrolysis water-splitting columns generating oxygen and hydrogen fuel',
    caption: 'Electrolysis splits H2O into breathable O2 and Hydrogen battery fuel!',
    badgeText: 'H2O SPLITTER TUNE-UP',
    badgeClass: 'bg-cyan-400 text-slate-950 border-cyan-200'
  },
  'radiator-coatings': {
    image: crisisThermalPrinterImg,
    alt: '3D printer extruding white thermal radiator fins next to habitat exterior',
    caption: '3D printer can extrude mirror-white radiator fins to beam heat into space!',
    badgeText: 'RADIATOR UPGRADE',
    badgeClass: 'bg-orange-400 text-slate-950 border-orange-200'
  },
  'perchlorate-soil-lab': {
    image: crisisBiodomeCropsImg,
    alt: 'Martian soil sample canisters next to glowing hydroponic vegetable trays',
    caption: 'Wash toxic salts out of raw exterior soil, or stay in clean water tubes!',
    badgeText: 'SOIL WASH EXPERIMENT',
    badgeClass: 'bg-emerald-400 text-slate-950 border-emerald-200'
  },
  'precharge-shield-coils': {
    image: stormSolarFlareImg,
    alt: 'Magnetic dome shield shimmering over outpost under solar corona waves',
    caption: 'Command Spire coils can store bonus energy to boost your Forcefield dome!',
    badgeText: 'SHIELD COIL PRE-CHARGE',
    badgeClass: 'bg-sky-400 text-slate-950 border-sky-200'
  },
  'storm-preview': {
    image: stormSolarFlareImg,
    alt: 'Solar flare wave sweeping from burning Sun toward base forcefield dome',
    caption: 'Solar eruptions hurl invisible radiation waves across space toward your Forcefield!',
    badgeText: 'SUN BURP RADAR',
    badgeClass: 'bg-amber-400 text-amber-950 border-amber-200'
  },
  'storm-outcome': {
    image: stormSolarFlareImg,
    alt: 'Base hexagonal forcefield deflecting a golden solar plasma storm',
    caption: 'Forcefield dome intercepts high-energy solar particles before they reach the crew!',
    badgeText: 'STORM IMPACT LOG',
    badgeClass: 'bg-sky-400 text-slate-950 border-sky-200'
  }
};

interface IncidentVisualCardProps {
  id: IncidentVisualId;
  compact?: boolean;
  stormSeverity?: FlareSeverity;
  shieldHeld?: boolean;
  sunBlanketSaved?: boolean;
  customCaption?: string;
}

export function IncidentVisualCard({
  id,
  compact = false,
  stormSeverity = 'MODERATE',
  shieldHeld = true,
  sunBlanketSaved = false,
  customCaption
}: IncidentVisualCardProps) {
  const meta = INCIDENT_META[id];

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-950 shadow-md ${
        compact ? 'h-28 sm:h-32' : 'h-40 sm:h-48'
      }`}
    >
      {/* Photorealistic Depiction Layer */}
      <img
        src={meta.image}
        alt={meta.alt}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-90"
      />

      {/* Contrast Scrim */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/35"
        aria-hidden="true"
      />

      {/* BESPOKE ANIMATED PROBLEM & STORM OVERLAYS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* 1. Dust Wind Gusts */}
        {(id === 'dust-contamination' || id === 'dust-sweep-schedule') && (
          <>
            {[18, 36, 54, 70].map((topPct, i) => (
              <div
                key={i}
                className="animate-dust-wind absolute h-1.5 rounded-full bg-gradient-to-r from-amber-300/0 via-amber-400/85 to-orange-500/0"
                style={{
                  top: `${topPct}%`,
                  left: `${8 + i * 14}%`,
                  width: `${90 + i * 24}px`,
                  animationDelay: `${i * 0.35}s`
                }}
              />
            ))}
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-slate-950/80 border border-amber-400/60 px-2 py-1 text-[10px] font-mono-tabular font-extrabold text-amber-300">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>SOLAR -35%</span>
            </div>
          </>
        )}

        {/* 2. Cryo Freeze Crystals (-130°C) */}
        {(id === 'battery-freezing' || id === 'night-cryo-prep') && (
          <>
            {[16, 38, 62, 82].map((leftPct, i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                className="animate-frost-float absolute w-5 h-5 text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)]"
                style={{
                  left: `${leftPct}%`,
                  top: `${16 + (i % 2) * 24}%`,
                  animationDelay: `${i * 0.4}s`
                }}
              >
                <path
                  fill="currentColor"
                  d="M11 2h2v4.6l2.3-2.3 1.4 1.4L13 9.4V11h1.6l3.7-3.7 1.4 1.4-2.3 2.3H22v2h-4.6l2.3 2.3-1.4 1.4-3.7-3.7H13v1.6l3.7 3.7-1.4 1.4-2.3-2.3V22h-2v-4.6l-2.3 2.3-1.4-1.4L11 14.6V13H9.4l-3.7 3.7-1.4-1.4 2.3-2.3H2v-2h4.6L4.3 8.7l1.4-1.4L9.4 11H11V9.4L7.3 5.7l1.4-1.4L11 6.6V2z"
                />
              </svg>
            ))}
            <div className="absolute right-3 top-3 rounded-lg bg-cyan-950/90 border border-cyan-400 px-2 py-1 text-[10px] font-mono-tabular font-extrabold text-cyan-200">
              TEMP: -130°C
            </div>
          </>
        )}

        {/* 3. Electric Arcs / Grid Spike */}
        {id === 'grid-overload' && (
          <>
            {[24, 52, 74].map((leftPct, i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                className="animate-spark-flash absolute w-8 h-8 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.95)]"
                style={{
                  left: `${leftPct}%`,
                  top: `${20 + (i % 2) * 22}%`,
                  animationDelay: `${i * 0.25}s`
                }}
              >
                <path fill="currentColor" d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
              </svg>
            ))}
          </>
        )}

        {/* 4. Water-Oxygen Electrolysis Trap & Tune */}
        {(id === 'water-oxygen-trap' || id === 'water-electrolysis-tune') && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl bg-slate-950/85 border border-cyan-400/70 px-2.5 py-1.5 text-[10px] font-extrabold text-cyan-200">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {id === 'water-oxygen-trap' ? 'H2O CLOGGED -> O2 DROPS!' : 'H2O -> O2 + H2 BOLT'}
            </span>
          </div>
        )}

        {/* 5. Escaping Air Jet Stream (Hull Pinhole Leak) */}
        {id === 'micro-leaks' && (
          <div className="absolute left-[46%] top-[44%] flex items-center">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <div className="animate-air-jet ml-1 h-3 w-24 rounded-full bg-gradient-to-r from-white/95 via-cyan-200/70 to-transparent blur-[1px]" />
            <div
              className="animate-air-jet -ml-20 h-2 w-20 rounded-full bg-gradient-to-r from-cyan-100/90 to-transparent"
              style={{ animationDelay: '0.35s' }}
            />
          </div>
        )}

        {/* 6. Rising CO2 Gas Clouds */}
        {id === 'co2-poisoning' && (
          <>
            {[22, 42, 60, 76].map((leftPct, i) => (
              <div
                key={i}
                className="animate-spore-drift absolute w-8 h-8 rounded-full bg-amber-300/35 border border-amber-300/60 backdrop-blur-[1px]"
                style={{
                  left: `${leftPct}%`,
                  bottom: `${28 + (i % 2) * 14}%`,
                  animationDelay: `${i * 0.45}s`
                }}
              />
            ))}
          </>
        )}

        {/* 7. Floating Fungal Spores (Bio-Dome Mold) */}
        {id === 'biocontamination' && (
          <>
            {[15, 30, 48, 66, 80].map((leftPct, i) => (
              <div
                key={i}
                className="animate-spore-drift absolute w-3.5 h-3.5 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.9)]"
                style={{
                  left: `${leftPct}%`,
                  top: `${26 + (i % 3) * 16}%`,
                  animationDelay: `${i * 0.35}s`
                }}
              />
            ))}
          </>
        )}

        {/* 8. Blazing Grow Lamps vs Grid Power */}
        {id === 'energy-drain-lights' && (
          <>
            <div className="animate-pulse-glow absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-fuchsia-500/45 to-transparent" />
            <div className="animate-spark-flash absolute right-3 top-3 rounded-lg bg-fuchsia-950/90 border border-fuchsia-400 px-2 py-1 text-[10px] font-mono-tabular font-extrabold text-fuchsia-200">
              GROW LEDS: HIGH ⚡ DRAW
            </div>
          </>
        )}

        {/* 9. Toxic Perchlorate Salt Sparkles */}
        {(id === 'toxic-perchlorates' || id === 'perchlorate-soil-lab') && (
          <>
            {[20, 34, 52, 68].map((leftPct, i) => (
              <div
                key={i}
                className="animate-spark-flash absolute w-3 h-3 rotate-45 bg-orange-400 border border-amber-200 shadow-[0_0_8px_rgba(251,146,60,0.9)]"
                style={{
                  left: `${leftPct}%`,
                  bottom: `${28 + (i % 2) * 12}%`,
                  animationDelay: `${i * 0.28}s`
                }}
              />
            ))}
          </>
        )}

        {/* 10. Vacuum Overheat Heat Shimmer Waves */}
        {(id === 'vacuum-overheating' || id === 'radiator-coatings') && (
          <>
            {[18, 34, 50, 68].map((leftPct, i) => (
              <svg
                key={i}
                viewBox="0 0 24 48"
                className="animate-heat-shimmer absolute w-6 h-12 text-orange-400"
                style={{
                  left: `${leftPct}%`,
                  top: '22%',
                  animationDelay: `${i * 0.3}s`
                }}
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  d="M12 44 C4 34, 20 26, 12 16 C6 8, 16 4, 12 2"
                />
              </svg>
            ))}
          </>
        )}

        {/* 11. Cracked Valve + 3D Printer Laser + Supply Crate */}
        {(id === 'supply-chain-gap' || id === 'supply-pod-rescue') && (
          <>
            <div className="animate-pulse-glow absolute right-[24%] top-[34%] w-10 h-10 rounded-full border-2 border-cyan-300 bg-cyan-400/20 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
            <div className="absolute right-3 top-3 rounded-lg bg-slate-950/90 border border-cyan-400 px-2 py-1 text-[10px] font-mono-tabular font-extrabold text-cyan-200">
              {id === 'supply-chain-gap' ? 'EARTH CARGO: 8 MONTHS' : 'CRATER POD: 400M'}
            </div>
          </>
        )}

        {/* 12. Solar Storm / Sun Burps / Forcefield Preview */}
        {(id === 'storm-preview' || id === 'storm-outcome' || id === 'precharge-shield-coils') && (
          <>
            {/* Pulsing Sun Flare / Burp Orb */}
            <div
              className={`animate-burp-pulse absolute left-4 top-3 rounded-full blur-[1px] ${
                stormSeverity === 'EXTREME'
                  ? 'w-14 h-14 bg-gradient-to-br from-yellow-200 via-orange-500 to-rose-600 shadow-[0_0_32px_rgba(244,63,94,0.95)]'
                  : stormSeverity === 'MODERATE'
                  ? 'w-11 h-11 bg-gradient-to-br from-yellow-200 via-amber-500 to-orange-600 shadow-[0_0_24px_rgba(245,158,11,0.85)]'
                  : 'w-9 h-9 bg-gradient-to-br from-amber-100 via-amber-400 to-orange-500 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
              }`}
            />

            {/* Streaking Plasma Flare Bolts */}
            {(stormSeverity === 'EXTREME' ? [0, 1, 2, 3] : stormSeverity === 'MODERATE' ? [0, 1, 2] : [0, 1]).map(
              (boltIdx) => (
                <div
                  key={boltIdx}
                  className={`animate-plasma-bolt absolute h-1.5 rounded-full ${
                    stormSeverity === 'EXTREME'
                      ? 'w-16 bg-gradient-to-r from-rose-500 via-amber-300 to-white'
                      : 'w-12 bg-gradient-to-r from-amber-500 via-yellow-200 to-white'
                  }`}
                  style={{
                    left: `${18 + boltIdx * 8}%`,
                    top: `${16 + boltIdx * 12}%`,
                    animationDelay: `${boltIdx * 0.25}s`
                  }}
                />
              )
            )}

            {/* Shield Result Chip when showing Outcome */}
            {id === 'storm-outcome' && (
              <div
                className={`absolute right-3 top-3 rounded-lg border px-2.5 py-1 text-[10px] font-mono-tabular font-extrabold ${
                  sunBlanketSaved
                    ? 'bg-amber-400 text-amber-950 border-amber-200'
                    : shieldHeld
                    ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                    : 'bg-rose-600 text-white border-rose-300'
                }`}
              >
                {sunBlanketSaved
                  ? 'SUN-BOUNCE DEFLECTED!'
                  : shieldHeld
                  ? 'FORCEFIELD DEFLECTED!'
                  : 'SOLAR ZAP PENETRATED!'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Top-Left Problem Badge */}
      <div className="relative z-10 p-2.5 flex items-start justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[10px] sm:text-[11px] font-mono-tabular font-extrabold tracking-wide shadow-sm ${meta.badgeClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {meta.badgeText}
        </span>
      </div>

      {/* Bottom Clear "What Happened" Caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 py-2 flex items-center gap-2">
        <p className="text-[11px] sm:text-xs font-bold text-slate-100 leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {customCaption ?? meta.caption}
        </p>
      </div>
    </div>
  );
}
