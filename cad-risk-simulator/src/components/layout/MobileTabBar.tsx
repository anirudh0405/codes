/**
 * MobileTabBar — Bottom navigation for mobile (<768px)
 * =====================================================
 * 5 tabs with icon + label, replaces Sidebar on mobile.
 * Hidden on desktop via CSS (.mobile-tab-bar { display: none }).
 */

import React from 'react';

// ── Tab definitions ──────────────────────────────────────────────────────────

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const IconDashboard = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </svg>
);

const IconWaveform = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,10 4,10 6,4 9,16 11,6 14,14 16,10 19,10" />
  </svg>
);

const IconPatient = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="6.5" r="3" />
    <path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6" />
  </svg>
);

const IconRisk = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14A7 7 0 0117 14" />
    <line x1="10" y1="14" x2="12.5" y2="7" />
    <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const IconLogs = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="5" x2="17" y2="5" />
    <line x1="6" y1="10" x2="17" y2="10" />
    <line x1="6" y1="15" x2="17" y2="15" />
    <circle cx="3.5" cy="5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="15" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const IconInfo = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" />
    <line x1="10" y1="9" x2="10" y2="14" />
    <circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconHeart = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 16 4.5 10.8A3.8 3.8 0 0 1 10 5.5a3.8 3.8 0 0 1 5.5 5.3L10 16Z" />
  </svg>
);

const TABS: TabItem[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: IconDashboard },
  { id: 'waveforms',  label: 'Waveforms',  icon: IconWaveform },
  { id: 'profile',    label: 'Patient',    icon: IconPatient },
  { id: 'riskengine', label: 'Risk',       icon: IconRisk },
  { id: 'fusion',     label: 'Fusion',     icon: IconHeart },
  { id: 'healthytip', label: 'Healthy',    icon: IconHeart },
  { id: 'info',       label: 'Info',       icon: IconInfo },
];

// ── Component ────────────────────────────────────────────────────────────────

interface MobileTabBarProps {
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export function MobileTabBar({ activeTabId, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="mobile-tab-bar" aria-label="Mobile navigation">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`mobile-tab-bar-item${activeTabId === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTabId === tab.id ? 'page' : undefined}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
