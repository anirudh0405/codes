import React, { useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from './store/simStore';
import { PATIENT_PROFILES } from './store/profiles';
import { MockParams } from './hal/MockSensorSources';
import { SensorType } from './hal/ISensorSource';
import { usePipeline } from './hooks/usePipeline';
import { SweepWaveform } from './components/Dashboard/SweepWaveform';
import { ArcGauge } from './components/Dashboard/ArcGauge';
import { ContributionBreakdown } from './components/Dashboard/ContributionBreakdown';
import { RiskTrend } from './components/Dashboard/RiskTrend';

// ─── Live clock ─────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="live-clock">{time}</span>;
}

// ─── Top bar ────────────────────────────────────────────────

function TopBar() {
  const { activeProfile, applyProfile, randomize, riskResult } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile,
    applyProfile:  s.applyProfile,
    randomize:     s.randomize,
    riskResult:    s.riskResult,
  })));

  const band  = riskResult?.band  ?? 'Low';
  const score = riskResult?.score ?? 0;

  // Determine which risk variant the active profile implies
  function profileVariant(profileId: string): string {
    if (profileId === 'atrial-concern' || profileId === 'high-stress-low-hrv') return 'high';
    if (profileId === 'borderline-hypertensive' || profileId === 'post-exercise') return 'moderate';
    return '';
  }

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <svg className="topbar-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="2,12 6,12 8,4 10,20 12,10 14,14 16,12 22,12" />
        </svg>
        <span className="topbar-title">CAD Monitor</span>
      </div>

      <div className="topbar-sep" />

      {/* Profile chips */}
      <div className="profile-strip">
        {PATIENT_PROFILES.map(p => {
          const isActive  = activeProfile?.id === p.id;
          const variant   = isActive ? profileVariant(p.id) : '';
          return (
            <button
              key={p.id}
              id={`profile-${p.id}`}
              className={`profile-chip${isActive ? ' active' : ''}${variant ? ' ' + variant : ''}`}
              onClick={() => applyProfile(p.id)}
              title={p.description}
            >
              {p.name}
            </button>
          );
        })}
        <button
          id="btn-randomize"
          className="btn-randomize"
          onClick={randomize}
        >
          Randomize
        </button>
      </div>

      {/* Right status */}
      <div className="topbar-status">
        <div
          className={`topbar-risk${band === 'High' ? ' high' : band === 'Moderate' ? ' moderate' : ''}`}
          id="topbar-risk-display"
        >
          RISK&nbsp;{score}
        </div>
        <div className="topbar-sep" />
        <div className="status-pill">
          <div className="status-dot-sm" />
          LIVE
        </div>
        <LiveClock />
      </div>
    </header>
  );
}

// ─── Sensor status (in sidebar) ─────────────────────────────

const SENSOR_NAMES: Record<SensorType, string> = {
  ecg:    'ECG',
  ppg:    'PPG',
  bp:     'BP / PTT',
  stress: 'STRESS / EDA',
};

