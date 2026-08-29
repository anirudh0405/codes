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
import { HealthyTipsPage } from '@/components/pages/HealthyTipsPage';
import { SimLogsPage } from '@/components/pages/SimLogsPage';
import { InfoPage } from '@/components/pages/InfoPage';
import { HistoryPage } from '@/components/pages/HistoryPage';
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

import { ScenarioPresetBar } from '@/components/layout/ScenarioPresetBar';

// â”€â”€â”€ Main Application Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function App() {
  usePipeline();

  const [labReportOpen, setLabReportOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const lastLoggedHistoryNav = useRef<string | null>(null);
  const handleNavChange = useCallback((id: string) => { setActiveNav(id); }, []);

  useEffect(() => {
    if (activeNav !== 'history') {
      lastLoggedHistoryNav.current = null;
      return;
    }

    if (lastLoggedHistoryNav.current === 'history') {
      return;
    }

    lastLoggedHistoryNav.current = 'history';

    const entry = {
      page: 'History',
      section: 'Analysis',
      time: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('cad-monitor-visit-history') ?? '[]');
      const next = [entry, ...((Array.isArray(existing) ? existing : []).filter((item: any) => item?.page !== entry.page || item?.section !== entry.section).slice(0, 9))];
      localStorage.setItem('cad-monitor-visit-history', JSON.stringify(next.slice(0, 10)));
    } catch {
      // no-op: localStorage may be unavailable
    }
  }, [activeNav]);

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
      {activeNav === 'healthytip' && <HealthyTipsPage />}
      {activeNav === 'simlogs' && <SimLogsPage />}
      {activeNav === 'history' && <HistoryPage />}
      {activeNav === 'info' && <InfoPage />}


    </AppShell>
    <RightPanelMobileWrapper />
    </>
  );
}
