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

// ── Live Clock ───────────────────────────────────────────────────────────────

function ShellLiveClock() {
  const [t, setT] = useState(() => {
    const now = new Date();
    return `${new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(now)} · ${now.toLocaleTimeString('en-GB')}`;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setT(`${new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(now)} · ${now.toLocaleTimeString('en-GB')}`);
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

// ── Nav label map for breadcrumbs ────────────────────────────────────────────

const NAV_LABELS: Record<string, { section: string; page: string }> = {
  dashboard:  { section: 'Monitor',   page: 'Dashboard' },
  waveforms:  { section: 'Monitor',   page: 'Live Waveforms' },
  profile:    { section: 'Patient',   page: 'Patient Profile' },
  labreport:  { section: 'Patient',   page: 'Lab Report' },
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

  return (
    <div className="app-shell">
      {/* ── LEFT: Sidebar (desktop only, hidden on mobile via CSS) ──── */}
      <Sidebar activeNavId={activeNav} onNavChange={onNavChange} />

      {/* ── MAIN: Center + Right ──────────────────────────────────── */}
      <div className="app-main">
        {/* ── TOP BAR (spans center + right columns) ──────────────── */}
        <header className="shell-topbar">
          {/* Left: Breadcrumb */}
          <div className="shell-topbar-breadcrumb">
            <span>{navInfo.section}</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{navInfo.page}</span>
          </div>

          {/* Center: Scenario preset pills (injected) */}
          <div className="shell-topbar-pills">
            {topBarCenter}
          </div>

          {/* Right: LIVE indicator + clock + settings */}
          <div className="shell-topbar-right">
            <div className="shell-live-indicator">
              <div className="live-dot" />
              LIVE
            </div>
            <ShellLiveClock />
            <ThemeToggleButton />
          </div>
        </header>

        {/* ── CONTENT BODY: Center + Right split ──────────────────── */}
        <div className="app-content-body">
          {/* CENTER: scrollable main content */}
          <div className="app-center">
            {children}
          </div>

          {/* RIGHT: fixed risk panel */}
          <div className="app-right-panel">
            {rightPanelContent}
          </div>
        </div>
      </div>

      {/* ── MOBILE: Bottom tab bar (visible < 768px only) ─────────── */}
      <MobileTabBar activeTabId={activeNav} onTabChange={onNavChange} />
    </div>
  );
}

