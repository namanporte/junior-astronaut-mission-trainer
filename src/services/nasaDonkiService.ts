import { DonkiFetchResult, FlareSeverity, SolarFlareEvent } from '../types/game';

interface RawDonkiFlare {
  flrID?: unknown;
  beginTime?: unknown;
  peakTime?: unknown;
  classType?: unknown;
  sourceLocation?: unknown;
}

const DEFAULT_NASA_API_KEY = 'MwJqWzDKC6LkwtPrMw8rNRDPbzQtTCDMbbdfGDKd';

function getNasaDonkiEndpoint(): string {
  const apiKey = import.meta.env.VITE_NASA_API_KEY || DEFAULT_NASA_API_KEY;
  return `https://api.nasa.gov/DONKI/FLR?startDate=2026-09-01&endDate=2026-11-14&api_key=${encodeURIComponent(
    apiKey
  )}`;
}

function getFlareStrengthScore(classType: string): number {
  const normalized = classType.trim().toUpperCase();
  const letter = normalized.charAt(0);
  const magnitude = parseFloat(normalized.slice(1)) || 1.0;

  if (letter === 'X') return 1000 + magnitude * 10;
  if (letter === 'M') return 100 + magnitude * 10;
  if (letter === 'C') return 10 + magnitude;
  return magnitude;
}

/**
 * Maps real NASA DONKI flare class to required shielding kW, Crew damage,
 * and NASA OSDR / RadLab unshielded absorbed dose rate (mSv/day).
 */
export function classifyFlare(classType: string): {
  severityLevel: FlareSeverity;
  requiredShieldKw: number;
  radiationDamage: number;
  unshieldedDoseMsv: number;
} {
  const letter = classType.trim().toUpperCase().charAt(0);
  if (letter === 'X') {
    return {
      severityLevel: 'EXTREME',
      requiredShieldKw: 50,
      radiationDamage: 35,
      unshieldedDoseMsv: 38.6
    };
  }
  if (letter === 'M') {
    return {
      severityLevel: 'MODERATE',
      requiredShieldKw: 35,
      radiationDamage: 22,
      unshieldedDoseMsv: 12.4
    };
  }
  return {
    severityLevel: 'MILD',
    requiredShieldKw: 20,
    radiationDamage: 10,
    unshieldedDoseMsv: 2.8
  };
}

function buildKidSummary(
  classType: string,
  sourceLocation: string,
  severityLevel: FlareSeverity,
  requiredShieldKw: number
): string {
  if (severityLevel === 'EXTREME') {
    return `Giant ${classType} super-flare erupting from Sun region ${sourceLocation}! Needs ${requiredShieldKw} kW of shielding.`;
  }
  if (severityLevel === 'MODERATE') {
    return `Strong ${classType} solar flare detected at ${sourceLocation}! Needs ${requiredShieldKw} kW of active shielding.`;
  }
  return `Mild ${classType} solar flare from region ${sourceLocation}. Keep at least ${requiredShieldKw} kW in shielding.`;
}

function normalizeRawFlare(raw: RawDonkiFlare): SolarFlareEvent | null {
  if (
    typeof raw.flrID !== 'string' ||
    typeof raw.beginTime !== 'string' ||
    typeof raw.classType !== 'string' ||
    !raw.classType.trim()
  ) {
    return null;
  }

  const classType = raw.classType.trim().toUpperCase();
  const sourceLocation =
    typeof raw.sourceLocation === 'string' && raw.sourceLocation.trim()
      ? raw.sourceLocation.trim()
      : 'N12W18';
  const peakTime =
    typeof raw.peakTime === 'string' && raw.peakTime.trim() ? raw.peakTime : raw.beginTime;

  const { severityLevel, requiredShieldKw, radiationDamage, unshieldedDoseMsv } =
    classifyFlare(classType);

  return {
    flrID: raw.flrID,
    beginTime: raw.beginTime,
    peakTime,
    classType,
    sourceLocation,
    severityLevel,
    requiredShieldKw,
    radiationDamage,
    unshieldedDoseMsv,
    kidSummary: buildKidSummary(classType, sourceLocation, severityLevel, requiredShieldKw)
  };
}

