/**
 * CAD Risk Simulator — Medical Monitor Dashboard
 * ===============================================
 * Design: Exact match to CAD Monitor medical dashboard screenshot.
 * Fonts: Orbitron (Headings/Brand), JetBrains Mono (Numbers), Inter (Labels).
 * Preserves all logic, state, Zustand store, AnimatedButton, and AnimatedNumber.
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from './store/simStore';
import { PATIENT_PROFILES } from './store/profiles';
import { MockParams } from './hal/MockSensorSources';
import { SensorType } from './hal/ISensorSource';
import { usePipeline } from './hooks/usePipeline';
import { WEIGHTS } from './riskEngine';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { AnimatedNumber, AnimatedScore } from '@/components/ui/AnimatedNumber';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--red)';
  if (band === 'Moderate') return 'var(--amber)';
  return 'var(--trace)';
}

// ─── Live Clock Component ───────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono-val text-[11px] tabular-nums tracking-widest text-[var(--text-secondary)]">
      {t}
    </span>
  );
}

// ─── Waveform Chart (Green Trace on Grid) ───────────────────────────────────

interface WPt { t: number; v: number; }

function WaveformChart({ bufferKey, color = '#00d97e', yMin = -0.5, yMax = 1.5 }: {
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

    // Grid pattern (Vengence / Medical monitor style)
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let gy = H / 4; gy < H; gy += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    for (let gx = W / 10; gx < W; gx += W / 10) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }

    const range = yMax - yMin;
    const toY = (v: number) => H - ((v - yMin) / range) * H;
    const minT = buffer[0].t;
    const maxT = buffer[buffer.length - 1].t;
    const span = maxT - minT || 1;

    // Green Trace Line
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    buffer.forEach((p, i) => {
      const x = ((p.t - minT) / span) * W;
      const y = toY(p.v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [buffer, color, yMin, yMax]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

// ─── 270° Medical Risk Gauge ────────────────────────────────────────────────

function ArcGauge({ score, band }: { score: number; band: string }) {
  const color = getRiskColor(band);

  const R = 54, CX = 75, CY = 68;
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
    <div className="relative w-full h-full max-h-[120px] flex flex-col items-center justify-center">
      <svg viewBox="0 0 150 115" className="w-full h-full">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#1f293d"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${totalLength}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <AnimatedScore value={score} className="p-0 w-auto text-[32px] font-bold font-mono-val tracking-tight text-white" />
        <span className="text-[10px] font-mono-val text-[var(--text-tertiary)] font-medium mt-0.5">/ 100</span>
        <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-1" style={{ color }}>
          {band} RISK
        </span>
      </div>
    </div>
  );
}

// ─── Contribution Breakdown ───────────────────────────────────────────────────

const CONTRIB_PARAMS: { key: string; label: string; isLipid?: boolean }[] = [
  { key: 'bloodPressure',    label: 'BP' },
  { key: 'heartRate',        label: 'HR' },
  { key: 'hrv',              label: 'HRV' },
  { key: 'stress',           label: 'STRESS' },
  { key: 'qtInterval',       label: 'QTC' },
  { key: 'stSegment',        label: 'ST-SEG' },
  { key: 'totalCholesterol', label: 'CHOL*', isLipid: true },
  { key: 'triglycerides',    label: 'TRIG*', isLipid: true },
];

function ContribPanel() {
  const riskResult = useSimStore(s => s.riskResult);

  return (
    <div className="flex flex-col gap-2 p-3">
      {CONTRIB_PARAMS.map(({ key, label }) => {
        const raw = riskResult?.rawContributions[key as keyof typeof riskResult.rawContributions] ?? 0;
        const color = raw >= 65 ? 'var(--red)' : raw >= 35 ? 'var(--amber)' : 'var(--trace)';

        return (
          <div key={key} id={`contrib-${key}`}>
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono-val">
              <span className="text-[var(--text-secondary)] font-medium">
                {label}
              </span>
              <AnimatedNumber value={raw} className="text-[11px] font-bold" />
            </div>
            <div className="h-1 rounded-full bg-[#182030] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${raw}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 30-Sample Risk Trend Sparkline ──────────────────────────────────────────

function RiskTrend() {
  const riskTrend = useSimStore(s => s.riskTrend);

  const pts = useMemo(() => riskTrend.slice(-30).map((d, i) => ({ x: i, y: d.score })), [riskTrend]);

  if (pts.length < 2) return (
    <div className="w-full h-full flex items-center justify-center text-[11px] text-[var(--text-tertiary)] font-mono-val">
      Collecting telemetry…
    </div>
  );

  const W = 500, H = 32;
  const maxX = pts.length - 1 || 1;
  const toX = (i: number) => (i / maxX) * W;
  const toY = (v: number) => H - (v / 100) * H;

  const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.y)}`).join(' ');

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-hidden">
        {/* Dotted horizontal baseline */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
        <path d={dPath} fill="none" stroke="var(--trace)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Parameter Sliders ────────────────────────────────────────────────────────

