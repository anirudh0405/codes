/**
 * CAD Risk Simulator â€” Medical Monitor Dashboard
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
import { LabReportSummary } from '@/components/Dashboard/LabReportSummary';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardHome } from '@/components/Dashboard/DashboardHome';
import { LiveWaveforms } from '@/components/Dashboard/LiveWaveforms';
import { RightPanelContent, RightPanelMobileWrapper } from '@/components/layout/RightPanelContent';
import { PatientProfilePage } from '@/components/pages/PatientProfilePage';
import { LabReportPage } from '@/components/pages/LabReportPage';
import { ScenariosPage } from '@/components/pages/ScenariosPage';
import { RiskEnginePage } from '@/components/pages/RiskEnginePage';
import { FusionLayersPage } from '@/components/pages/FusionLayersPage';
import { SimLogsPage } from '@/components/pages/SimLogsPage';
import { MagneticButton } from '@/components/ui/magnetic-button';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--alert-red)';
  if (band === 'Moderate') return 'var(--alert-amber)';
  return 'var(--accent)';
}

// â”€â”€â”€ Tooltip Descriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ InfoTooltip Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// ─── Live Clock Component ──────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString('en-GB'));

  useEffect(() => {
    const timer = setInterval(() => {
      setT(new Date().toLocaleTimeString('en-GB'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="font-mono text-xs text-[var(--text-secondary)] tracking-wider">
      {t}
    </span>
  );
}

// ─── Scenario Preset Bar (renders in AppShell topBarCenter slot) ────────────────

function ScenarioPresetBar({ onLabReport }: { onLabReport: () => void }) {
  const {
    activeProfile,
    applyProfile,
    randomize,
    selectedCategory,
    setSelectedCategory,
  } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile,
    applyProfile: s.applyProfile,
    randomize: s.randomize,
    selectedCategory: s.selectedCategory,
    setSelectedCategory: s.setSelectedCategory,
  })));

  const activeCategory = selectedCategory ?? 'healthy';

  const categoryPresets = useMemo(() => {
    return SCENARIO_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const handleCategorySelect = (catId: PresetCategory) => {
    setSelectedCategory(catId);
    // If currently active scenario belongs to a different category, apply the baseline preset for the new category
    const presets = SCENARIO_PRESETS.filter(p => p.category === catId);
    if (presets.length > 0 && activeProfile?.category !== catId) {
      applyProfile(presets[0].id);
    }
  };

  return (
    <>
      {/* Primary Category Selector (HEALTHY | CAD) + Secondary Scenario Selection */}
      <div className="flex items-center overflow-x-auto gap-3 py-1 px-1" style={{ scrollbarWidth: 'none' as any }}>
        {/* TWO PRIMARY BUTTONS: HEALTHY & CAD */}
        <div className="flex items-center shrink-0 rounded-xl p-1 gap-2.5" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
          {PRESET_CATEGORIES.map(cat => {
            const isCatActive = activeCategory === cat.id;
            return (
              <MagneticButton key={cat.id} distance={0.15}>
                <button
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none shrink-0 flex items-center gap-2",
                    isCatActive
                      ? "bg-[var(--accent)] text-[var(--bg)] shadow-md border border-blue-400/40"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-transparent"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", isCatActive ? "bg-[var(--bg)]" : "bg-[var(--text-tertiary)]")} />
                  {cat.label}
                </button>
              </MagneticButton>
            );
          })}
        </div>

        <div className="w-px h-6 shrink-0 mx-1" style={{ background: 'var(--border)' }} />

        {/* SECONDARY SELECTION: Scenarios for the currently selected category */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-tertiary)] shrink-0 hidden sm:inline">
            {activeCategory === 'healthy' ? 'Healthy Scenarios:' : 'CAD Scenarios:'}
          </span>

          {categoryPresets.map(p => {
            const active = activeProfile?.id === p.id;
            return (
              <MagneticButton key={p.id} distance={0.2}>
                <AnimatedButton
                  id={`profile-${p.id}`}
                  onClick={() => applyProfile(p.id)}
                  className={cn(
                    'px-3.5 py-1.5 text-[11px] font-bold h-8 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer border',
                    active
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[rgba(74,157,255,0.15)] shadow-sm ring-1 ring-[var(--accent)]/30'
                      : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {p.shortName || p.name}
                </AnimatedButton>
              </MagneticButton>
            );
          })}
        </div>

        <div className="w-px h-6 shrink-0 mx-1" style={{ background: 'var(--border)' }} />

        {/* Action Buttons: Randomize Vitals & Lab Report */}
        <MagneticButton distance={0.35}>
          <button
            id="btn-randomize"
            type="button"
            onClick={randomize}
            className="cursor-pointer rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-3.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 ring-offset-1 ring-offset-blue-500 transition-transform duration-150 ring-inset active:scale-95 shadow-sm whitespace-nowrap shrink-0"
            title={`Randomize parameters within ${activeCategory === 'cad' ? 'CAD' : 'Healthy'} scope`}
          >
            Randomize Vitals
          </button>
        </MagneticButton>

        <div className="w-px h-6 shrink-0 mx-1" style={{ background: 'var(--border)' }} />

        <MagneticButton distance={0.25}>
          <button
            id="btn-lab-report"
            type="button"
            onClick={onLabReport}
            className="text-[11px] font-medium rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-colors whitespace-nowrap shrink-0"
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            title="Open Lab Report Summary"
          >
            Lab Report
          </button>
        </MagneticButton>
      </div>
    </>
  );
}

// â”€â”€â”€ Main Application Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function App() {
  usePipeline();

  const [labReportOpen, setLabReportOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const handleNavChange = useCallback((id: string) => { setActiveNav(id); }, []);

  return (
    <>
    <AppShell
      activeNav={activeNav}
      onNavChange={handleNavChange}
      topBarCenter={
        <ScenarioPresetBar onLabReport={() => setLabReportOpen(true)} />
      }
      rightPanelContent={<RightPanelContent />}
    >
      {/* Lab Report Summary Modal */}
      {labReportOpen && <LabReportSummary onClose={() => setLabReportOpen(false)} />}

      {/* CENTER CONTENT: Routed by activeNav */}
      {activeNav === 'dashboard' && <DashboardHome />}
      {activeNav === 'waveforms' && <LiveWaveforms />}
      {activeNav === 'profile' && <PatientProfilePage />}
      {activeNav === 'labreport' && <LabReportPage />}
      {activeNav === 'scenarios' && <ScenariosPage />}
      {activeNav === 'riskengine' && <RiskEnginePage />}
      {activeNav === 'fusion' && <FusionLayersPage />}
      {activeNav === 'simlogs' && <SimLogsPage />}


    </AppShell>
    <RightPanelMobileWrapper />
    </>
  );
}
