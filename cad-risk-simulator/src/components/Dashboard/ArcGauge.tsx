/**
 * ArcGauge — SVG 270° arc gauge for CAD risk score
 * ==================================================
 * The arc sweeps from ~135° to ~405° (270° total), filled
 * proportionally by the 0–100 score using stroke-dashoffset.
 * Score and band label are rendered as SVG text in the centre.
 * Color transitions through --trace → --alert-amber → --alert-red
 * matching the risk band.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';

const R          = 70;              // arc radius
const CX         = 90;             // viewBox centre x
const CY         = 90;             // viewBox centre y
const START_DEG  = 135;            // arc start angle (degrees, clockwise from 3 o'clock)
const SWEEP_DEG  = 270;            // total sweep
const CIRCUMFERENCE = 2 * Math.PI * R;
const ARC_LEN    = (SWEEP_DEG / 360) * CIRCUMFERENCE;

/** Convert polar angle (degrees, clock convention) to Cartesian */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Build an SVG arc path string */
function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  const start  = polar(cx, cy, r, startDeg);
  const end    = polar(cx, cy, r, startDeg + sweepDeg);
  const large  = sweepDeg > 180 ? 1 : 0;
  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

function riskColor(band: string): string {
  if (band === 'High') return '#E5534B';
  if (band === 'Moderate') return '#E3A83B';
  return '#34D399';
}

// Tick marks at 0, 35, 65, 100
const TICKS = [
  { value: 0,   label: '0'  },
  { value: 35,  label: '35' },
  { value: 65,  label: '65' },
  { value: 100, label: '100'},
];

const TRACK_PATH = arcPath(CX, CY, R, START_DEG, SWEEP_DEG);

export function ArcGauge() {
  const riskResult = useSimStore(s => s.riskResult);
  const score      = riskResult?.score ?? 0;
  const band       = riskResult?.band  ?? 'Low';
  const color      = riskColor(band);

  // How much of the arc to fill
  const fillLen    = (score / 100) * ARC_LEN;
  const dashOffset = ARC_LEN - fillLen;

  return (
    <svg
      className="gauge-svg"
      viewBox="0 0 180 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`CAD Risk Score: ${score} — ${band}`}
    >
      {/* Track */}
      <path
        d={TRACK_PATH}
        className="gauge-track"
        strokeDasharray={`${ARC_LEN.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
        strokeDashoffset={0}
      />

      {/* Fill */}
      <path
        d={TRACK_PATH}
        className="gauge-fill"
        stroke={color}
        strokeDasharray={`${ARC_LEN.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
        strokeDashoffset={dashOffset}
      />

      {/* Score */}
      <text
        x={CX}
        y={CY - 8}
        className="gauge-score"
        fill={color}
      >
        {score}
      </text>

      {/* Denominator */}
      <text
        x={CX}
        y={CY + 14}
        className="gauge-denom"
      >
        / 100
      </text>

      {/* Band label */}
      <text
        x={CX}
        y={CY + 28}
        className="gauge-band"
        fill={color}
      >
        {band} Risk
      </text>

      {/* Tick labels */}
      {TICKS.map(({ value, label }) => {
        const angle = START_DEG + (value / 100) * SWEEP_DEG;
        const pt    = polar(CX, CY, R + 14, angle);
        return (
          <text
            key={value}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fontFamily="'IBM Plex Mono', monospace"
            fill="#6E737C"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