const PARAM_SLIDERS: { key: keyof MockParams; label: string; unit: string; min: number; max: number; step: number; dec?: number }[] = [
  { key: 'heartRate',   label: 'HEART RATE',   unit: 'bpm',  min: 30,   max: 220, step: 1 },
  { key: 'systolic',    label: 'BP SYSTOLIC',  unit: 'mmHg', min: 70,   max: 220, step: 1 },
  { key: 'diastolic',   label: 'BP DIASTOLIC', unit: 'mmHg', min: 40,   max: 140, step: 1 },
  { key: 'hrv',         label: 'HRV RMSSD',    unit: 'ms',   min: 5,    max: 150, step: 1 },
  { key: 'stressScore', label: 'STRESS',       unit: '0–100',min: 0,    max: 100, step: 1 },
  { key: 'stSegment',   label: 'ST SEGMENT',   unit: 'mV',   min: -0.5, max: 0.5, step: 0.01, dec: 2 },
  { key: 'qtInterval',  label: 'QT INTERVAL',  unit: 'ms',   min: 280,  max: 600, step: 5 },
];

function ParamSlider({ cfg }: { cfg: typeof PARAM_SLIDERS[0] }) {
  const { params, setParams } = useSimStore(useShallow(s => ({ params: s.params, setParams: s.setParams })));
  const value = params[cfg.key] as number;
  const pct = Math.max(0, Math.min(100, ((value - cfg.min) / (cfg.max - cfg.min)) * 100));

  const [localVal, setLocalVal] = useState<string>(cfg.dec !== undefined ? value.toFixed(cfg.dec) : String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(cfg.dec !== undefined ? value.toFixed(cfg.dec) : String(value));
    }
  }, [value, isFocused, cfg.dec]);

  const onChange = useCallback((v: number) => {
    setParams({ [cfg.key]: Math.max(cfg.min, Math.min(cfg.max, v)) });
  }, [setParams, cfg]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalVal(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v >= cfg.min && v <= cfg.max) {
      setParams({ [cfg.key]: v });
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const v = parseFloat(localVal);
    if (isNaN(v)) {
      setLocalVal(cfg.dec !== undefined ? value.toFixed(cfg.dec) : String(value));
    } else {
      const clamped = Math.max(cfg.min, Math.min(cfg.max, v));
      setParams({ [cfg.key]: clamped });
      setLocalVal(cfg.dec !== undefined ? clamped.toFixed(cfg.dec) : String(clamped));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] font-medium">
        <span className="eyebrow-label">{cfg.label}</span>
        <div className="flex items-center gap-1 font-mono-val">
          <input
            id={`input-${cfg.key}`}
            type="number" min={cfg.min} max={cfg.max} step={cfg.step}
            value={localVal}
            onFocus={() => setIsFocused(true)}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-12 bg-[var(--surface-0)] border border-[var(--border)] rounded px-1 text-right text-[10px] font-bold text-white outline-none"
          />
          <span className="text-[9px] text-[var(--text-tertiary)]">{cfg.unit}</span>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#182030]">
        <input
          id={`slider-${cfg.key}`}
          type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
              onChange(v);
              setLocalVal(cfg.dec !== undefined ? v.toFixed(cfg.dec) : String(v));
            }
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -top-1.5"
        />
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'var(--trace)' }}
        />
      </div>
    </div>
  );
}

// ─── Header Top Bar (CAD MONITOR Logo + Centered AnimatedButtons) ────────────

