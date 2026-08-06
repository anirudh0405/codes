/**
 * ParameterControls — "Current Parameters"
 * =========================================
 * Sticky control panel in the left sidebar. Sliders + numeric inputs for all
 * physiological simulation parameters. Preserves exact store wiring from the
 * original App.tsx implementation.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SlidersHorizontal } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { MockParams } from '@/hal/MockSensorSources';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { TOOLTIPS } from '@/lib/tooltips';

export const PARAM_SLIDERS: { key: keyof MockParams; label: string; unit: string; min: number; max: number; step: number; dec?: number; tipKey: string }[] = [
  { key: 'heartRate',   label: 'Heart Rate',   unit: 'bpm',   min: 30,   max: 220, step: 1, tipKey: 'heartRate' },
  { key: 'systolic',    label: 'BP Systolic',  unit: 'mmHg',  min: 70,   max: 220, step: 1, tipKey: 'systolic' },
  { key: 'diastolic',   label: 'BP Diastolic', unit: 'mmHg',  min: 40,   max: 140, step: 1, tipKey: 'diastolic' },
  { key: 'hrv',         label: 'HRV RMSSD',    unit: 'ms',    min: 5,    max: 150, step: 1, tipKey: 'hrv' },
  { key: 'stressScore', label: 'Stress',       unit: '0–100', min: 0,    max: 100, step: 1, tipKey: 'stress' },
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
        <span className="eyebrow-label flex items-center" style={{ fontSize: 11 }}>
          {cfg.label}
          <InfoTooltip text={TOOLTIPS[cfg.tipKey] ?? ''} />
        </span>
        <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
          <input
            id={`input-${cfg.key}`}
            type="number" min={cfg.min} max={cfg.max} step={cfg.step}
            inputMode="decimal"
            value={localVal}
            onFocus={() => setIsFocused(true)}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-14 rounded text-right text-[13px] font-medium tabular-nums outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: 'var(--space-sm) var(--space-xs)',
              minHeight: '40px',
              borderRadius: 8,
            }}
          />
          <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>{cfg.unit}</span>
        </div>
      </div>
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
          style={{ height: '40px', top: '-18px' }}
          aria-label={`${cfg.label} slider`}
        />
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      </div>
    </div>
  );
}

export function ParameterControls() {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ padding: 'var(--space-xs) var(--space-sm) var(--space-sm)' }}>
        <SlidersHorizontal size={13} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        <span className="eyebrow-label">Current Parameters</span>
      </div>
      <div className="flex flex-col" style={{ gap: 'var(--space-md)', padding: '0 var(--space-sm)' }}>
        {PARAM_SLIDERS.map(cfg => <ParamSlider key={cfg.key} cfg={cfg} />)}
      </div>
    </div>
  );
}
