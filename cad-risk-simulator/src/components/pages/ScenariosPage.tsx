/**
 * ScenariosPage — Full-width Scenario presets section
 * =====================================================
 * Accessible from sidebar "Scenarios" nav item.
 * Two-column tab group [HEALTHY] [CAD] + grid of scenario cards.
 *
 * Cards: --surface bg, --border, 8px radius, 16px pad
 *   - Name bold, 2-3 key param chips, LOAD button
 *   - Active card: --accent border
 *   - Mobile: full-width, LOAD button full-width
 *
 * UI ONLY — reads/writes existing store state, no new logic.
 */

import React, { useState, useMemo } from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import { SCENARIO_PRESETS, PRESET_CATEGORIES, type PresetCategory } from '../../presets';
import { classifyBP } from '../../lib/bpRanges';

// ── Scenario Card ────────────────────────────────────────────────────────────

function ScenarioCard({
  preset,
  isActive,
  onLoad,
}: {
  preset: typeof SCENARIO_PRESETS[0];
  isActive: boolean;
  onLoad: () => void;
}) {
  const bpInfo = classifyBP(preset.params.systolic, preset.params.diastolic);

  const chips: { label: string; value: string }[] = [
    { label: 'HR', value: `${preset.params.heartRate} bpm` },
    { label: 'Fixed BP', value: `${preset.params.systolic}/${preset.params.diastolic} mmHg` },
    { label: 'HRV', value: `${preset.params.hrv} ms` },
  ];

  return (
    <div className={`sc-card${isActive ? ' sc-card-active' : ''}`}>
      <div className="sc-card-header">
        <span className="sc-card-emoji">{preset.emoji}</span>
        <span className="sc-card-name">{preset.name}</span>
      </div>
      <p className="sc-card-desc">{preset.description}</p>
      
      <div className="sc-card-chips">
        {chips.map(c => (
          <span key={c.label} className="sc-chip">
            <span className="sc-chip-label">{c.label}</span>
            <span className="sc-chip-value">{c.value}</span>
          </span>
        ))}
      </div>

      {/* BP Healthy vs Risk Range Banner */}
      <div className="my-2 p-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--border)] text-[11px] flex flex-col gap-1">
        <div className="flex items-center justify-between font-semibold">
          <span className="text-[var(--text-secondary)]">BP Status:</span>
          <span style={{ color: bpInfo.color }}>{bpInfo.label}</span>
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] flex items-center justify-between border-t border-[var(--border)] pt-1 mt-0.5">
          <span style={{ color: 'var(--risk-low)' }}>Healthy: &lt;120/80</span>
          <span style={{ color: bpInfo.category !== 'healthy' ? 'var(--risk-high)' : 'var(--text-tertiary)' }}>
            {bpInfo.riskRangeText}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`sc-load-btn${isActive ? ' sc-load-active' : ''}`}
        onClick={onLoad}
        disabled={isActive}
      >
        {isActive ? 'ACTIVE' : 'LOAD'}
      </button>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────

export function ScenariosPage() {
  const { activeProfile, applyProfile, selectedCategory, setSelectedCategory } = useSimStore(
    useShallow(s => ({
      activeProfile: s.activeProfile,
      applyProfile: s.applyProfile,
      selectedCategory: s.selectedCategory,
      setSelectedCategory: s.setSelectedCategory,
    }))
  );

  const activeCat: PresetCategory = selectedCategory ?? 'healthy';

  const filteredPresets = useMemo(
    () => SCENARIO_PRESETS.filter(p => p.category === activeCat),
    [activeCat],
  );

  const activePresetName = activeProfile?.name ?? 'None selected';

  return (
    <div className="sc-page">
      {/* Header */}
      <div className="sc-page-header">
        <div className="sc-page-title-row">
          <h1 className="sc-page-title">SCENARIOS</h1>
          <span className="sc-active-name">{activePresetName}</span>
        </div>
      </div>

      {/* Category tab group */}
      <div className="sc-tab-group">
        {PRESET_CATEGORIES.map(cat => {
          const isActive = activeCat === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`sc-tab${isActive ? ' sc-tab-active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Scenario cards grid */}
      <div className="sc-cards-grid">
        {filteredPresets.map(preset => (
          <ScenarioCard
            key={preset.id}
            preset={preset}
            isActive={activeProfile?.id === preset.id}
            onLoad={() => applyProfile(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