function TopBar() {
  const { activeProfile, applyProfile, randomize, riskResult } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile, applyProfile: s.applyProfile,
    randomize: s.randomize, riskResult: s.riskResult,
  })));

  const band = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const scoreColor = getRiskColor(band);

  return (
    <header className="h-12 flex items-center justify-between px-4 bg-[var(--surface-0)] border-b border-[var(--border)] shrink-0 z-10">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="live-dot" />
        <span className="font-display text-[13px] font-extrabold tracking-[0.14em] uppercase text-white">
          CAD MONITOR
        </span>
      </div>

      {/* Centered Preset Profile Buttons */}
      <div className="flex-1 flex justify-center items-center px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
          {PATIENT_PROFILES.map(p => {
            const active = activeProfile?.id === p.id;
            return (
              <AnimatedButton
                key={p.id} id={`profile-${p.id}`}
                onClick={() => applyProfile(p.id)}
                className={cn(
                  'px-3 py-1 text-[11px] font-medium h-7 rounded border transition-colors',
                  active
                    ? 'bg-[var(--trace-dim)] border-[var(--trace)] text-[var(--trace)] font-semibold'
                    : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)] hover:text-white'
                )}
              >
                {p.name}
              </AnimatedButton>
            );
          })}
          <AnimatedButton
            id="btn-randomize"
            onClick={randomize}
            className="px-3.5 py-1 text-[11px] font-semibold h-7 bg-[var(--surface-1)] text-white border border-[var(--border)] hover:border-[var(--trace)]"
          >
            Randomize
          </AnimatedButton>
        </div>
      </div>

      {/* Right Metrics */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 font-display text-[12px] font-bold">
          <span className="text-[var(--text-secondary)]">RISK</span>
          <span style={{ color: scoreColor }}>{score}</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-1.5">
          <div className="live-dot" />
          <span className="font-mono-val text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">LIVE</span>
        </div>
        <LiveClock />
      </div>
    </header>
  );
}

// ─── Main Application Layout ─────────────────────────────────────────────────

