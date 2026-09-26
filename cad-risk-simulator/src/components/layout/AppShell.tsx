/**
 * AppShell — 3-Zone Persistent Layout
 * =====================================
 * LEFT:   Fixed sidebar (220px, desktop only)
 * CENTER: Main content area (scrollable)
 * RIGHT:  Fixed risk panel (280px, stacks on mobile)
 *
 * Includes TopBar spanning center + right columns.
 * Mobile (<768px): sidebar → bottom tab bar, right panel stacks below.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { CadRiskTrendBar } from '../Dashboard/CadRiskTrendBar';
import { ReportUploadZone } from '../ReportUpload/ReportUploadZone';
import { ReportUploadPanel } from '../ReportUpload/ReportUploadPanel';

// ── Live Clock ───────────────────────────────────────────────────────────────

function ShellLiveClock() {
  const [t, setT] = useState(() => {
    const now = new Date();
    return `${new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(now)} · ${now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setT(`${new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(now)} · ${now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="tabular-nums"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.06em',
        color: 'var(--text-secondary)',
      }}
    >
      {t}
    </span>
  );
}

// ── Moon & Sun Icons ─────────────────────────────────────────────────────────

const MoonIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 10.5A6 6 0 1 1 5.5 2.5a4.5 4.5 0 0 0 8 8z" />
  </svg>
);

const SunIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <line x1="8" y1="1" x2="8" y2="3" />
    <line x1="8" y1="13" x2="8" y2="15" />
    <line x1="1" y1="8" x2="3" y2="8" />
    <line x1="13" y1="8" x2="15" y2="8" />
    <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" />
    <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" />
    <line x1="3.05" y1="12.95" x2="4.46" y2="11.54" />
    <line x1="11.54" y1="4.46" x2="12.95" y2="3.05" />
  </svg>
);

function ThemeToggleButton() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light-mode');
      setIsLight(true);
    } else {
      setIsLight(document.documentElement.classList.contains('light-mode'));
    }
  }, []);

  const toggleTheme = () => {
    const nextIsLight = document.documentElement.classList.toggle('light-mode');
    setIsLight(nextIsLight);
    localStorage.setItem('theme', nextIsLight ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      className="shell-settings-btn"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLight ? SunIcon : MoonIcon}
    </button>
  );
}

// ── Arohan Logo Component ───────────────────────────────────────────────────

function ArohanLogo() {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="arohan-logo-fallback" title="Arohan">
        {/* Heart + wifi icon matching brand mark */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="var(--accent)"
          />
          <path
            d="M16 4a4 4 0 0 1 4 4M14 6a2 2 0 0 1 2 2"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.02em' }}>
          Arohan
        </span>
      </div>
    );
  }

  return (
    <img
      src="/arohan-logo.png"
      alt="Arohan Logo"
      className="arohan-logo-img"
      onError={() => setImgError(true)}
    />
  );
}

// ── TopBar Risk Status (Band color dot + band label, NO numeric score) ────────

import { useSimStore } from '../../store/simStore';

function TopBarRiskStatus() {
  const riskResult = useSimStore(s => s.riskResult);
  const band = riskResult?.band ?? 'Low';
  const color = band === 'High' ? 'var(--risk-high)' : band === 'Moderate' ? 'var(--risk-moderate)' : 'var(--risk-low)';

  return (
    <div className="topbar-risk-status" title={`Current Status: ${band} Risk`}>
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
          display: 'inline-block',
        }}
      />
      <span>{band} Risk</span>
    </div>
  );
}

// ── Nav label map for breadcrumbs ────────────────────────────────────────────

const NAV_LABELS: Record<string, { section: string; page: string }> = {
  dashboard:  { section: 'Monitor',   page: 'Dashboard' },
  waveforms:  { section: 'Monitor',   page: 'Live Waveforms' },
  profile:    { section: 'Patient',   page: 'Patient Profile' },
  labreport:  { section: 'Patient',   page: 'Lab Report' },
  report:     { section: 'Patient',   page: 'Patient Report' },
  scenarios:  { section: 'Patient',   page: 'Scenarios' },
  riskengine: { section: 'Analysis',  page: 'Risk Engine' },
  fusion:     { section: 'Analysis',  page: 'Fusion Layers' },
  healthytip: { section: 'Analysis',  page: 'Healthy Tips' },
  simlogs:    { section: 'Analysis',  page: 'Sim Logs' },
  history:    { section: 'Analysis',  page: 'History' },
  info:       { section: 'Analysis',  page: 'Info Reference' },
};

// ── AppShell Component ───────────────────────────────────────────────────────

interface AppShellProps {
  /** Content rendered in the CENTER zone */
  children: React.ReactNode;
  /** Content rendered in the RIGHT panel (below the header) */
  rightPanelContent?: React.ReactNode;
  /** Scenario preset pills rendered in the top bar center */
  topBarCenter?: React.ReactNode;
  /** Currently active nav ID (controlled by parent) */
  activeNav: string;
  /** Callback when nav item is clicked */
  onNavChange: (id: string) => void;
}

export function AppShell({ children, rightPanelContent, topBarCenter, activeNav, onNavChange }: AppShellProps) {
  const navInfo = NAV_LABELS[activeNav] ?? { section: 'Monitor', page: 'Dashboard' };
  const [reportPanelOpen, setReportPanelOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* ── LEFT: Sidebar (desktop only, hidden on mobile via CSS) ──── */}
      <Sidebar activeNavId={activeNav} onNavChange={onNavChange} />

      {/* ── MAIN: Center + Right ──────────────────────────────────── */}
      <div className="app-main">
        {/* ── TOP BAR (spans center + right columns) ──────────────── */}
        <header className="shell-topbar">
          {/* Left: Arohan Logo + Platform Title + Page Breadcrumb */}
          <div className="shell-topbar-brand">
            <ArohanLogo />
            <div className="shell-topbar-title-wrap">
              <span className="platform-title-full">Precision Cardiovascular Risk Intelligence Platform</span>
              <span className="platform-title-compact">Precision CVR Intelligence</span>
              <span className="platform-title-mobile">Precision CVR Platform</span>
            </div>
            <div className="shell-topbar-breadcrumb">
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{navInfo.page}</span>
            </div>
          </div>

          {/* Center: Scenario preset selector (injected) */}
          <div className="shell-topbar-pills">
            {topBarCenter}
          </div>

          {/* Right: Risk status indicator + clock + settings */}
          <div className="shell-topbar-right">
            <TopBarRiskStatus />
            <ReportUploadZone compact onFileSelected={() => setReportPanelOpen(true)} />
            <ShellLiveClock />
            <ThemeToggleButton />
          </div>
        </header>

        {/* ── CONTENT BODY: Center + Right split ──────────────────── */}
        <div className="app-content-body">
          {/* CENTER: main content + persistent bottom CAD Risk Trend bar */}
          <div className="app-center">
            <div className="app-center-scroll">
              {children}
            </div>
            <CadRiskTrendBar />
          </div>

          {/* RIGHT: fixed risk panel */}
          <div className="app-right-panel">
            {rightPanelContent}
          </div>
        </div>
      </div>

      {/* ── MOBILE: Bottom tab bar (visible < 768px only) ─────────── */}
      <MobileTabBar activeTabId={activeNav} onTabChange={onNavChange} />

      {/* ── Report Upload Slide-in Panel (global overlay) ──────────────── */}
      <ReportUploadPanel isOpen={reportPanelOpen} onClose={() => setReportPanelOpen(false)} />
    </div>
  );
}
