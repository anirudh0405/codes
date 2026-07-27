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
import { PRESET_CATEGORIES, SCENARIO_PRESETS, PresetCategory } from './presets';
import { MockParams } from './hal/MockSensorSources';
import { SensorType } from './hal/ISensorSource';
import { usePipeline } from './hooks/usePipeline';
import { WEIGHTS } from './riskEngine';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { AnimatedNumber, AnimatedScore } from '@/components/ui/AnimatedNumber';
import { ApoBCard } from '@/components/Dashboard/ApoBCard';
import { PatientProfilePanel } from '@/components/Dashboard/PatientProfilePanel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--alert-red)';
  if (band === 'Moderate') return 'var(--alert-amber)';
  return 'var(--accent)';
}

// ─── Tooltip Descriptions ────────────────────────────────────────────────────

const TOOLTIPS: Record<string, string> = {
  heartRate: 'Number of heartbeats per minute, derived from the ECG or PPG waveform.',
  systolic: 'Pressure in the arteries when the heart contracts and pumps blood \u2014 the higher of the two BP numbers.',
  diastolic: 'Pressure in the arteries when the heart rests between beats \u2014 the lower of the two BP numbers.',
  hrv: 'Variation in time between heartbeats. Higher HRV generally reflects better cardiovascular and autonomic health.',
  stress: 'Estimated physiological stress level, derived from HRV and skin-response proxies. Higher values indicate greater stress.',
  stSegment: 'Portion of the ECG waveform between heartbeats. Deviation from baseline can indicate reduced blood flow to the heart muscle.',
  qtInterval: 'Time the heart\u2019s electrical system takes to activate and reset each beat. Abnormally long or short values can indicate rhythm risk.',
  motion: 'Simulated accelerometer signal. Detects whether a cardiac reading coincides with movement, helping distinguish real events from motion artifacts.',
  totalCholesterol: 'Estimated from PPG waveform shape (pulse wave morphology) \u2014 not a direct lab measurement. Confidence drops if motion affects signal quality.',
  triglycerides: 'Estimated from PPG waveform shape, similar to the cholesterol estimate \u2014 an experimental, non-clinical approximation.',
  cadRiskScore: 'A 0\u2013100 composite score combining all sensor contributions below, weighted by how strongly each parameter is associated with coronary risk in this model.',
  contribution: 'How many points this parameter added to the total CAD Risk Score this cycle.',
  confidence: 'How reliable this reading is right now \u2014 lower when the signal may be affected by motion or noise.',
  bloodPressure: 'Systolic and diastolic arterial pressure. Sustained elevation is a major modifiable risk factor for coronary artery disease.',
};