export default function App() {
  usePipeline();

  const snapshot   = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);

  const band  = riskResult?.band  ?? 'Low';
  const score = riskResult?.score ?? 0;

  const lipidConf    = riskResult?.lipidConfidence ?? 1.0;
  const lipidLowConf = lipidConf < 0.70;

  const sensorList: { type: SensorType; label: string; sub: string; isDegraded?: boolean }[] = [
    { type: 'ecg',    label: 'ECG',          sub: 'SIM' },
    { type: 'ppg',    label: 'PPG',          sub: 'SIM', isDegraded: lipidLowConf },
    { type: 'bp',     label: 'BP / PTT',     sub: 'SIM' },
    { type: 'stress', label: 'STRESS / EDA', sub: 'SIM' },
    { type: 'ppg',    label: 'MOTION',       sub: 'SIM' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden select-none">
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left Column: Sensors & Sim Controls ───────────────────────── */}
        <aside className="w-56 flex flex-col shrink-0 bg-[var(--surface-0)] border-r border-[var(--border)] overflow-y-auto">
          {/* Sensors */}
          <div className="p-3">
            <div className="eyebrow-label mb-2">SENSORS</div>
            <div className="flex flex-col gap-2">
              {sensorList.map((s, idx) => (
                <div key={idx} className="panel-card p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: s.isDegraded ? 'var(--amber)' : 'var(--trace)' }}
                    />
                    <span className="font-mono-val text-[11px] font-bold text-white">{s.label}</span>
                  </div>
                  <span className="font-mono-val text-[8px] text-[var(--text-tertiary)]">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--border)] mx-3" />

          {/* Simulation Parameters */}
          <div className="p-3 flex-1">
            <div className="eyebrow-label mb-3">PARAMETERS</div>
            <div className="flex flex-col gap-3">
              {PARAM_SLIDERS.map(cfg => <ParamSlider key={cfg.key} cfg={cfg} />)}
            </div>
          </div>
        </aside>

        {/* ── Center Column: Waveforms, Vitals, Lipid Section ───────────── */}
        <main className="flex-1 flex flex-col gap-3 p-3 min-w-0 overflow-y-auto">

          {/* Stacked Waveforms (ECG & PPG) */}
          <div className="flex-[1.4] flex flex-col gap-3 min-h-[220px]">
            {/* ECG */}
            <div className="flex-1 panel-card p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="live-dot" />
                  <span className="eyebrow-label text-white">ECG — LEAD II</span>
                </div>
                <span className="font-mono-val text-[9px] text-[var(--text-tertiary)]">25 MM/S · 10 MM/MV</span>
              </div>
              <div className="flex-1 relative min-h-0">
                <WaveformChart bufferKey="ecgBuffer" color="#00d97e" yMin={-0.5} yMax={1.5} />
              </div>
            </div>

            {/* PPG */}
            <div className="flex-1 panel-card p-3 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--trace)]" />
                  <span className="eyebrow-label text-white">PPG — OPTICAL</span>
                </div>
                <span className="font-mono-val text-[9px] text-[var(--text-tertiary)]">100 HZ</span>
              </div>
              <div className="flex-1 relative min-h-0">
                <WaveformChart bufferKey="ppgBuffer" color="#00d97e" yMin={0} yMax={1.2} />
              </div>
            </div>
          </div>

          {/* Primary Vitals Cards */}
          <div className="grid grid-cols-3 gap-3 min-h-[90px]">
            <div id="readout-bp" className="panel-card p-3 flex flex-col justify-between">
              <span className="eyebrow-label">BLOOD PRESSURE</span>
              <div className="font-mono-val text-[18px] font-bold text-white my-0.5">
                {snapshot ? `${snapshot.systolic}` : '—'}
                <span className="text-[12px] font-normal text-[var(--text-tertiary)]"> / {snapshot ? snapshot.diastolic : '—'}</span>
              </div>
              <span className="text-[11px] font-mono-val text-[var(--trace)]">
                {snapshot && snapshot.systolic >= 140 ? 'Hypertensive' : snapshot && snapshot.systolic >= 130 ? 'Elevated' : 'Normal - mmHg'}
              </span>
            </div>

            <div id="readout-stress" className="panel-card p-3 flex flex-col justify-between">
              <span className="eyebrow-label">STRESS INDEX</span>
              <div className="font-mono-val text-[18px] font-bold text-white my-0.5 flex items-baseline gap-1">
                <AnimatedNumber value={snapshot ? Math.round(snapshot.stressScore) : 0} className="font-mono-val text-[18px] font-bold text-white" />
                <span className="text-[12px] font-normal text-[var(--text-tertiary)]">/ 100</span>
              </div>
              <span className="text-[11px] font-mono-val text-[var(--trace)]">
                {snapshot && snapshot.stressScore > 70 ? 'High' : snapshot && snapshot.stressScore > 40 ? 'Moderate' : 'Low'}
              </span>
            </div>

            <div id="metric-hrv" className="panel-card p-3 flex flex-col justify-between">
              <span className="eyebrow-label">HRV RMSSD</span>
              <div className="font-mono-val text-[18px] font-bold text-white my-0.5 flex items-baseline gap-1">
                <AnimatedNumber value={snapshot ? Math.round(snapshot.hrv) : 0} className="font-mono-val text-[18px] font-bold text-white" />
                <span className="text-[12px] font-normal text-[var(--text-tertiary)]">ms</span>
              </div>
              <span className="text-[11px] font-mono-val text-[var(--trace)]">
                {snapshot && snapshot.hrv < 20 ? 'Low' : 'Healthy'}
              </span>
            </div>
          </div>

          {/* Lipid Sub-section (Distinct Panel-Alt Style) */}
          <div className="grid grid-cols-2 gap-3 min-h-[90px]">
            <div id="readout-cholesterol" className="panel-card-alt p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="eyebrow-label text-[var(--text-secondary)]">TOTAL CHOLESTEROL (EST.)</span>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: lipidLowConf ? 'var(--amber)' : 'var(--trace)' }} />
              </div>

              <div className="font-mono-val text-[18px] font-bold text-white my-0.5 flex items-baseline gap-1">
                <AnimatedNumber value={snapshot?.totalCholesterol ?? 0} className="font-mono-val text-[18px] font-bold text-white" />
                <span className="text-[12px] font-normal text-[var(--text-tertiary)]">mg/dL</span>
              </div>

              <span className="text-[11px] font-mono-val" style={{ color: lipidLowConf ? 'var(--amber)' : 'var(--trace)' }}>
                {lipidLowConf ? 'low confidence — motion detected' : 'Borderline · PPG est.'}
              </span>
            </div>

            <div id="readout-triglycerides" className="panel-card-alt p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="eyebrow-label text-[var(--text-secondary)]">TRIGLYCERIDES (EST.)</span>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: lipidLowConf ? 'var(--amber)' : 'var(--trace)' }} />
              </div>

              <div className="font-mono-val text-[18px] font-bold text-white my-0.5 flex items-baseline gap-1">
                <AnimatedNumber value={snapshot?.triglycerides ?? 0} className="font-mono-val text-[18px] font-bold text-white" />
                <span className="text-[12px] font-normal text-[var(--text-tertiary)]">mg/dL</span>
              </div>

              <span className="text-[11px] font-mono-val" style={{ color: lipidLowConf ? 'var(--amber)' : 'var(--trace)' }}>
                {lipidLowConf ? 'low confidence — motion detected' : 'Normal · PPG est.'}
              </span>
            </div>
          </div>
        </main>

        {/* ── Right Column: Risk Gauge, Contributions, Vital Scalars ─────── */}
        <aside className="w-60 flex flex-col shrink-0 bg-[var(--surface-0)] border-l border-[var(--border)] overflow-y-auto">
          {/* CAD Risk Gauge Card */}
          <div className="panel-card m-3 p-3 flex flex-col items-center">
            <span className="eyebrow-label self-start mb-1">CAD RISK SCORE</span>
            <ArcGauge score={score} band={band} />
            <span className="text-[9px] font-mono-val text-[var(--text-tertiary)] mt-1">100% confidence</span>
          </div>

          {/* Contributions Panel */}
          <div className="px-3 mb-1">
            <span className="eyebrow-label">CONTRIBUTIONS</span>
          </div>
          <div className="panel-card mx-3 mb-3 flex-1 overflow-y-auto">
            <ContribPanel />
            <div className="px-3 pb-2 text-[8px] font-mono-val text-[var(--text-tertiary)]">
              * PPG morphology estimate — not lab-measured
            </div>
          </div>

          {/* Right Column Vital Cards */}
          {snapshot && (
            <div className="px-3 pb-3 flex flex-col gap-2 shrink-0">
              <div id="right-hr" className="panel-card p-2 flex items-center justify-between">
                <div>
                  <div className="eyebrow-label">HEART RATE</div>
                  <div className="font-mono-val text-[14px] font-bold text-white">
                    {snapshot.heartRate} <span className="text-[9px] font-normal text-[var(--text-tertiary)]">BPM</span>
                  </div>
                </div>
                <span className="font-mono-val text-[10px] text-[var(--trace)] font-bold">NSR</span>
              </div>

              <div id="right-qtc" className="panel-card p-2 flex items-center justify-between">
                <div>
                  <div className="eyebrow-label">QTC BAZETT</div>
                  <div className="font-mono-val text-[14px] font-bold text-white">
                    {snapshot.qtcBazett} <span className="text-[9px] font-normal text-[var(--text-tertiary)]">MS</span>
                  </div>
                </div>
                <span className="font-mono-val text-[10px] text-[var(--trace)] font-bold">NORMAL</span>
              </div>

              <div id="right-st" className="panel-card p-2 flex items-center justify-between">
                <div>
                  <div className="eyebrow-label">ST SEGMENT</div>
                  <div className="font-mono-val text-[14px] font-bold text-white">
                    {snapshot.stSegment.toFixed(2)} <span className="text-[9px] font-normal text-[var(--text-tertiary)]">MV</span>
                  </div>
                </div>
                <span className="font-mono-val text-[10px] text-[var(--trace)] font-bold">ISOELECTRIC</span>
              </div>

              <div id="right-ptt" className="panel-card p-2 flex items-center justify-between">
                <span className="eyebrow-label">PULSE TRANSIT</span>
                <span className="font-mono-val text-[11px] font-bold text-white">{snapshot.pulseTransitTime} ms</span>
              </div>

              <div id="right-spo2" className="panel-card p-2 flex items-center justify-between">
                <span className="eyebrow-label">SPO₂ (OPTICAL)</span>
                <span className="font-mono-val text-[11px] font-bold text-[var(--trace)]">98%</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Bottom Strip: CAD Risk Trend ────────────────────────────────── */}
      <footer className="h-12 flex items-center px-4 bg-[var(--surface-0)] border-t border-[var(--border)] shrink-0 gap-4">
        <div className="shrink-0 flex items-center gap-3">
          <span className="eyebrow-label">CAD RISK TREND</span>
          <div className="flex items-center gap-1.5 font-display text-[12px] font-bold">
            <span className="text-white">{score}</span>
            <span style={{ color: getRiskColor(band) }}>{band.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex-1 h-7 min-w-0">
          <RiskTrend />
        </div>
      </footer>
    </div>
  );
}
