/**
 * Sidebar — Fixed left navigation panel
 * ======================================
 * Clinical-software sidebar with app identity, grouped nav sections,
 * and footer. Desktop only — hidden on mobile (replaced by MobileTabBar).
 */

import React from 'react';

// ── Nav item type ────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── SVG Icons (16×16, stroke-based) ──────────────────────────────────────────

const IconDashboard = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

const IconWaveform = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,8 3,8 5,3 7,13 9,5 11,11 13,8 15,8" />
  </svg>
);

const IconPerson = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5" r="2.5" />
    <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" />
  </svg>
);

const IconFlask = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2v4L2 13a1 1 0 001 1h10a1 1 0 001-1L10 6V2" />
    <line x1="5" y1="2" x2="11" y2="2" />
    <line x1="3.5" y1="10" x2="12.5" y2="10" />
  </svg>
);

const IconGrid = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="4" height="4" rx="0.5" />
    <rect x="10" y="2" width="4" height="4" rx="0.5" />
    <rect x="2" y="10" width="4" height="4" rx="0.5" />
    <rect x="10" y="10" width="4" height="4" rx="0.5" />
  </svg>
);

const IconGauge = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 11A6.5 6.5 0 0113.5 11" />
    <line x1="8" y1="11" x2="10" y2="6" />
    <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconLayers = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="8,2 14,6 8,10 2,6" />
    <polyline points="2,9 8,13 14,9" />
  </svg>
);

const IconList = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="4" x2="14" y2="4" />
    <line x1="5" y1="8" x2="14" y2="8" />
    <line x1="5" y1="12" x2="14" y2="12" />
    <circle cx="2.5" cy="4" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="8" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="12" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

// ── Logo mark (heart/monitor icon) ───────────────────────────────────────────

const LogoMark = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="4" fill="var(--accent)" fillOpacity="0.12" />
    <polyline
      points="3,10 6,10 8,5 10,15 12,7 14,10 17,10"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Navigation data ──────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { id: 'dashboard',  label: 'Dashboard',      icon: IconDashboard },
      { id: 'waveforms',  label: 'Live Waveforms',  icon: IconWaveform },
    ],
  },
  {
    label: 'Patient',
    items: [
      { id: 'profile',   label: 'Patient Profile',  icon: IconPerson },
      { id: 'labreport',  label: 'Lab Report',       icon: IconFlask },
      { id: 'scenarios', label: 'Scenarios',         icon: IconGrid },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { id: 'riskengine', label: 'Risk Engine',     icon: IconGauge },
      { id: 'fusion',     label: 'Fusion Layers',   icon: IconLayers },
      { id: 'simlogs',    label: 'Sim Logs',        icon: IconList },
    ],
  },
];

// ── Sidebar Component ────────────────────────────────────────────────────────

interface SidebarProps {
  activeNavId: string;
  onNavChange: (id: string) => void;
}

export function Sidebar({ activeNavId, onNavChange }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* App Identity */}
      <div className="sidebar-identity">
        <div className="sidebar-identity-name">
          {LogoMark}
          CAD Monitor
        </div>
        <div className="sidebar-identity-version">v1.0 · SIMULATED</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item${activeNavId === item.id ? ' active' : ''}`}
                onClick={() => onNavChange(item.id)}
                aria-current={activeNavId === item.id ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <a href="#docs" onClick={e => e.preventDefault()}>Docs</a>
        <span>v1.0.0</span>
      </div>
    </aside>
  );
}
