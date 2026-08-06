import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ClipboardList, HeartPulse, SlidersHorizontal } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { PRESET_CATEGORIES, SCENARIO_PRESETS } from '@/presets';
import { getRiskColor } from '@/lib/vitals';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { cn } from '@/lib/utils';

function LiveClock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString('en-GB')), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums caption-type" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
      {t}
    </span>
  );
}

type HeaderMode = 'healthy' | 'exercise' | 'cad';

export function Header({ onLabReport }: { onLabReport: () => void }) {
  const { activeProfile, applyProfile, randomize, riskResult, selectedCategory, setSelectedCategory } = useSimStore(
    useShallow(s => ({
      activeProfile: s.activeProfile,
      applyProfile: s.applyProfile,
      randomize: s.randomize,
      riskResult: s.riskResult,
      selectedCategory: s.selectedCategory,
      setSelectedCategory: s.setSelectedCategory,
    }))
  );

  const band = riskResult?.band ?? 'Low';
  const score = riskResult?.score ?? 0;
  const scoreColor = getRiskColor(band);

  // Current mode derived from store state (preserves category/sub-scenario logic)
  const activeMode: HeaderMode =
    activeProfile?.id === 'healthy-post-exercise'
      ? 'exercise'
      : (selectedCategory ?? 'healthy') === 'cad'
      ? 'cad'
      : 'healthy';

  const activeCategory = activeMode === 'cad' ? 'cad' : 'healthy';

  const categoryPresets = useMemo(
    () => SCENARIO_PRESETS.filter(p => p.category === activeCategory),
    [activeCategory]
  );

  const handleMode = (mode: HeaderMode) => {
    if (mode === 'cad') {
      setSelectedCategory('cad');
    } else if (mode === 'exercise') {
      applyProfile('healthy-post-exercise');
    } else {
      setSelectedCategory('healthy');
    }
  };

  return (
    <header
      className="dashboard-header"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}
    >
      {/* Row 1: brand · segmented · risk/live/clock/lab */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        {/* Left — brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)' }}>
            <HeartPulse size={16} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div className="flex flex-col" style={{ gap: 1 }}>
            <span className="body-type font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              CAD Monitor
            </span>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
              Patient Status · Simulation Mode
            </span>
          </div>
        </div>

        {/* Center — segmented control */}
        <div className="segmented" role="tablist" aria-label="Simulation category">
          {(['healthy', 'exercise', 'cad'] as HeaderMode[]).map(m => {
            const label = m === 'healthy' ? 'Healthy' : m === 'exercise' ? 'Exercise' : 'CAD';
            const isActive = activeMode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn('segmented__option', isActive && 'is-active')}
                onClick={() => handleMode(m)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right — risk · live · clock · lab report */}
        <div className="flex items-center shrink-0" style={{ gap: 'var(--space-md)' }}>
          <div className="flex items-center" style={{ gap: 'var(--space-xs)' }} aria-label={`Current risk ${score}, ${band}`}>
            <span className="caption-type" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Risk
            </span>
            <span className="metric-type tabular-nums" style={{ color: scoreColor, fontSize: 22 }}>
              {score}
            </span>
          </div>
          <div className="w-px h-5" style={{ background: 'var(--border)' }} />
          <div className="flex items-center" style={{ gap: 'var(--space-xs)' }} role="status" aria-label="Live">
            <div className="live-dot" />
            <span className="caption-type uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              Live
            </span>
          </div>
          <LiveClock />
          <button
            type="button"
            id="btn-lab-report"
            onClick={onLabReport}
            aria-label="Open Lab Report Summary"
            title="Lab Report"
            className="flex items-center justify-center outline-none cursor-pointer transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <ClipboardList size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Row 2: scenario strip — preserves all preset + randomize functionality */}
      <div
        className="flex items-center justify-between flex-wrap gap-2"
        style={{
          padding: 'var(--space-xs) var(--space-lg) var(--space-sm)',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="flex items-center gap-1.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true">
            <SlidersHorizontal size={12} />
            <span className="caption-type">Scenario</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categoryPresets.map(p => {
              const active = activeProfile?.id === p.id;
              return (
                <AnimatedButton
                  key={p.id}
                  id={`profile-${p.id}`}
                  onClick={() => applyProfile(p.id)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium h-7 rounded transition-colors whitespace-nowrap',
                    active ? 'border-[var(--accent)] font-semibold' : 'border-[var(--border)]'
                  )}
                  style={active
                    ? { background: 'rgba(74,157,255,0.12)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  {p.shortName}
                </AnimatedButton>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AnimatedButton
            id="btn-randomize"
            onClick={randomize}
            className="px-3 py-1 text-[11px] font-semibold h-7 rounded border-0 whitespace-nowrap"
            style={{ background: 'var(--accent)', color: '#0A0A0B', border: 'none' }}
            title={`Randomize parameters within ${activeCategory === 'cad' ? 'CAD' : 'Healthy'} scope`}
          >
            Randomize
          </AnimatedButton>
        </div>
      </div>

      {/* Mobile category note */}
      <div className="md:hidden flex items-center gap-1 px-5 py-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        {PRESET_CATEGORIES.find(c => c.id === activeCategory)?.label ?? 'Healthy'} mode active
      </div>
    </header>
  );
}