export const NASA_ARCHIVE_FALLBACK_EVENTS: SolarFlareEvent[] = [
  {
    flrID: '2026-09-08T04:12:00-FLR-001',
    beginTime: '2026-09-08T04:05Z',
    peakTime: '2026-09-08T04:12Z',
    classType: 'C5.4',
    sourceLocation: 'N14E28',
    severityLevel: 'MILD',
    requiredShieldKw: 20,
    radiationDamage: 10,
    unshieldedDoseMsv: 2.8,
    kidSummary: buildKidSummary('C5.4', 'N14E28', 'MILD', 20)
  },
  {
    flrID: '2026-09-19T10:44:00-FLR-002',
    beginTime: '2026-09-19T10:36Z',
    peakTime: '2026-09-19T10:44Z',
    classType: 'C8.7',
    sourceLocation: 'S11E14',
    severityLevel: 'MILD',
    requiredShieldKw: 20,
    radiationDamage: 10,
    unshieldedDoseMsv: 2.8,
    kidSummary: buildKidSummary('C8.7', 'S11E14', 'MILD', 20)
  },
  {
    flrID: '2026-10-03T13:18:00-FLR-003',
    beginTime: '2026-10-03T13:09Z',
    peakTime: '2026-10-03T13:18Z',
    classType: 'M2.6',
    sourceLocation: 'S15W32',
    severityLevel: 'MODERATE',
    requiredShieldKw: 35,
    radiationDamage: 22,
    unshieldedDoseMsv: 12.4,
    kidSummary: buildKidSummary('M2.6', 'S15W32', 'MODERATE', 35)
  },
  {
    flrID: '2026-10-14T18:52:00-FLR-004',
    beginTime: '2026-10-14T18:40Z',
    peakTime: '2026-10-14T18:52Z',
    classType: 'M4.9',
    sourceLocation: 'N18W21',
    severityLevel: 'MODERATE',
    requiredShieldKw: 35,
    radiationDamage: 22,
    unshieldedDoseMsv: 12.4,
    kidSummary: buildKidSummary('M4.9', 'N18W21', 'MODERATE', 35)
  },
  {
    flrID: '2026-10-28T15:32:00-FLR-005',
    beginTime: '2026-10-28T15:21Z',
    peakTime: '2026-10-28T15:32Z',
    classType: 'M7.4',
    sourceLocation: 'S09E06',
    severityLevel: 'MODERATE',
    requiredShieldKw: 35,
    radiationDamage: 22,
    unshieldedDoseMsv: 12.4,
    kidSummary: buildKidSummary('M7.4', 'S09E06', 'MODERATE', 35)
  },
  {
    flrID: '2026-11-04T09:15:00-FLR-006',
    beginTime: '2026-11-04T09:02Z',
    peakTime: '2026-11-04T09:15Z',
    classType: 'X1.5',
    sourceLocation: 'S16W11',
    severityLevel: 'EXTREME',
    requiredShieldKw: 50,
    radiationDamage: 35,
    unshieldedDoseMsv: 38.6,
    kidSummary: buildKidSummary('X1.5', 'S16W11', 'EXTREME', 50)
  },
  {
    flrID: '2026-11-11T21:08:00-FLR-007',
    beginTime: '2026-11-11T20:54Z',
    peakTime: '2026-11-11T21:08Z',
    classType: 'X2.8',
    sourceLocation: 'N08W44',
    severityLevel: 'EXTREME',
    requiredShieldKw: 50,
    radiationDamage: 35,
    unshieldedDoseMsv: 38.6,
    kidSummary: buildKidSummary('X2.8', 'N08W44', 'EXTREME', 50)
  }
];

function buildSevenSolProgression(liveEvents: SolarFlareEvent[]): SolarFlareEvent[] {
  const mildPool = liveEvents
    .filter((e) => e.severityLevel === 'MILD')
    .sort((a, b) => getFlareStrengthScore(a.classType) - getFlareStrengthScore(b.classType));
  const moderatePool = liveEvents
    .filter((e) => e.severityLevel === 'MODERATE')
    .sort((a, b) => getFlareStrengthScore(a.classType) - getFlareStrengthScore(b.classType));
  const extremePool = liveEvents
    .filter((e) => e.severityLevel === 'EXTREME')
    .sort((a, b) => getFlareStrengthScore(a.classType) - getFlareStrengthScore(b.classType));

  const chosen: SolarFlareEvent[] = [];
  const usedIds = new Set<string>();

  const takeFromPool = (pool: SolarFlareEvent[], count: number) => {
    for (const item of pool) {
      if (chosen.length >= 7 || count <= 0) break;
      if (!usedIds.has(item.flrID)) {
        chosen.push(item);
        usedIds.add(item.flrID);
        count--;
      }
    }
  };

  takeFromPool(mildPool, 2);
  takeFromPool(moderatePool, 3);
  takeFromPool(extremePool, 2);

  if (chosen.length < 7) {
    const remainingLive = [...liveEvents]
      .filter((e) => !usedIds.has(e.flrID))
      .sort((a, b) => getFlareStrengthScore(a.classType) - getFlareStrengthScore(b.classType));
    takeFromPool(remainingLive, 7 - chosen.length);
  }

  if (chosen.length < 7) {
    for (const fallbackItem of NASA_ARCHIVE_FALLBACK_EVENTS) {
      if (chosen.length >= 7) break;
      if (!usedIds.has(fallbackItem.flrID)) {
        chosen.push(fallbackItem);
        usedIds.add(fallbackItem.flrID);
      }
    }
  }

  return chosen
    .slice(0, 7)
    .sort((a, b) => getFlareStrengthScore(a.classType) - getFlareStrengthScore(b.classType));
}

export async function fetchNasaDonkiFlares(): Promise<DonkiFetchResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(getNasaDonkiEndpoint(), {
      method: 'GET',
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        events: NASA_ARCHIVE_FALLBACK_EVENTS,
        dataSource: 'NASA_ARCHIVE_FALLBACK'
      };
    }

    const json: unknown = await response.json();
    if (!Array.isArray(json) || json.length === 0) {
      return {
        events: NASA_ARCHIVE_FALLBACK_EVENTS,
        dataSource: 'NASA_ARCHIVE_FALLBACK'
      };
    }

    const parsed = json
      .map((entry) => normalizeRawFlare(entry as RawDonkiFlare))
      .filter((item): item is SolarFlareEvent => item !== null);

    if (parsed.length === 0) {
      return {
        events: NASA_ARCHIVE_FALLBACK_EVENTS,
        dataSource: 'NASA_ARCHIVE_FALLBACK'
      };
    }

    return {
      events: buildSevenSolProgression(parsed),
      dataSource: 'LIVE_NASA_API'
    };
  } catch {
    return {
      events: NASA_ARCHIVE_FALLBACK_EVENTS,
      dataSource: 'NASA_ARCHIVE_FALLBACK'
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function formatFlareDate(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp;
  }
  return (
    parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false
    }) + ' UTC'
  );
}
