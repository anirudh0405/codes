/**
 * CVDInfoPanel — Disease-Specific Information Panel
 * ==================================================
 * Displays disease-specific parameters, severity, and mechanism pathway
 * when a CVD scenario is active. Hidden for Healthy/CAD scenarios.
 *
 * Reads from the SimStore's CVD-specific state slice.
 * Uses existing CSS variable system for styling.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSeverityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes('severe')) return 'var(--risk-high)';
  if (s.includes('moderate')) return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Present' : 'Absent';
  return String(value);
}

function getValueColor(value: string | number | boolean): string | undefined {
  if (typeof value === 'boolean') {
    return value ? 'var(--risk-moderate)' : 'var(--risk-low)';
  }
  const str = String(value).toLowerCase();
  if (str.includes('severe') || str.includes('ruptured') || str.includes('reduced') || str.includes('elevated')) {
    return 'var(--risk-high)';
  }
  if (str.includes('moderate') || str.includes('slightly')) {
    return 'var(--risk-moderate)';
  }
  if (str.includes('alert') || str.includes('normal') || str.includes('absent') || str.includes('narrow')) {
    return 'var(--risk-low)';
  }
  return undefined;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CVDInfoPanel() {
  const activeProfile = useSimStore(s => s.activeProfile);
  const activeDiseaseParams = useSimStore(s => s.activeDiseaseParams);
  const activeMechanismSteps = useSimStore(s => s.activeMechanismSteps);
  const activeSeverity = useSimStore(s => s.activeSeverity);

  // Only render for CVD scenarios with disease parameters
  if (!activeProfile || activeProfile.category !== 'cvd' || !activeDiseaseParams) {
    return null;
  }

  const entries = Object.entries(activeDiseaseParams);

  return (
    <div className="cvd-info-panel">
      {/* Header */}
      <div className="cvd-info-header">
        <div className="cvd-info-title-row">
          <span className="cvd-info-emoji">{activeProfile.emoji}</span>
          <div className="cvd-info-title-text">
            <span className="cvd-info-title">{activeProfile.name.replace('CVD — ', '')}</span>
            {activeSeverity && (
              <span
                className="cvd-info-severity"
                style={{ color: getSeverityColor(activeSeverity) }}
              >
                {activeSeverity}
              </span>
            )}
          </div>
        </div>
        <p className="cvd-info-desc">{activeProfile.description}</p>
      </div>

      {/* Disease-Specific Parameters */}
      <div className="cvd-info-params">
        <div className="cvd-info-section-label">DISEASE PARAMETERS</div>
        <div className="cvd-info-params-grid">
          {entries.map(([key, value]) => (
            <div key={key} className="cvd-param-row">
              <span className="cvd-param-label">{key}</span>
              <span
                className="cvd-param-value"
                style={{ color: getValueColor(value) }}
              >
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mechanism Pathway */}
      {activeMechanismSteps && activeMechanismSteps.length > 0 && (
        <div className="cvd-info-mechanism">
          <div className="cvd-info-section-label">MECHANISM PATHWAY</div>
          <div className="cvd-mechanism-path">
            {activeMechanismSteps.map((step, i) => (
              <React.Fragment key={i}>
                <span className="cvd-mechanism-step">{step}</span>
                {i < activeMechanismSteps.length - 1 && (
                  <span className="cvd-mechanism-arrow">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