function SensorStatusList() {
  const sensorStatus = useSimStore(s => s.sensorStatus);

  return (
    <div className="sensor-list">
      <div className="sidebar-section-label">Sensors</div>
      {(Object.keys(SENSOR_NAMES) as SensorType[]).map(type => {
        const status = sensorStatus[type];
        return (
          <div key={type} className="sensor-row" id={`sensor-row-${type}`}>
            <div className={`sensor-dot ${status}`} />
            <div className="sensor-info">
              <div className="sensor-name-label">{SENSOR_NAMES[type]}</div>
              <div className="sensor-mode-label">
                {status === 'simulated' ? 'SIM' : status === 'connected' ? 'BLE' : status.toUpperCase()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Parameter sliders (in sidebar) ─────────────────────────

const PARAM_CONFIGS: {
  key: keyof MockParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}[] = [
  { key: 'heartRate',   label: 'Heart Rate',  unit: 'bpm',   min: 30,   max: 200,  step: 1  },
  { key: 'systolic',    label: 'BP Systolic',  unit: 'mmHg',  min: 70,   max: 220,  step: 1  },
  { key: 'diastolic',   label: 'BP Diastolic', unit: 'mmHg',  min: 40,   max: 140,  step: 1  },
  { key: 'hrv',         label: 'HRV RMSSD',    unit: 'ms',    min: 5,    max: 150,  step: 1  },
  { key: 'stressScore', label: 'Stress',       unit: '0–100', min: 0,    max: 100,  step: 1  },
  { key: 'stSegment',   label: 'ST Segment',   unit: 'mV',    min: -0.3, max: 0.5,  step: 0.01, decimals: 2 },
  { key: 'qtInterval',  label: 'QT Interval',  unit: 'ms',    min: 280,  max: 600,  step: 5  },
];

function ParamSliders() {
  const { params, setParams } = useSimStore(useShallow(s => ({
    params:    s.params,
    setParams: s.setParams,
  })));

  const handleChange = useCallback((key: keyof MockParams, val: number) => {
    setParams({ [key]: val });
  }, [setParams]);

  return (
    <div className="param-controls">
      <div className="sidebar-section-label" style={{ paddingTop: 10 }}>Parameters</div>
      {PARAM_CONFIGS.map(cfg => {
        const value = params[cfg.key] as number;
        const display = cfg.decimals !== undefined ? value.toFixed(cfg.decimals) : String(value);

        return (
          <div key={cfg.key} className="param-item">
            <div className="param-label-row">
              <span className="param-label">{cfg.label}</span>
              <span className="param-readout">
                {display}
                <span style={{ fontSize: '8px', color: 'var(--text-muted)', marginLeft: 2, letterSpacing: '0.06em' }}>
                  {cfg.unit}
                </span>
              </span>
            </div>
            <div className="param-input-row">
              <input
                id={`slider-${cfg.key}`}
                type="range"
                className="param-slider"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={value}
                onChange={e => handleChange(cfg.key, parseFloat(e.target.value))}
              />
              <input
                id={`input-${cfg.key}`}
                type="number"
                className="param-number"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={display}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) handleChange(cfg.key, Math.max(cfg.min, Math.min(cfg.max, v)));
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Three compact readout cards (BP, Stress, HRV) ──────────

function statusLabel(val: number, thresholds: { warn: number; alert: number; labels: [string, string, string] }) {
  if (val >= thresholds.alert) return { text: thresholds.labels[2], cls: 'alert' };
  if (val >= thresholds.warn)  return { text: thresholds.labels[1], cls: 'warn'  };
  return                              { text: thresholds.labels[0], cls: 'ok'    };
}

function VitalsRow() {
  const snapshot = useSimStore(s => s.snapshot);
  if (!snapshot) return null;

  const bpSt   = statusLabel(snapshot.systolic, { warn: 130, alert: 140, labels: ['Normal', 'Elevated', 'Hypertensive'] });
  const stressSt = statusLabel(snapshot.stressScore, { warn: 40, alert: 70, labels: ['Low', 'Moderate', 'High'] });
  const hrvSt  = statusLabel(120 - snapshot.hrv, { warn: 80, alert: 100, labels: ['Healthy', 'Low', 'Very Low'] });

  return (
    <div className="vitals-row">
      {/* Blood Pressure */}
      <div className="readout-card" id="readout-bp">
        <div className="readout-label">Blood Pressure</div>
        <div className="readout-value">
          {snapshot.systolic}
          <span className="readout-unit">/ {snapshot.diastolic}</span>
        </div>
        <div className={`readout-status ${bpSt.cls}`}>{bpSt.text} · mmHg</div>
      </div>

      {/* Stress */}
      <div className="readout-card" id="readout-stress">
        <div className="readout-label">Stress Index</div>
        <div className="readout-value">
          {Math.round(snapshot.stressScore)}
          <span className="readout-unit">/ 100</span>
        </div>
        <div className={`readout-status ${stressSt.cls}`}>{stressSt.text}</div>
      </div>

      {/* HRV */}
      <div className="readout-card" id="readout-hrv">
        <div className="readout-label">HRV RMSSD</div>
        <div className="readout-value">
          {Math.round(snapshot.hrv)}
          <span className="readout-unit">ms</span>
        </div>
        <div className={`readout-status ${hrvSt.cls}`}>{hrvSt.text}</div>
      </div>
    </div>
  );
}

// ─── Right column: gauge + contributions + 3 more metrics ───

function RightColumn() {
  const snapshot   = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);

  const hrColor = snapshot
    ? (snapshot.heartRate > 100 || snapshot.heartRate < 60 ? '#E3A83B' : '#34D399')
    : '#34D399';

  const qtColor = snapshot
    ? (snapshot.qtcBazett > 500 ? '#E5534B' : snapshot.qtcBazett > 440 ? '#E3A83B' : '#34D399')
    : '#34D399';

  const stColor = snapshot
    ? (Math.abs(snapshot.stSegment) > 0.1 ? '#E5534B' : Math.abs(snapshot.stSegment) > 0.05 ? '#E3A83B' : '#34D399')
    : '#34D399';

  return (
    <div className="right-column">
      {/* Gauge */}
      <div className="gauge-panel">
        <div className="gauge-panel-label">CAD Risk Score</div>
        <div className="gauge-svg-container">
          <ArcGauge />
        </div>
        {riskResult && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {Math.round(riskResult.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Contribution bars */}
      <ContributionBreakdown />

      {/* Extra scalar readouts: HR, QTc, ST segment */}
      {snapshot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {[
            { id: 'right-hr',  label: 'HEART RATE',  value: snapshot.heartRate, unit: 'BPM', color: hrColor,
              note: snapshot.heartRate > 100 ? 'TACHY' : snapshot.heartRate < 60 ? 'BRADY' : 'NSR' },
            { id: 'right-qtc', label: 'QTC BAZETT', value: snapshot.qtcBazett,   unit: 'MS',  color: qtColor,
              note: snapshot.qtcBazett > 500 ? 'PROLONGED' : snapshot.qtcBazett > 440 ? 'BORDERLINE' : 'NORMAL' },
            { id: 'right-st',  label: 'ST SEGMENT',  value: snapshot.stSegment.toFixed(2), unit: 'MV', color: stColor,
              note: Math.abs(snapshot.stSegment) > 0.1 ? 'ELEVATION' : 'ISOELECTRIC' },
          ].map(({ id, label, value, unit, color, note }) => (
            <div key={id} className="readout-card" id={id}>
              <div className="readout-label">{label}</div>
              <div className="readout-value" style={{ color }}>
                {value}
                <span className="readout-unit">{unit}</span>
              </div>
              <div className="readout-status" style={{ color: '#6E737C' }}>{note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────

export default function App() {
  usePipeline();

  return (
    <div className="app-layout">
      <TopBar />

      {/* Left sidebar: sensors + sliders */}
      <aside className="sidebar">
        <SensorStatusList />
        <ParamSliders />
      </aside>

      {/* Center: waveforms + vitals row */}
      <main className="center-column">
        {/* ECG panel */}
        <div className="waveform-panel">
          <div className="waveform-header">
            <div className="waveform-label">
              <div className="waveform-indicator" />
              ECG — LEAD II
            </div>
            <div className="waveform-meta">25 MM/S · 10 MM/MV</div>
          </div>
          <SweepWaveform bufferKey="ecgBuffer" color="#34D399" yMin={-0.5} yMax={1.5} />
        </div>

        {/* PPG panel */}
        <div className="waveform-panel">
          <div className="waveform-header">
            <div className="waveform-label" style={{ color: 'var(--text-muted)' }}>
              <div className="waveform-indicator" style={{ background: '#34D399', opacity: 0.7 }} />
              PPG — OPTICAL
            </div>
            <div className="waveform-meta">100 HZ</div>
          </div>
          <SweepWaveform bufferKey="ppgBuffer" color="#34D399" yMin={0} yMax={1.2} />
        </div>

        {/* Three compact cards */}
        <VitalsRow />
      </main>

      {/* Right column: gauge + contributions */}
      <RightColumn />

      {/* Bottom strip: trend sparkline */}
      <RiskTrend />
    </div>
  );
}
