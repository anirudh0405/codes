/**
 * RightPanelContent — Persistent Right Panel (UI Only)
 * =====================================================
 * Sections:
 *   1. CAD Risk Score — arc gauge (270°), score, band label, confidence
 *   2. WHO Risk Band — quieter reference card
 *   3. Contributions — per-parameter rows with bars
 *   4. Cardiac Readouts — compact rows with pill tags
 *
 * Mobile: collapses into a bottom-sheet overlay triggered by
 * the risk-score badge in the top bar.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { AnimatedScore, AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { classifyBP } from '../../lib/bpRanges';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--risk-high)';
  if (band === 'Moderate') return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

function getRiskBandLabel(band: string): string {
  if (band === 'High') return 'HIGH RISK';
  if (band === 'Moderate') return 'MODERATE';
  return 'LOW RISK';
}

// ── Section 1: Arc Gauge ─────────────────────────────────────────────────────

function RiskArcGauge({ score, band }: { score: number; band: string }) {
  const color = getRiskColor(band);
  const size = 160;
  const strokeWidth = 6;
  const R = (size - strokeWidth * 2) / 2;
  const CX = size / 2;
  const CY = size / 2;

  const startAngle = (135 * Math.PI) / 180;
  const totalAngle = (270 * Math.PI) / 180;
  const totalLength = R * totalAngle;
  const filledLength = (score / 100) * totalLength;

  const startX = CX + R * Math.cos(startAngle);
  const startY = CY + R * Math.sin(startAngle);
  const endAngle = startAngle + totalAngle;
  const endX = CX + R * Math.cos(endAngle);
  const endY = CY + R * Math.sin(endAngle);

  const trackPath = `M ${startX} ${startY} A ${R} ${R} 0 1 1 ${endX} ${endY}`;

  return (
    <div className="rp-arc-gauge">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="rp-arc-svg"
      >
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${totalLength}`}
          className="rp-arc-fill"
        />
      </svg>
      <div className="rp-arc-center">
        <AnimatedScore
          value={score}
          className="rp-arc-score tabular-nums"
        />
        <span className="rp-arc-band-label" style={{ color }}>
          {getRiskBandLabel(band)}
        </span>
      </div>
    </div>
  );
}

// ── Section 3: Contributions ─────────────────────────────────────────────────

const CONTRIB_ROWS: { key: keyof import('../../riskEngine').RiskContributions; label: string; isComposite?: boolean }[] = [
  { key: 'bloodPressure',    label: 'BP' },
  { key: 'heartRate',        label: 'HR' },
  { key: 'hrv',              label: 'HRV' },
  { key: 'stress',           label: 'Stress' },
  { key: 'qtInterval',       label: 'QTc' },
  { key: 'stSegment',        label: 'ST-Seg' },
  { key: 'apoB',             label: 'Metabolic-Vascular', isComposite: true },
  { key: 'smoking',          label: 'Smoking' },
  { key: 'totalCholesterol', label: 'TC (est.)' },
  { key: 'triglycerides',    label: 'TG (est.)' },
];

const CONTRIB_COLORS = [
  '#ef4444',
  '#38bdf8',
  '#f59e0b',
  '#22c55e',
  '#a78bfa',
  '#f472b6',
  '#14b8a6',
  '#fb923c',
  '#818cf8',
  '#34d399',
];

function ContributionsSection() {
  const riskResult = useSimStore(s => s.riskResult);

  const pieData = useMemo(() => {
    const values = CONTRIB_ROWS.map(({ key, label, isComposite }, index) => {
      const val = riskResult?.contributions ? (riskResult.contributions[key] ?? 0) : 0;
      const color = CONTRIB_COLORS[index % CONTRIB_COLORS.length];

      return {
        key,
        label,
        isComposite,
        value: Math.max(val, 0),
        color,
      };
    });

    return values.filter(item => item.value > 0);
  }, [riskResult]);

  const scoreDisplay = Math.round(riskResult?.score ?? 0);

  const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null; // Hide labels on tiny slices (<5%) to prevent visual clutter
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fontWeight={600}
        fontFamily="var(--font-ui)"
        style={{ paintOrder: 'stroke', stroke: 'rgba(10, 15, 20, 0.55)', strokeWidth: 2 }}
      >
        {name}
        <tspan x={x} dy={10}>{`${Math.round(percent * 100)}%`}</tspan>
      </text>
    );
  };

  return (
    <div className="rp-contributions">
      <div className="rp-contrib-chart-wrap">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie
              data={pieData.length > 0 ? pieData : [{ key: 'empty', label: 'None', value: 1, color: 'var(--border)' }]}
              dataKey="value"
              nameKey="label"
              innerRadius={30}
              outerRadius={56}
              paddingAngle={pieData.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              cornerRadius={4}
              label={pieData.length > 0 ? renderSliceLabel : false}
              labelLine={false}
            >
              {(pieData.length > 0 ? pieData : [{ key: 'empty', label: 'None', value: 1, color: 'var(--border)' }]).map(entry => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="rp-contrib-chart-center"
            >
              <tspan x="50%" dy="-4">RISK</tspan>
              <tspan x="50%" dy="14" className="tabular-nums">{scoreDisplay}</tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rp-contrib-legend">
        {pieData.map(({ key, label, isComposite, value, color }) => (
          <div key={key} className="rp-contrib-legend-row">
            <span className="rp-contrib-legend-item">
              <span className="rp-contrib-legend-dot" style={{ background: color }} />
              <span className="rp-contrib-label">
                {isComposite && <span className="rp-contrib-sigma">∑</span>}
                {label}
              </span>
            </span>
            <span className="rp-contrib-value tabular-nums">
              <AnimatedNumber value={value} className="rp-contrib-value-inner" /> pts
            </span>
          </div>
        ))}
      </div>

      <div className="rp-contrib-footnote">
        * Weighted contribution points toward 0–100 CAD Risk Score
      </div>
    </div>
  );
}

// ── Section 4: Cardiac Readouts ──────────────────────────────────────────────

export function CardiacReadouts() {
  const snapshot = useSimStore(s => s.snapshot);
  const activeEcgRhythm = useSimStore(s => s.activeEcgRhythm);
  const activeDiseaseParams = useSimStore(s => s.activeDiseaseParams);

  if (!snapshot) return null;

  const qtcLabel = snapshot.qtcBazett > 450 ? 'PROLONGED' : 'NORMAL';
  const qtcTagColor = snapshot.qtcBazett > 450 ? 'var(--risk-moderate)' : undefined;

  const stLabel = Math.abs(snapshot.stSegment) > 0.1 ? 'DEVIATED' : 'ISOELECTRIC';
  const stTagColor = Math.abs(snapshot.stSegment) > 0.1 ? 'var(--risk-moderate)' : undefined;

  const bpInfo = classifyBP(snapshot.systolic, snapshot.diastolic);

  // Dynamic rhythm tag based on active ECG rhythm
  let rhythmTag = 'NSR';
  let rhythmTagColor: string | undefined;
  if (activeEcgRhythm === 'afib') {
    rhythmTag = 'AF';
    rhythmTagColor = 'var(--risk-high)';
  } else if (activeEcgRhythm === 'sinus-tachycardia') {
    rhythmTag = 'SINUS TACHY';
    rhythmTagColor = 'var(--risk-moderate)';
  }

  // Dynamic SpO₂ from CVD disease parameters, fallback to 98%
  let spo2Value = '98%';
  let spo2Color = 'var(--risk-low)';
  if (activeDiseaseParams && activeDiseaseParams['SpO₂']) {
    spo2Value = String(activeDiseaseParams['SpO₂']);
    const numericSpo2 = parseInt(spo2Value, 10);
    if (!isNaN(numericSpo2)) {
      if (numericSpo2 < 93) spo2Color = 'var(--risk-high)';
      else if (numericSpo2 < 96) spo2Color = 'var(--risk-moderate)';
    }
  }

  const readouts: {
    label: string;
    value: string;
    tag?: string;
    tagColor?: string;
    valueColor?: string;
  }[] = [
    {
      label: 'BLOOD PRESSURE',
      value: `${snapshot.systolic}/${snapshot.diastolic} mmHg`,
      tag: bpInfo.shortLabel.toUpperCase(),
      tagColor: bpInfo.color,
    },
    {
      label: 'HEART RATE',
      value: `${snapshot.heartRate} BPM`,
      tag: rhythmTag,
      tagColor: rhythmTagColor,
    },
    {
      label: 'QTC BAZETT',
      value: `${snapshot.qtcBazett} ms`,
      tag: qtcLabel,
      tagColor: qtcTagColor,
    },
    {
      label: 'ST SEGMENT',
      value: `${snapshot.stSegment.toFixed(2)} mV`,
      tag: stLabel,
      tagColor: stTagColor,
    },
    {
      label: 'PULSE TRANSIT',
      value: `${snapshot.pulseTransitTime} ms`,
    },
    {
      label: 'SPO₂ (OPTICAL)',
      value: spo2Value,
      valueColor: spo2Color,
    },
  ];

  return (
    <div className="rp-cardiac-readouts">
      {readouts.map(({ label, value, tag, tagColor, valueColor }) => (
        <div key={label} className="rp-readout-row">
          <span className="rp-readout-label">{label}</span>
          <div className="rp-readout-right">
            <span
              className="rp-readout-value tabular-nums"
              style={valueColor ? { color: valueColor } : undefined}
            >
              {value}
            </span>
            {tag && (
              <span
                className="rp-readout-tag"
                style={tagColor ? { color: tagColor, borderColor: tagColor } : undefined}
              >
                {tag}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mobile Bottom Sheet ──────────────────────────────────────────────────────

export function MobileRiskBadge({ onTap }: { onTap: () => void }) {
  const riskResult = useSimStore(s => s.riskResult);
  const score = riskResult?.score ?? 0;
  const band = riskResult?.band ?? 'Low';

  return (
    <button
      type="button"
      className="rp-fab"
      onClick={onTap}
      aria-label="Open risk panel"
    >
      {score}
    </button>
  );
}

function MobileBottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="rp-bottom-sheet-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        className="rp-bottom-sheet"
        onClick={e => e.stopPropagation()}
      >
        <div className="rp-bottom-sheet-handle-row">
          <div className="rp-bottom-sheet-handle" />
          <button
            type="button"
            className="rp-bottom-sheet-close"
            onClick={onClose}
            aria-label="Close risk panel"
          >
            ✕
          </button>
        </div>
        <div className="rp-bottom-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main Export: RightPanelContent ────────────────────────────────────────────

export function RightPanelContent() {
  const riskResult = useSimStore(s => s.riskResult);
  const band = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const lipidConf = riskResult?.lipidConfidence ?? 1.0;

  return (
    <div className="rp-content">
      {/* ── Section 1: CAD Risk Score ──────────────────────────────── */}
      <section className="rp-section rp-section-gauge">
        <span className="rp-section-label">CAD RISK SCORE</span>
        <RiskArcGauge score={score} band={band} />
        <span className="rp-confidence tabular-nums">
          Confidence: {Math.round(lipidConf * 100)}%
        </span>
      </section>

      {/* ── Section 2: Contributions ──────────────────────────────── */}
      <section className="rp-section rp-section-contributions">
        <span className="rp-section-label">CONTRIBUTIONS</span>
        <ContributionsSection />
      </section>
    </div>
  );
}

// ── Mobile-aware wrapper used by AppShell ────────────────────────────────────

export function RightPanelMobileWrapper() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const close = useCallback(() => setSheetOpen(false), []);
  const open = useCallback(() => setSheetOpen(true), []);

  return (
    <>
      {/* Badge visible only on mobile — in topbar */}
      <MobileRiskBadge onTap={open} />
      <MobileBottomSheet open={sheetOpen} onClose={close}>
        <RightPanelContent />
      </MobileBottomSheet>
    </>
  );
}
