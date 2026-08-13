/**
 * LiveWaveforms — Full Live Waveform View
 * =========================================
 * Stacked panels: ECG (180px canvas) + PPG (150px canvas)
 * with header rows, derived value chips, bottom readout row
 * (BP, Stress Index, HRV RMSSD), and Lipid Estimates strip.
 *
 * UI PASS ONLY — reuses the existing WaveformChart from App.tsx inline,
 * reads from Zustand store. No new logic.
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { useSimStore } from '../../store/simStore';
import { classifyBP } from '../../lib/bpRanges';

// ── Inline WaveformChart (same as App.tsx, no glow) ──────────────────────────

interface WPt { t: number; v: number; }

function WaveformCanvas({ bufferKey, color, yMin = -0.5, yMax = 1.5 }: {
  bufferKey: 'ecgBuffer' | 'ppgBuffer'; color?: string; yMin?: number; yMax?: number;
}) {
  const buffer = useSimStore(s => s[bufferKey] as WPt[]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || buffer.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W === 0 || H === 0) return;

    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, W, H);

    // Read colors dynamically from CSS variables at draw time
    const computed = getComputedStyle(document.documentElement);
    const traceColor = color || computed.getPropertyValue('--accent').trim() || '#4A9DFF';
    const borderColor = computed.getPropertyValue('--border').trim() || '#27272A';

    // Faint --border grid lines
    ctx.strokeStyle = borderColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let gy = H / 4; gy < H; gy += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    for (let gx = W / 10; gx < W; gx += W / 10) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    const range = yMax - yMin;
    const toY = (v: number) => H - ((v - yMin) / range) * H;
    const minT = buffer[0].t;
    const maxT = buffer[buffer.length - 1].t;
    const span = maxT - minT || 1;

    // Accent trace — no glow, no shadow
    ctx.beginPath();
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    buffer.forEach((p, i) => {
      const x = ((p.t - minT) / span) * W;
      const y = toY(p.v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [buffer, color, yMin, yMax]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

// ── Derived Value Chip ───────────────────────────────────────────────────────

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="wf-chip">
      <span className="wf-chip-label">{label}</span>
      <span className="wf-chip-value">{value}</span>
    </div>
  );
}

// ── Risk helpers ─────────────────────────────────────────────────────────────

function bpStatusLabel(sys: number): { label: string; color: string } {
  if (sys >= 140) return { label: 'Hypertensive', color: 'var(--risk-high)' };
  if (sys >= 130) return { label: 'Elevated', color: 'var(--risk-moderate)' };
  return { label: 'Normal', color: 'var(--risk-low)' };
}

function stressStatusLabel(s: number): { label: string; color: string } {
  if (s > 70) return { label: 'High', color: 'var(--risk-high)' };
  if (s > 40) return { label: 'Moderate', color: 'var(--risk-moderate)' };
  return { label: 'Low', color: 'var(--risk-low)' };
}

function hrvStatusLabel(hrv: number): { label: string; color: string } {
  if (hrv < 20) return { label: 'Low', color: 'var(--risk-moderate)' };
  return { label: 'Healthy', color: 'var(--risk-low)' };
}

// ── Component ────────────────────────────────────────────────────────────────

export function LiveWaveforms() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);

  const hr   = snapshot?.heartRate ?? 0;
  const qtc  = snapshot?.qtcBazett ?? 0;
  const st   = snapshot?.stSegment ?? 0;
  const sys  = snapshot?.systolic ?? 120;
  const dia  = snapshot?.diastolic ?? 80;
  const hrvVal = snapshot?.hrv ?? 0;
  const stress = snapshot?.stressScore ?? 0;
  const ptt  = snapshot?.pulseTransitTime ?? 0;

  const totalChol = snapshot?.totalCholesterol ?? 0;
  const trigs = snapshot?.triglycerides ?? 0;

  const lipidConf = riskResult?.lipidConfidence ?? 1.0;
  const lipidLowConf = lipidConf < 0.70;

  const bpInfo = classifyBP(sys, dia);
  const str = stressStatusLabel(stress);
  const hrv = hrvStatusLabel(hrvVal);

  // ApoB panel values from store (lab-derived)
  const apoBPanel = useSimStore(s => s.apoBPanel);
  const labInputs = useSimStore(s => s.labInputs);

  return (
    <div className="live-waveforms-view">
      {/* ── ECG Waveform Panel ─────────────────────────────────────── */}
      <div className="panel-card wf-panel">
        <div className="wf-header">
          <span className="wf-sensor-name">ECG — LEAD II</span>
          <span className="wf-specs">25 mm/s · 10 mm/mV</span>
        </div>
        <div className="wf-canvas wf-canvas-ecg">
          <WaveformCanvas bufferKey="ecgBuffer" color="#4A9DFF" yMin={-0.5} yMax={1.5} />
        </div>
        <div className="wf-chips-row">
          <Chip label="HR" value={`${hr} BPM`} />
          <Chip label="QTc" value={`${qtc} ms`} />
          <Chip label="ST" value={`${st.toFixed(2)} mV`} />
          <Chip label="PTT" value={`${ptt} ms`} />
        </div>
      </div>

      {/* ── PPG Waveform Panel ─────────────────────────────────────── */}
      <div className="panel-card wf-panel">
        <div className="wf-header">
          <span className="wf-sensor-name">PPG — OPTICAL</span>
          <span className="wf-specs">100 Hz</span>
        </div>
        <div className="wf-canvas wf-canvas-ppg">
          <WaveformCanvas bufferKey="ppgBuffer" color="#4A9DFF" yMin={0} yMax={1.2} />
        </div>
        <div className="wf-chips-row">
          <Chip label="HR" value={`${hr} BPM`} />
          <Chip label="SpO₂" value="98%" />
          <Chip label="Perfusion" value="Normal" />
        </div>
      </div>

      {/* ── Bottom Readout Row ─────────────────────────────────────── */}
      <div className="wf-readout-row">
        {/* Blood Pressure */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">Blood Pressure</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {sys}/{dia} <span className="dash-stat-unit">mmHg</span>
          </span>
          <span className="dash-stat-sub" style={{ color: bpInfo.color }}>
            {bpInfo.label}
          </span>
          <div className="mt-1 pt-1 border-t border-[var(--border)] text-[10px] text-[var(--text-tertiary)] flex flex-col gap-0.5">
            <span style={{ color: 'var(--risk-low)' }}>Healthy: &lt;120/80 mmHg</span>
            <span style={{ color: sys >= 130 || dia >= 80 ? 'var(--risk-high)' : 'var(--text-tertiary)' }}>
              Risk Threshold: ≥130/80 mmHg
            </span>
          </div>
        </div>

        {/* Stress Index */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">Stress Index</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(stress)} <span className="dash-stat-unit">/ 100</span>
          </span>
          <span className="dash-stat-sub" style={{ color: str.color }}>
            {str.label}
          </span>
        </div>

        {/* HRV RMSSD */}
        <div className="panel-card dash-stat-card">
          <span className="dash-stat-label">HRV RMSSD</span>
          <span className="dash-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(hrvVal)} <span className="dash-stat-unit">ms</span>
          </span>
          <span className="dash-stat-sub" style={{ color: hrv.color }}>
            {hrv.label}
          </span>
        </div>
      </div>

      {/* ── Lipid Estimates Strip ──────────────────────────────────── */}
      <div className="panel-card wf-lipid-strip">
        <div className="dash-panel-header">LIPID ESTIMATES</div>
        <div className="wf-lipid-grid">
          {/* Left column */}
          <div className="wf-lipid-col">
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">TOTAL CHOLESTEROL (EST.)</span>
              <span className="wf-lipid-value">{Math.round(totalChol)}</span>
              <span className="wf-lipid-sub">
                {lipidLowConf ? 'Low confidence — motion' : 'PPG est.'}
              </span>
            </div>
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">TRIGLYCERIDES (EST.)</span>
              <span className="wf-lipid-value">{Math.round(trigs)}</span>
              <span className="wf-lipid-sub">
                {lipidLowConf ? 'Low confidence — motion' : 'PPG est.'}
              </span>
            </div>
          </div>

          {/* Right column */}
          <div className="wf-lipid-col">
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">APOB</span>
              <span className="wf-lipid-value">{apoBPanel?.apoB?.toFixed(0) ?? '—'}</span>
              <span className="wf-lipid-sub">Calculated</span>
            </div>
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">LDL</span>
              <span className="wf-lipid-value">{apoBPanel?.ldl?.toFixed(0) ?? '—'}</span>
              <span className="wf-lipid-sub">Calculated</span>
            </div>
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">HDL</span>
              <span className="wf-lipid-value">{labInputs?.hdl?.toFixed(0) ?? '—'}</span>
              <span className="wf-lipid-sub">Calculated</span>
            </div>
            <div className="wf-lipid-item">
              <span className="wf-lipid-label">NON-HDL</span>
              <span className="wf-lipid-value">{apoBPanel?.nonHDL?.toFixed(0) ?? '—'}</span>
              <span className="wf-lipid-sub">Calculated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
