/**
 * CAD Risk Simulator — Medical Monitor Dashboard
 * ===============================================
 * Design: Black minimalist professional monitoring UI.
 * Font: Inter only (tabular-nums for all numeric readouts).
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
  if (band === 'High') return 'var(--alert-red)';
  if (band === 'Moderate') return 'var(--alert-amber)';
  return 'var(--accent)';
}

// ─── Live Clock Component ───────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      className="tabular-nums text-[11px] tracking-widest"
      style={{ color: 'var(--text-secondary)' }}
    >
      {t}
    </span>
  );
}

// ─── Waveform Chart (Accent trace on grid) ───────────────────────────────────

interface WPt { t: number; v: number; }

function WaveformChart({ bufferKey, color = '#4A9DFF', yMin = -0.5, yMax = 1.5 }: {
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

    // Subtle grid lines — border color at low opacity
    ctx.strokeStyle = 'rgba(38,39,42,0.8)';
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

    // Clean accent trace — no glow, no shadow
    ctx.beginPath();
    ctx.strokeStyle = color;
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

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

// ─── 270° Risk Gauge ─────────────────────────────────────────────────────────

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
          stroke="var(--border)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${totalLength}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <AnimatedScore
          value={score}
          className="p-0 w-auto tabular-nums text-[30px] font-bold text-[var(--text-primary)]"
        />
        <span
          className="text-[10px] mt-0.5 tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
        >
          / 100
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.04em] mt-1"
          style={{ color }}
        >
          {band} Risk
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
  { key: 'stress',           label: 'Stress' },
  { key: 'qtInterval',       label: 'QTc' },
  { key: 'stSegment',        label: 'ST-Seg' },
  { key: 'totalCholesterol', label: 'Chol*', isLipid: true },
  { key: 'triglycerides',    label: 'Trig*',  isLipid: true },
];

function ContribPanel() {
  const riskResult = useSimStore(s => s.riskResult);

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-sm)', padding: 'var(--space-md)' }}>
      {CONTRIB_PARAMS.map(({ key, label }) => {
        const raw = riskResult?.rawContributions[key as keyof typeof riskResult.rawContributions] ?? 0;
        const barColor = raw >= 65 ? 'var(--alert-red)' : raw >= 35 ? 'var(--alert-amber)' : 'var(--accent)';

        return (
          <div key={key} id={`contrib-${key}`}>
            <div className="flex items-center justify-between text-[11px]" style={{ marginBottom: 'var(--space-xs)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>
                <AnimatedNumber value={raw} className="text-[11px] font-medium" />
              </span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${raw}%`, background: barColor }}
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
    <div
      className="w-full h-full flex items-center justify-center text-[11px]"
      style={{ color: 'var(--text-tertiary)' }}
    >
      Collecting data…
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
        {/* Midline reference */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeDasharray="4 4" />
        <path d={dPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Parameter Sliders ────────────────────────────────────────────────────────

const PARAM_SLIDERS: { key: keyof MockParams; label: string; unit: string; min: number; max: number; step: number; dec?: number }[] = [
  { key: 'heartRate',   label: 'Heart Rate',   unit: 'bpm',   min: 30,   max: 220, step: 1 },
  { key: 'systolic',    label: 'BP Systolic',  unit: 'mmHg',  min: 70,   max: 220, step: 1 },
  { key: 'diastolic',   label: 'BP Diastolic', unit: 'mmHg',  min: 40,   max: 140, step: 1 },
  { key: 'hrv',         label: 'HRV RMSSD',    unit: 'ms',    min: 5,    max: 150, step: 1 },
  { key: 'stressScore', label: 'Stress',       unit: '0–100', min: 0,    max: 100, step: 1 },
  { key: 'stSegment',   label: 'ST Segment',   unit: 'mV',    min: -0.5, max: 0.5, step: 0.01, dec: 2 },
  { key: 'qtInterval',  label: 'QT Interval',  unit: 'ms',    min: 280,  max: 600, step: 5 },
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
    <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
      <div className="flex items-center justify-between">
        <span className="eyebrow-label">{cfg.label}</span>
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <input
            id={`input-${cfg.key}`}
            type="number" min={cfg.min} max={cfg.max} step={cfg.step}
            value={localVal}
            onFocus={() => setIsFocused(true)}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-12 rounded text-right text-[11px] font-medium tabular-nums outline-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '2px var(--space-xs)',
            }}
          />
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{cfg.unit}</span>
        </div>
      </div>
      {/* Slider track */}
      <div className="relative h-[3px] rounded-full" style={{ background: 'var(--border)' }}>
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
          style={{ width: `${pct}%`, background: 'var(--accent)' }}
        />
      </div>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  const { activeProfile, applyProfile, randomize, riskResult } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile, applyProfile: s.applyProfile,
    randomize: s.randomize, riskResult: s.riskResult,
  })));

  const band = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const scoreColor = getRiskColor(band);

  return (
    <header
      className="flex items-center justify-between shrink-0 z-10"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        height: '48px',
        padding: '0 var(--space-lg)',
        borderRadius: '8px 8px 0 0',
      }}
    >
      {/* Brand */}
      <div className="flex items-center shrink-0" style={{ gap: 'var(--space-sm)' }}>
        <div className="live-dot" />
        <span
          className="text-[13px] font-semibold tracking-[0.04em] uppercase"
          style={{ color: 'var(--text-primary)' }}
        >
          CAD Monitor
        </span>
      </div>

      {/* Patient Profile Selectors */}
      <div className="flex-1 flex justify-center items-center" style={{ padding: '0 var(--space-lg)' }}>
        <div className="flex items-center overflow-x-auto" style={{ gap: 'var(--space-sm)', padding: 'var(--space-xs) 0', scrollbarWidth: 'none' as any }}>
          {PATIENT_PROFILES.map(p => {
            const active = activeProfile?.id === p.id;
            return (
              <AnimatedButton
                key={p.id} id={`profile-${p.id}`}
                onClick={() => applyProfile(p.id)}
                className={cn(
                  'px-3 py-1 text-[11px] font-medium h-7 rounded transition-colors',
                  active
                    ? 'border-[var(--accent)] font-semibold'
                    : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                )}
                style={active
                  ? { background: 'rgba(74,157,255,0.08)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                }
              >
                {p.name}
              </AnimatedButton>
            );
          })}
          {/* Primary CTA — accent fill */}
          <AnimatedButton
            id="btn-randomize"
            onClick={randomize}
            className="px-3.5 py-1 text-[11px] font-semibold h-7 rounded border-0"
            style={{ background: 'var(--accent)', color: '#0A0A0B', border: 'none' }}
          >
            Randomize
          </AnimatedButton>
        </div>
      </div>

      {/* Right — risk score + sim status + clock */}
      <div className="flex items-center shrink-0" style={{ gap: 'var(--space-md)' }}>
        <div className="flex items-center text-[12px] font-semibold tabular-nums" style={{ gap: 'var(--space-xs)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Risk</span>
          <span style={{ color: scoreColor }}>{score}</span>
        </div>
        <div className="w-px h-4" style={{ background: 'var(--border)' }} />
        <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
          <div className="live-dot" />
          <span
            className="text-[10px] uppercase tracking-[0.04em]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Live
          </span>
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
    { type: 'ecg',    label: 'ECG',          sub: 'Simulated' },
    { type: 'ppg',    label: 'PPG',          sub: 'Simulated', isDegraded: lipidLowConf },
    { type: 'bp',     label: 'Blood Pressure', sub: 'Simulated' },
    { type: 'stress', label: 'Stress / EDA', sub: 'Simulated' },
    { type: 'ppg',    label: 'Motion',       sub: 'Simulated' },
  ];

  // BP status label
  function bpStatus(sys: number) {
    if (sys >= 140) return { label: 'Hypertensive', color: 'var(--alert-red)' };
    if (sys >= 130) return { label: 'Elevated',     color: 'var(--alert-amber)' };
    return { label: 'Normal',                        color: 'var(--accent)' };
  }

  // Stress status label
  function stressStatus(s: number) {
    if (s > 70) return { label: 'High',     color: 'var(--alert-red)' };
    if (s > 40) return { label: 'Moderate', color: 'var(--alert-amber)' };
    return { label: 'Low',                  color: 'var(--accent)' };
  }

  // HRV status
  function hrvStatus(hrv: number) {
    return hrv < 20
      ? { label: 'Low', color: 'var(--alert-amber)' }
      : { label: 'Healthy', color: 'var(--accent)' };
  }

  const bp  = snapshot ? bpStatus(snapshot.systolic) : { label: 'Normal', color: 'var(--accent)' };
  const str = snapshot ? stressStatus(snapshot.stressScore) : { label: 'Low', color: 'var(--accent)' };
  const hrv = snapshot ? hrvStatus(snapshot.hrv) : { label: 'Healthy', color: 'var(--accent)' };

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden select-none"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)', padding: 'var(--space-lg)' }}
    >
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>

        {/* ── Left Column: Sensor Status + Sim Controls ───────────────── */}
        <aside
          className="w-56 flex flex-col shrink-0 overflow-y-auto rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Sensor Status */}
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="eyebrow-label" style={{ marginBottom: 'var(--space-sm)' }}>Sensors</div>
            <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
              {sensorList.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md"
                  style={{
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    padding: 'var(--space-sm) var(--space-md)',
                  }}
                >
                  <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: s.isDegraded ? 'var(--alert-amber)' : 'var(--accent)' }}
                    />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {s.label}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px" style={{ background: 'var(--border)', margin: '0 var(--space-md)' }} />

          {/* Simulation Parameters */}
          <div className="flex-1" style={{ padding: 'var(--space-md)' }}>
            <div className="eyebrow-label" style={{ marginBottom: 'var(--space-md)' }}>Parameters</div>
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              {PARAM_SLIDERS.map(cfg => <ParamSlider key={cfg.key} cfg={cfg} />)}
            </div>
          </div>
        </aside>

        {/* ── Center Column: Waveforms, Vitals, Lipids ─────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ gap: 'var(--space-md)' }}>

          {/* Stacked Waveform Panels */}
          <div className="flex-[1.4] flex flex-col min-h-[200px]" style={{ gap: 'var(--space-md)' }}>
            {/* ECG */}
            <div className="flex-1 panel-card flex flex-col min-h-0" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                  <div className="live-dot" />
                  <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>ECG — Lead II</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>25 mm/s · 10 mm/mV</span>
              </div>
              <div className="flex-1 relative min-h-0" style={{ padding: 'var(--space-sm) 0' }}>
                <WaveformChart bufferKey="ecgBuffer" color="#4A9DFF" yMin={-0.5} yMax={1.5} />
              </div>
            </div>

            {/* PPG */}
            <div className="flex-1 panel-card flex flex-col min-h-0" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>PPG — Optical</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>100 Hz</span>
              </div>
              <div className="flex-1 relative min-h-0" style={{ padding: 'var(--space-sm) 0' }}>
                <WaveformChart bufferKey="ppgBuffer" color="#4A9DFF" yMin={0} yMax={1.2} />
              </div>
            </div>
          </div>

          {/* Primary Vitals Row */}
          <div className="grid grid-cols-3" style={{ gap: 'var(--space-md)', minHeight: '100px' }}>
            {/* Blood Pressure */}
            <div id="readout-bp" className="panel-card flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
              <span className="eyebrow-label">Blood Pressure</span>
              <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}>
                <span
                  className="text-[18px] font-semibold tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {snapshot ? `${snapshot.systolic}` : '—'}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  / {snapshot ? snapshot.diastolic : '—'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>mmHg</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: bp.color }}>{bp.label}</span>
            </div>

            {/* Stress Index */}
            <div id="readout-stress" className="panel-card flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
              <span className="eyebrow-label">Stress Index</span>
              <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}>
                <AnimatedNumber
                  value={snapshot ? Math.round(snapshot.stressScore) : 0}
                  className="text-[18px] font-semibold tabular-nums"
                />
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: str.color }}>{str.label}</span>
            </div>

            {/* HRV */}
            <div id="metric-hrv" className="panel-card flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
              <span className="eyebrow-label">HRV RMSSD</span>
              <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}>
                <AnimatedNumber
                  value={snapshot ? Math.round(snapshot.hrv) : 0}
                  className="text-[18px] font-semibold tabular-nums"
                />
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>ms</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: hrv.color }}>{hrv.label}</span>
            </div>
          </div>

          {/* Lipid Estimates — surface-alt to distinguish as derived/estimated */}
          <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
            <div className="eyebrow-label">Lipid Estimates — PPG derived</div>
            {/* Motion annotation when confidence is low */}
            {lipidLowConf && (
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Readings affected by motion — confidence reduced
              </p>
            )}
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {/* Total Cholesterol */}
              <div id="readout-cholesterol" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
                <div className="flex items-center justify-between">
                  <span className="eyebrow-label">Total Cholesterol (est.)</span>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: lipidLowConf ? 'var(--alert-amber)' : 'var(--accent)' }}
                  />
                </div>
                <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}>
                  <AnimatedNumber
                    value={snapshot?.totalCholesterol ?? 0}
                    className="text-[18px] font-semibold tabular-nums"
                  />
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
                </div>
                <span
                  className="text-[11px]"
                  style={{ color: lipidLowConf ? 'var(--alert-amber)' : 'var(--text-secondary)' }}
                >
                  {lipidLowConf ? 'Low confidence — motion detected' : 'High confidence · PPG est.'}
                </span>
              </div>

              {/* Triglycerides */}
              <div id="readout-triglycerides" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
                <div className="flex items-center justify-between">
                  <span className="eyebrow-label">Triglycerides (est.)</span>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: lipidLowConf ? 'var(--alert-amber)' : 'var(--accent)' }}
                  />
                </div>
                <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}>
                  <AnimatedNumber
                    value={snapshot?.triglycerides ?? 0}
                    className="text-[18px] font-semibold tabular-nums"
                  />
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>mg/dL</span>
                </div>
                <span
                  className="text-[11px]"
                  style={{ color: lipidLowConf ? 'var(--alert-amber)' : 'var(--text-secondary)' }}
                >
                  {lipidLowConf ? 'Low confidence — motion detected' : 'High confidence · PPG est.'}
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* ── Right Column: CAD Risk Gauge + Contributions + Vitals ─────── */}
        <aside
          className="w-64 flex flex-col shrink-0 overflow-y-auto rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* CAD Risk Gauge */}
          <div
            className="panel-card flex flex-col items-center"
            style={{ background: 'var(--surface-alt)', margin: 'var(--space-md)', padding: 'var(--space-md)' }}
          >
            <span className="eyebrow-label self-start" style={{ marginBottom: 'var(--space-sm)' }}>CAD Risk Score</span>
            <ArcGauge score={score} band={band} />
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
              Confidence: {Math.round(lipidConf * 100)}%
            </span>
          </div>

          {/* Contributions */}
          <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <span className="eyebrow-label">Contributions</span>
          </div>
          <div className="panel-card flex-1 overflow-y-auto" style={{ margin: '0 var(--space-md) var(--space-md)' }}>
            <ContribPanel />
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)', padding: '0 var(--space-md) var(--space-sm)' }}>
              * PPG morphology estimate — not lab-measured
            </div>
          </div>

          {/* Right Column Vital Scalars */}
          {snapshot && (
            <div className="flex flex-col shrink-0" style={{ padding: '0 var(--space-md) var(--space-md)', gap: 'var(--space-sm)' }}>
              <div id="right-hr" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div>
                  <div className="eyebrow-label">Heart Rate</div>
                  <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                    <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {snapshot.heartRate}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>BPM</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--accent)' }}>NSR</span>
              </div>

              <div id="right-qtc" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div>
                  <div className="eyebrow-label">QTc Bazett</div>
                  <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                    <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {snapshot.qtcBazett}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>ms</span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.04em]"
                  style={{ color: snapshot.qtcBazett > 450 ? 'var(--alert-amber)' : 'var(--accent)' }}
                >
                  {snapshot.qtcBazett > 450 ? 'Prolonged' : 'Normal'}
                </span>
              </div>

              <div id="right-st" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div>
                  <div className="eyebrow-label">ST Segment</div>
                  <div className="flex items-baseline" style={{ gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                    <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {snapshot.stSegment.toFixed(2)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>mV</span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.04em]"
                  style={{ color: Math.abs(snapshot.stSegment) > 0.1 ? 'var(--alert-amber)' : 'var(--accent)' }}
                >
                  {Math.abs(snapshot.stSegment) > 0.1 ? 'Deviated' : 'Isoelectric'}
                </span>
              </div>

              <div id="right-ptt" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span className="eyebrow-label">Pulse Transit</span>
                <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {snapshot.pulseTransitTime} ms
                </span>
              </div>

              <div id="right-spo2" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <span className="eyebrow-label">SpO₂ (Optical)</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>98%</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Bottom Strip: Risk Trend Sparkline ──────────────────────────── */}
      <footer
        className="flex items-center shrink-0 rounded-lg"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          height: '48px',
          padding: '0 var(--space-lg)',
          marginTop: 'var(--space-md)',
          gap: 'var(--space-lg)',
        }}
      >
        <div className="shrink-0 flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <span className="eyebrow-label">CAD Risk Trend</span>
          <div className="flex items-center text-[12px] font-semibold tabular-nums" style={{ gap: 'var(--space-xs)' }}>
            <span style={{ color: 'var(--text-primary)' }}>{score}</span>
            <span style={{ color: getRiskColor(band) }}>{band}</span>
          </div>
        </div>
        <div className="flex-1 h-7 min-w-0">
          <RiskTrend />
        </div>
      </footer>
    </div>
  );
}
