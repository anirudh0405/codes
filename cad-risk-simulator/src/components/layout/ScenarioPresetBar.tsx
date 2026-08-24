/**
 * Scenario Preset Bar — 3-Category Dropdown Selector
 * ===================================================
 * Replaces the flat horizontal pill list with exactly THREE category dropdown buttons:
 *   1. HEALTHY ▾
 *   2. CAD ▾
 *   3. CVD ▾
 *
 * Features:
 *   - Clicking a category toggles its dropdown menu.
 *   - Only one dropdown open at a time.
 *   - Click-outside and ESC key automatically close the open dropdown.
 *   - Active category and active scenario are prominently indicated.
 *   - Sleek active scenario pill displayed alongside.
 *   - Preserves Randomize Vitals and Lab Report action buttons.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSimStore } from '../../store/simStore';
import { PRESET_CATEGORIES, SCENARIO_PRESETS, PresetCategory, ScenarioPreset } from '../../presets';
import { MagneticButton } from '../ui/magnetic-button';

interface ScenarioPresetBarProps {
  onLabReport: () => void;
}

export function ScenarioPresetBar({ onLabReport }: ScenarioPresetBarProps) {
  const {
    activeProfile,
    applyProfile,
    randomize,
    selectedCategory,
  } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile,
    applyProfile: s.applyProfile,
    randomize: s.randomize,
    selectedCategory: s.selectedCategory,
  })));

  const [openCategory, setOpenCategory] = useState<PresetCategory | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    if (!openCategory) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCategory(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCategory]);

  const toggleCategory = (catId: PresetCategory) => {
    setOpenCategory(prev => (prev === catId ? null : catId));
  };

  const handleSelectScenario = (preset: ScenarioPreset) => {
    applyProfile(preset.id);
    setOpenCategory(null);
  };

  const currentActiveCategory = activeProfile?.category ?? selectedCategory ?? 'healthy';

  return (
    <div
      ref={containerRef}
      className="scenario-preset-bar-root flex items-center gap-3 py-1"
    >
      {/* ── THREE MAIN CATEGORY DROPDOWN BUTTONS ──────────────────── */}
      <div
        className="scenario-category-group flex items-center rounded-xl p-1 gap-1.5"
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        {PRESET_CATEGORIES.map(cat => {
          const isOpen = openCategory === cat.id;
          const isCategoryActive = currentActiveCategory === cat.id;
          const presetsForCat = SCENARIO_PRESETS.filter(p => p.category === cat.id);

          return (
            <div key={cat.id} className="relative category-dropdown-container">
              <MagneticButton distance={0.15}>
                <button
                  type="button"
                  id={`cat-btn-${cat.id}`}
                  onClick={() => toggleCategory(cat.id)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  className={`scenario-category-btn px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none flex items-center gap-2 ${
                    isCategoryActive
                      ? 'bg-[var(--accent)] text-[var(--bg)] shadow-md border border-blue-400/40 font-extrabold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-transparent'
                  }`}
                  style={{
                    boxShadow: isOpen ? '0 0 0 2px var(--accent)' : undefined,
                  }}
                >
                  {/* Category active status dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isCategoryActive ? 'bg-[var(--bg)]' : 'bg-[var(--text-tertiary)]'
                    }`}
                  />
                  <span>{cat.shortLabel || cat.label}</span>
                  {/* Dropdown Chevron indicator */}
                  <span
                    className="text-[10px] opacity-80 shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▼
                  </span>
                </button>
              </MagneticButton>

              {/* ── DROPDOWN MENU ──────────────────────────────────── */}
              {isOpen && (
                <div
                  role="menu"
                  aria-label={`${cat.label} scenarios`}
                  className="scenario-dropdown-menu"
                >
                  <div className="scenario-dropdown-header">
                    <span className="scenario-dropdown-header-title">{cat.label}</span>
                    <span className="scenario-dropdown-header-count">
                      {presetsForCat.length} scenarios
                    </span>
                  </div>

                  <div className="scenario-dropdown-list">
                    {presetsForCat.map(preset => {
                      const isPresetActive = activeProfile?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="menuitem"
                          id={`preset-option-${preset.id}`}
                          onClick={() => handleSelectScenario(preset)}
                          className={`scenario-dropdown-item ${
                            isPresetActive ? 'active' : ''
                          }`}
                        >
                          <span className="scenario-dropdown-item-emoji">
                            {preset.emoji}
                          </span>
                          <div className="scenario-dropdown-item-info">
                            <div className="scenario-dropdown-item-name-row">
                              <span className="scenario-dropdown-item-name">
                                {preset.shortName || preset.name}
                              </span>
                              {preset.severity && (
                                <span className="scenario-dropdown-item-badge">
                                  {preset.severity}
                                </span>
                              )}
                            </div>
                            <span className="scenario-dropdown-item-desc">
                              {preset.description}
                            </span>
                          </div>

                          {/* Active Checkmark indicator */}
                          {isPresetActive && (
                            <span className="scenario-dropdown-item-check" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-px h-6 shrink-0 mx-0.5" style={{ background: 'var(--border)' }} />

      {/* ── ACTIVE SCENARIO DISPLAY BADGE ─────────────────────────── */}
      {activeProfile && (
        <div
          className="active-scenario-pill hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
          title={activeProfile.description}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-tertiary)]">
            Active:
          </span>
          <span className="text-sm">{activeProfile.emoji}</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {activeProfile.shortName || activeProfile.name}
          </span>
        </div>
      )}

      <div className="w-px h-6 shrink-0 mx-0.5 hidden md:block" style={{ background: 'var(--border)' }} />

      {/* ── ACTION BUTTONS: RANDOMIZE VITALS & LAB REPORT ──────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <MagneticButton distance={0.3}>
          <button
            id="btn-randomize"
            type="button"
            onClick={randomize}
            className="cursor-pointer rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 ring-offset-1 ring-offset-blue-500 transition-transform duration-150 ring-inset active:scale-95 shadow-sm whitespace-nowrap shrink-0"
            title={`Randomize parameters within ${currentActiveCategory.toUpperCase()} scope`}
          >
            Randomize Vitals
          </button>
        </MagneticButton>

        <MagneticButton distance={0.2}>
          <button
            id="btn-lab-report"
            type="button"
            onClick={onLabReport}
            className="text-[11px] font-medium rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:border-[var(--text-tertiary)]"
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
    </div>
  );
}
