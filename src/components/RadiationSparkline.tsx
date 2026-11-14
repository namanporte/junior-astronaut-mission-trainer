import { useEffect, useState } from 'react';

interface RadiationSparklineProps {
  osdrDoseMsv: number;
  maxStormDoseMsv: number;
}

/**
 * Live NASA OSDR Radiation Flux oscilloscope (~40px compact monitor).
 * Stays calm emerald/cyan at <= 1.0 mSv/day and spikes jaggedly in amber/coral during solar storms,
 * flattening visibly as the player increases Radiation Shielding kW.
 */
export function RadiationSparkline({
  osdrDoseMsv,
  maxStormDoseMsv
}: RadiationSparklineProps) {
  const [phaseTick, setPhaseTick] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setPhaseTick((t) => (t + 1) % 360);
    }, 95);
    return () => window.clearInterval(timer);
  }, []);

  const isCalm = osdrDoseMsv <= 1.0;
  const isElevated = osdrDoseMsv > 1.0 && osdrDoseMsv <= 8.0;
  const strokeColor = isCalm ? '#34D399' : isElevated ? '#FBBF24' : '#FB7185';
  const fillColor = isCalm
    ? 'rgba(52, 211, 153, 0.16)'
    : isElevated
    ? 'rgba(251, 191, 36, 0.18)'
    : 'rgba(251, 113, 133, 0.22)';

  const width = 260;
  const height = 34;
  const midY = 18;
  const pointsCount = 34;

  // Map dose intensity (0.5 .. 38.6) into wave amplitude and jagged harmonic spike factor
  const normalizedSeverity = Math.min(1, Math.max(0, (osdrDoseMsv - 0.5) / 24));
  const amplitude = 2.2 + normalizedSeverity * 12.5;

  const points: string[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const x = (i / (pointsCount - 1)) * width;
    const t = i * 0.55 + phaseTick * 0.45;
    const baseWave = Math.sin(t) * (amplitude * 0.55);
    const spikeNoise =
      normalizedSeverity > 0.06
        ? Math.sin(t * 2.7 + i * 1.9) * Math.cos(t * 1.3) * (amplitude * 0.72)
        : Math.sin(t * 1.5) * 0.7;
    const y = Math.max(3, Math.min(height - 3, midY + baseWave + spikeNoise));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const polylinePoints = points.join(' ');
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <div className="rounded-xl bg-[#070B17] border border-slate-800/90 px-2.5 py-1.5 flex items-center gap-2.5">
      <div className="flex flex-col shrink-0 leading-tight">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          OSDR Flux
        </span>
        <span
          className={`font-mono-tabular text-[11px] font-extrabold ${
            isCalm ? 'text-emerald-300' : isElevated ? 'text-amber-300' : 'text-rose-300'
          }`}
        >
          {osdrDoseMsv} mSv/d
        </span>
      </div>

      <div className="flex-1 h-[34px] relative overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          {/* Subtle oscilloscope gridlines */}
          <line x1="0" y1="17" x2={width} y2="17" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="8" x2={width} y2="8" stroke="#1E293B" strokeWidth="0.6" />
          <line x1="0" y1="26" x2={width} y2="26" stroke="#1E293B" strokeWidth="0.6" />
          <polygon points={areaPoints} fill={fillColor} />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth={isCalm ? '1.8' : '2.2'}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />
        </svg>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0 leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          Storm Max
        </span>
        <span className="font-mono-tabular text-[10px] font-bold text-slate-300">
          {maxStormDoseMsv} mSv
        </span>
      </div>
    </div>
  );
}