// ─── InfoTooltip Component ───────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, positionAbove: true });
  const ref = useRef<HTMLDivElement>(null);
  const isTouchRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const positionAbove = rect.top > 110;
    let left = rect.left + rect.width / 2;
    const viewportWidth = window.innerWidth;
    if (left < 130) left = 130;
    if (left > viewportWidth - 130) left = viewportWidth - 130;

    const top = positionAbove ? rect.top - 6 : rect.bottom + 6;
    setCoords({ top, left, positionAbove });
  }, []);

  // Close on outside click/tap or scroll
  useEffect(() => {
    if (!open) return;
    const handleClose = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => {
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClose);
    document.addEventListener('touchstart', handleClose);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('touchstart', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleMouseEnter = () => {
    if (isTouchRef.current) return;
    updatePosition();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    setOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setOpen(prev => !prev);
  };

  const handleTouchStart = () => {
    isTouchRef.current = true;
  };

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      style={{ marginLeft: 'var(--space-xs)' }}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center shrink-0 outline-none"
        style={{
          width: '14px',
          height: '14px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        aria-label="Info"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.7" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed z-[9999]"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.positionAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            width: 'max-content',
            maxWidth: '240px',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: '1.45',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 'normal',
            fontWeight: 400,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
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
  { key: 'apoB',             label: 'ApoB' },
  { key: 'bloodPressure',    label: 'BP' },
  { key: 'smoking',          label: 'Smoking' },
  { key: 'stress',           label: 'Stress' },
  { key: 'heartRate',        label: 'HR' },
  { key: 'hrv',              label: 'HRV' },
  { key: 'qtInterval',       label: 'QTc' },
  { key: 'stSegment',        label: 'ST-Seg' },
  { key: 'totalCholesterol', label: 'Chol*', isLipid: true },
  { key: 'triglycerides',    label: 'Trig*',  isLipid: true },
];

const CONTRIB_TOOLTIP = TOOLTIPS.contribution;

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
              <span className="flex items-center" style={{ color: 'var(--text-secondary)' }}>{label}<InfoTooltip text={CONTRIB_TOOLTIP} /></span>
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

const PARAM_SLIDERS: { key: keyof MockParams; label: string; unit: string; min: number; max: number; step: number; dec?: number; tipKey: string }[] = [
  { key: 'heartRate',   label: 'Heart Rate',   unit: 'bpm',   min: 30,   max: 220, step: 1, tipKey: 'heartRate' },
  { key: 'systolic',    label: 'BP Systolic',  unit: 'mmHg',  min: 70,   max: 220, step: 1, tipKey: 'systolic' },
  { key: 'diastolic',   label: 'BP Diastolic', unit: 'mmHg',  min: 40,   max: 140, step: 1, tipKey: 'diastolic' },
  { key: 'hrv',         label: 'HRV RMSSD',    unit: 'ms',    min: 5,    max: 150, step: 1, tipKey: 'hrv' },
  { key: 'stressScore', label: 'Stress',       unit: '0\u2013100', min: 0,    max: 100, step: 1, tipKey: 'stress' },
  { key: 'stSegment',   label: 'ST Segment',   unit: 'mV',    min: -0.5, max: 0.5, step: 0.01, dec: 2, tipKey: 'stSegment' },
  { key: 'qtInterval',  label: 'QT Interval',  unit: 'ms',    min: 280,  max: 600, step: 5, tipKey: 'qtInterval' },
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
        <span className="eyebrow-label flex items-center">{cfg.label}<InfoTooltip text={TOOLTIPS[cfg.tipKey] ?? ''} /></span>
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <input
            id={`input-${cfg.key}`}
            type="number" min={cfg.min} max={cfg.max} step={cfg.step}
            inputMode="decimal"
            value={localVal}
            onFocus={() => setIsFocused(true)}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-14 md:w-12 rounded text-right text-[13px] md:text-[11px] font-medium tabular-nums outline-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: 'var(--space-sm) var(--space-xs)',
              minHeight: '44px',
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
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: '44px', top: '-20px' }}
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
  const {
    activeProfile,
    applyProfile,
    randomize,
    riskResult,
    selectedCategory,
    setSelectedCategory,
  } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile,
    applyProfile: s.applyProfile,
    randomize: s.randomize,
    riskResult: s.riskResult,
    selectedCategory: s.selectedCategory,
    setSelectedCategory: s.setSelectedCategory,
  })));

  const band = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const scoreColor = getRiskColor(band);

  const activeCategory = selectedCategory ?? 'healthy';

  const categoryPresets = useMemo(() => {
    return SCENARIO_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <header
      className="flex flex-col shrink-0 z-10"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        borderRadius: '8px 8px 0 0',
      }}
    >
      {/* Row 1: Brand + Status (always visible) */}
      <div
        className="flex items-center justify-between shrink-0 flex-wrap"
        style={{
          minHeight: '48px',
          padding: 'var(--space-xs) var(--space-lg)',
          gap: 'var(--space-sm)',
        }}
      >
        {/* Brand & Compact Sensor Indicator */}
        <div className="flex items-center shrink-0" style={{ gap: 'var(--space-md)' }}>
          <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
            <div className="live-dot" />
            <span
              className="text-[13px] font-bold tracking-[0.03em] uppercase"
              style={{ color: 'var(--text-primary)' }}
            >
              CAD (Coronary Artery Disease) Monitor
            </span>
          </div>

          {/* Compact Sensor Status Indicator */}
          <div
            className="hidden lg:flex items-center text-[10px] rounded px-2 py-0.5"
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              gap: 'var(--space-xs)',
              color: 'var(--text-secondary)',
            }}
            title="Sensors: ECG, PPG, BP, Stress, Motion (All Simulated)"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span>Sensors: Simulated (5/5)</span>
          </div>
        </div>

        {/* Grouped Preset Selectors — desktop (hidden on mobile, shown in Row 2) */}
        <div className="flex-1 justify-center items-center hidden md:flex" style={{ padding: '0 var(--space-md)' }}>
          <div className="flex items-center overflow-x-auto" style={{ gap: 'var(--space-sm)', padding: 'var(--space-xs) 0', scrollbarWidth: 'none' as any }}>
            {/* Top-Level Category Selector */}
            <div className="flex items-center shrink-0 rounded p-0.5" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', gap: '2px' }}>
              {PRESET_CATEGORIES.map(cat => {
                const isCatActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded transition-colors outline-none cursor-pointer"
                    style={{
                      background: isCatActive ? 'var(--accent)' : 'transparent',
                      color: isCatActive ? '#0A0A0B' : 'var(--text-secondary)',
                      border: 'none',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />

            {/* Sub-Scenario Buttons within active category */}
            <div className="flex items-center overflow-x-auto" style={{ gap: 'var(--space-xs)', scrollbarWidth: 'none' as any }}>
              {categoryPresets.map(p => {
                const active = activeProfile?.id === p.id;
                return (
                  <AnimatedButton
                    key={p.id} id={`profile-${p.id}`}
                    onClick={() => applyProfile(p.id)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium h-7 rounded transition-colors whitespace-nowrap',
                      active ? 'border-[var(--accent)] font-semibold' : 'border-[var(--border)]'
                    )}
                    style={active
                      ? { background: 'rgba(74,157,255,0.12)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                      : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }
                  >
                    {p.name}
                  </AnimatedButton>
                );
              })}
            </div>

            <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />

            {/* Randomize with Category Scope Label */}
            <div className="flex items-center shrink-0" style={{ gap: 'var(--space-xs)' }}>
              <AnimatedButton
                id="btn-randomize"
                onClick={randomize}
                className="px-3 py-1 text-[11px] font-semibold h-7 rounded border-0 whitespace-nowrap"
                style={{ background: 'var(--accent)', color: '#0A0A0B', border: 'none' }}
                title={`Randomize parameters within ${activeCategory === 'cad' ? 'CAD' : 'Healthy'} scope`}
              >
                Randomize ({activeCategory === 'cad' ? 'CAD' : 'Healthy'})
              </AnimatedButton>
              <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                Scope: {activeCategory === 'cad' ? 'CAD' : 'Healthy'}
              </span>
            </div>
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
      </div>

      {/* Row 2: Grouped preset buttons — mobile only (scrollable horizontal row) */}
      <div
        className="flex md:hidden flex-col"
        style={{
          padding: 'var(--space-xs) var(--space-md) var(--space-sm)',
          gap: 'var(--space-xs)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Level 1 Category Tabs Mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PRESET_CATEGORIES.map(cat => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={`m-cat-${cat.id}`}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="px-2.5 py-1 text-[10px] font-semibold rounded shrink-0 outline-none"
                style={{
                  background: isCatActive ? 'var(--accent)' : 'var(--surface-alt)',
                  color: isCatActive ? '#0A0A0B' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Level 2 Scenario Buttons Mobile */}
        <div className="flex mobile-preset-scroll" style={{ gap: 'var(--space-sm)' }}>
          {categoryPresets.map(p => {
            const active = activeProfile?.id === p.id;
            return (
              <AnimatedButton
                key={`m-${p.id}`} id={`m-profile-${p.id}`}
                onClick={() => applyProfile(p.id)}
                className={cn(
                  'px-3 py-2 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0',
                  active
                    ? 'border-[var(--accent)] font-semibold'
                    : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                )}
                style={{
                  minHeight: '44px',
                  ...(active
                    ? { background: 'rgba(74,157,255,0.08)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                  ),
                }}
              >
                {p.name}
              </AnimatedButton>
            );
          })}
          <AnimatedButton
            id="m-btn-randomize"
            onClick={randomize}
            className="px-3.5 py-2 text-[11px] font-semibold rounded border-0 whitespace-nowrap shrink-0"
            style={{ minHeight: '44px', background: 'var(--accent)', color: '#0A0A0B', border: 'none' }}
          >
            Randomize ({activeCategory === 'cad' ? 'CAD' : 'Healthy'})
          </AnimatedButton>
        </div>
      </div>
    </header>
  );
}

// ─── Main Application Layout ─────────────────────────────────────────────────

export default function App() {
  usePipeline();

  const snapshot     = useSimStore(s => s.snapshot);
  const riskResult   = useSimStore(s => s.riskResult);
  const bpMode       = useSimStore(s => s.bpMode);
  const setBPMode    = useSimStore(s => s.setBPMode);
  const pttDerivedBP = useSimStore(s => s.pttDerivedBP);

  const band  = riskResult?.band  ?? 'Low';
  const score = riskResult?.score ?? 0;

  const lipidConf    = riskResult?.lipidConfidence ?? 1.0;
  const lipidLowConf = lipidConf < 0.70;

  const sensorList: { type: SensorType; label: string; sub: string; isDegraded?: boolean; tipKey?: string }[] = [
    { type: 'ecg',    label: 'ECG',          sub: 'Simulated' },
    { type: 'ppg',    label: 'PPG',          sub: 'Simulated', isDegraded: lipidLowConf },
    { type: 'bp',     label: 'Blood Pressure', sub: 'Simulated' },
    { type: 'stress', label: 'Stress / EDA', sub: 'Simulated' },
    { type: 'ppg',    label: 'Motion',       sub: 'Simulated', tipKey: 'motion' },
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
      className="w-screen flex flex-col select-none h-auto min-h-screen md:h-screen md:overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)', padding: 'var(--space-md)' }}
    >
      <style>{`
        @media (min-width: 769px) {
          .dashboard-grid {
            display: grid;
            grid-template-columns: 224px 1fr 256px;
            grid-template-rows: 1fr auto auto;
            min-height: 0;
            flex: 1;
          }
          .dashboard-grid > * {
            min-height: 0;
          }
          /* Desktop: restore outer padding */
          .dashboard-root {
            padding: var(--space-lg) !important;
          }
          /* Desktop: column wrappers become visible flex columns */
          .right-col-wrapper {
            display: flex !important;
            flex-direction: column;
            grid-column: 3;
            grid-row: 1 / -1;
            overflow-y: auto;
            border-radius: 8px;
          }
          /* Remove inner borders on desktop since wrapper provides them */
          .right-col-wrapper > .right-col-section {
            border: none !important;
            border-radius: 0 !important;
          }
          .left-col-wrapper {
            display: flex !important;
            flex-direction: column;
            grid-column: 1;
            grid-row: 1 / -1;
            overflow-y: auto;
            border-radius: 8px;
          }
          .left-col-wrapper > .left-col-section {
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <TopBar />

      {/* ── Dashboard Grid: 3-col desktop, 1-col stacked mobile ──────── */}
      <div
        className="dashboard-grid flex flex-col overflow-y-auto md:overflow-hidden mobile-section-gap"
        style={{ gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}
      >

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN wrapper — on desktop: normal column container
            On mobile: display:contents so children order independently
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="contents right-col-wrapper"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >

          {/* SECTION: CAD Risk Gauge (mobile order-1 — headline number) */}
          <div
            className="order-1 rounded-lg right-col-section"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="panel-card flex flex-col items-center"
              style={{ background: 'var(--surface-alt)', margin: 'var(--space-md)', padding: 'var(--space-md)' }}
            >
              <span className="eyebrow-label self-start flex items-center" style={{ marginBottom: 'var(--space-sm)' }}>CAD Risk Score<InfoTooltip text={TOOLTIPS.cadRiskScore} /></span>
              <ArcGauge score={score} band={band} />
              <span className="text-[10px] flex items-center" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                Confidence: {Math.round(lipidConf * 100)}%<InfoTooltip text={TOOLTIPS.confidence} />
              </span>
            </div>

            {/* WHO 10-Year CVD Risk Band Card */}
            <div
              className="panel-card flex flex-col"
              style={{ background: 'var(--surface-alt)', margin: '0 var(--space-md) var(--space-sm)', padding: 'var(--space-sm) var(--space-md)' }}
            >
              <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 'var(--space-xs)', gap: '4px' }}>
                <span className="eyebrow-label">WHO 10-Year CVD Risk Band</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  WHO South Asia non-lab chart
                </span>
              </div>
              <div className="flex items-baseline justify-between" style={{ marginTop: 'var(--space-xs)' }}>
                <span className="text-[15px] font-bold tabular-nums" style={{ color: riskResult?.whoRiskBand?.color ?? 'var(--accent)' }}>
                  {riskResult?.whoRiskBand?.band ?? '<10%'}
                </span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {riskResult?.whoRiskBand?.tier ?? 'Low'}
                </span>
              </div>
              <div className="text-[9px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Age: {riskResult?.whoRiskBand?.ageBand ?? '50–54'} · SBP: {riskResult?.whoRiskBand?.sbpBand ?? '<120'} · BMI: {riskResult?.whoRiskBand?.bmiBand ?? '20–24.9'}
              </div>
            </div>

            {/* Research & Educational Non-Diagnostic Disclaimer */}
            <div
              className="text-[10px] leading-tight px-3 pb-3 text-center"
              style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}
            >
              Risk scoring combines an internal composite model with the WHO South Asia screening chart for reference; this is a research/educational simulation, not a diagnostic tool.
            </div>
          </div>

          {/* SECTION: Contributions (mobile order-7 — near bottom) */}
          <div
            className="order-7 rounded-lg right-col-section md:flex-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div style={{ padding: 'var(--space-md) var(--space-md) var(--space-sm)' }}>
              <span className="eyebrow-label">Contributions</span>
            </div>
            <div className="panel-card overflow-y-auto" style={{ margin: '0 var(--space-md) var(--space-md)' }}>
              <ContribPanel />
              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)', padding: '0 var(--space-md) var(--space-sm)' }}>
                * PPG morphology estimate — not lab-measured
              </div>
            </div>
          </div>

          {/* SECTION: Right Column Vital Scalars (mobile order-8 — after contributions) */}
          {snapshot && (
            <div
              className="order-8 rounded-lg right-col-section"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex flex-col shrink-0" style={{ padding: 'var(--space-md)', gap: 'var(--space-sm)' }}>
                <div id="right-hr" className="panel-card flex items-center justify-between" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                  <div>
                    <div className="eyebrow-label flex items-center">Heart Rate<InfoTooltip text={TOOLTIPS.heartRate} /></div>
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
                    <div className="eyebrow-label flex items-center">QTc Bazett<InfoTooltip text={TOOLTIPS.qtInterval} /></div>
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
                    <div className="eyebrow-label flex items-center">ST Segment<InfoTooltip text={TOOLTIPS.stSegment} /></div>
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
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2 (mobile order-2): ECG Waveform
            Desktop: center column
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="order-2 md:order-none md:col-start-2 md:row-start-1 flex flex-col min-w-0"
          style={{ gap: 'var(--space-md)' }}
        >
          {/* ECG */}
          <div className="panel-card flex flex-col min-h-[120px] md:min-h-0 md:flex-1" style={{ padding: 'var(--space-md) var(--space-md) var(--space-md) var(--space-lg)' }}>
            <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 'var(--space-sm)', gap: 'var(--space-xs)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <div className="live-dot" />
                <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>ECG — Lead II</span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>25 mm/s · 10 mm/mV</span>
            </div>
            <div className="flex-1 relative min-h-[80px] md:min-h-0" style={{ padding: 'var(--space-sm) 0' }}>
              <WaveformChart bufferKey="ecgBuffer" color="#4A9DFF" yMin={-0.5} yMax={1.5} />
            </div>
          </div>

          {/* PPG */}
          <div className="panel-card flex flex-col min-h-[120px] md:min-h-0 md:flex-1" style={{ padding: 'var(--space-md) var(--space-md) var(--space-md) var(--space-lg)' }}>
            <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 'var(--space-sm)', gap: 'var(--space-xs)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--accent)' }}
                />
                <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>PPG — Optical</span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>100 Hz</span>
            </div>
            <div className="flex-1 relative min-h-[80px] md:min-h-0" style={{ padding: 'var(--space-sm) 0' }}>
              <WaveformChart bufferKey="ppgBuffer" color="#4A9DFF" yMin={0} yMax={1.2} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3 (mobile order-3): Sensor Status
            Desktop: left column, top half
           ═══════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN wrapper — on desktop: normal column container
            On mobile: display:contents so sensors and params order independently
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="contents left-col-wrapper"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* SECTION: Patient Profile (mobile order-4 — replaces old Sensors panel) */}
          <div
            className="order-4 rounded-lg left-col-section"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <PatientProfilePanel />
          </div>

          {/* SECTION: Simulation Parameters (mobile order-5) */}
          <div
            className="order-5 rounded-lg left-col-section md:flex-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1" style={{ padding: 'var(--space-md)' }}>
              <div className="eyebrow-label" style={{ marginBottom: 'var(--space-md)' }}>Parameters</div>
              <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                {PARAM_SLIDERS.map(cfg => <ParamSlider key={cfg.key} cfg={cfg} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4 (mobile order-4): Vitals readout cards
            Desktop: center column (below waveforms)
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="order-6 md:col-start-2 md:row-start-2"
        >
          {/* Primary Vitals Row */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-md)' }}>
            {/* Blood Pressure */}
            <div id="readout-bp" className="panel-card flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
              <div className="flex items-center justify-between">
                <span className="eyebrow-label flex items-center">Blood Pressure<InfoTooltip text={TOOLTIPS.bloodPressure} /></span>
                <button
                  type="button"
                  onClick={() => setBPMode(bpMode === 'ptt' ? 'manual' : 'ptt')}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase transition-colors outline-none cursor-pointer"
                  style={{
                    background: bpMode === 'ptt' ? 'rgba(74,157,255,0.12)' : 'var(--surface-alt)',
                    color: bpMode === 'ptt' ? 'var(--accent)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                  title="Toggle between PTT-derived optical estimation and manual slider override"
                >
                  {bpMode === 'ptt' ? 'PTT-derived' : 'Manual override'}
                </button>
              </div>
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
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium" style={{ color: bp.color }}>{bp.label}</span>
                {bpMode === 'ptt' && (
                  <span
                    className="text-[10px]"
                    style={{ color: pttDerivedBP?.motionArtifactFlag ? 'var(--alert-amber)' : 'var(--text-tertiary)' }}
                  >
                    {pttDerivedBP?.motionArtifactFlag ? 'Motion detected' : `PTT ${snapshot?.pulseTransitTime ?? 220} ms`}
                  </span>
                )}
              </div>
            </div>

            {/* Stress Index */}
            <div id="readout-stress" className="panel-card flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
              <span className="eyebrow-label flex items-center">Stress Index<InfoTooltip text={TOOLTIPS.stress} /></span>
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
              <span className="eyebrow-label flex items-center">HRV RMSSD<InfoTooltip text={TOOLTIPS.hrv} /></span>
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
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5 (mobile order-5): Lipid Estimates
            Desktop: center column (below vitals)
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="order-6 md:col-start-2 md:row-start-3"
        >
          <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
            <div className="eyebrow-label">Lipid Estimates — PPG derived</div>
            {/* Motion annotation when confidence is low */}
            {lipidLowConf && (
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Readings affected by motion — confidence reduced
              </p>
            )}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {/* Total Cholesterol */}
              <div id="readout-cholesterol" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
                <div className="flex items-center justify-between">
                  <span className="eyebrow-label flex items-center">Total Cholesterol (est.)<InfoTooltip text={TOOLTIPS.totalCholesterol} /></span>
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
                  <span className="eyebrow-label flex items-center">Triglycerides (est.)<InfoTooltip text={TOOLTIPS.triglycerides} /></span>
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

              {/* ApoB (est.) — full-width below the two PPG estimates */}
              <div className="md:col-span-2">
                <ApoBCard />
              </div>
            </div>
          </div>
        </div>

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
