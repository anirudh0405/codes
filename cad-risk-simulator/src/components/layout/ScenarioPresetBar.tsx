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
    setSelectedCategory,
  } = useSimStore(useShallow(s => ({
    activeProfile: s.activeProfile,
    applyProfile: s.applyProfile,
    randomize: s.randomize,
    selectedCategory: s.selectedCategory,
    setSelectedCategory: s.setSelectedCategory,
  })));

  const [openCategory, setOpenCategory] = useState<PresetCategory | 'scenario' | null>(null);
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

  const toggleCategory = (catId: PresetCategory | 'scenario') => {
    setOpenCategory(prev => (prev === catId ? null : catId));
  };

  const handleSelectScenarioCategory = (catId: PresetCategory) => {
    setSelectedCategory(catId);
    setOpenCategory(catId);
  };

  const handleSelectScenario = (preset: ScenarioPreset) => {
    applyProfile(preset.id);
    setOpenCategory('scenario');
  };

  const currentActiveCategory = activeProfile?.category ?? selectedCategory ?? 'healthy';
  const activeCategoryPresets = openCategory && openCategory !== 'scenario'
    ? SCENARIO_PRESETS.filter(p => p.category === openCategory)
    : SCENARIO_PRESETS.filter(p => p.category === currentActiveCategory);

  return (
    <div
      ref={containerRef}
      className="scenario-preset-bar-root flex items-center gap-3 py-1"
    >
      <div
        className="scenario-category-group flex items-center rounded-xl p-1 gap-1.5"
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          position: 'relative',
        }}
      >
        <div className="relative category-dropdown-container">
          <MagneticButton distance={0.15}>
            <button
              type="button"
              id="scenario-dropdown-trigger"
              onClick={() => toggleCategory('scenario')}
              aria-haspopup="true"
              aria-expanded={openCategory === 'scenario'}
              className={`scenario-category-btn px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer outline-none flex items-center gap-2 ${
                currentActiveCategory
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-transparent'
              }`}
              style={{
                boxShadow: openCategory === 'scenario' ? '0 0 0 1px var(--border)' : undefined,
              }}
            >
              <span>Scenario</span>
              <span
                className="text-[10px] opacity-80 shrink-0 transition-transform duration-200"
                style={{ transform: openCategory === 'scenario' ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
            </button>
          </MagneticButton>

          {(openCategory === 'scenario' || PRESET_CATEGORIES.some(cat => cat.id === openCategory)) && (
            <div
              role="menu"
              aria-label="Scenario categories"
              className="scenario-dropdown-menu"
            >
              <div className="scenario-dropdown-header">
                <button
                  type="button"
                  className="scenario-dropdown-back"
                  onClick={() => setOpenCategory('scenario')}
                  style={{ display: openCategory === 'scenario' ? 'none' : 'inline-flex' }}
                >
                  ← Back
                </button>
                <span className="scenario-dropdown-header-title">
                  {openCategory === 'scenario' ? 'Scenario' : PRESET_CATEGORIES.find(cat => cat.id === openCategory)?.label ?? 'Scenario'}
                </span>
                <span className="scenario-dropdown-header-count">
                  {openCategory === 'scenario' ? `${PRESET_CATEGORIES.length} groups` : `${activeCategoryPresets.length} scenarios`}
                </span>
              </div>

              {openCategory === 'scenario' ? (
                <div className="scenario-dropdown-list">
                  {PRESET_CATEGORIES.map(cat => {
                    const isCategoryActive = currentActiveCategory === cat.id;
                    const presetsForCat = SCENARIO_PRESETS.filter(p => p.category === cat.id);

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitem"
                        id={`scenario-category-${cat.id}`}
                        onClick={() => handleSelectScenarioCategory(cat.id)}
                        className={`scenario-dropdown-item ${isCategoryActive ? 'active' : ''}`}
                      >
                        <div className="scenario-dropdown-item-info" style={{ width: '100%' }}>
                          <div className="scenario-dropdown-item-name-row">
                            <span className="scenario-dropdown-item-name">{cat.label}</span>
                            {isCategoryActive && (
                              <span className="scenario-dropdown-item-check" aria-hidden="true">✓</span>
                            )}
                          </div>
                          <span className="scenario-dropdown-item-desc">
                            {presetsForCat.length} scenarios
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="scenario-dropdown-list">
                  {activeCategoryPresets.map(preset => {
                    const isPresetActive = activeProfile?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitem"
                        id={`preset-option-${preset.id}`}
                        onClick={() => handleSelectScenario(preset)}
                        className={`scenario-dropdown-item ${isPresetActive ? 'active' : ''}`}
                      >
                        <span className="scenario-dropdown-item-emoji">{preset.emoji}</span>
                        <div className="scenario-dropdown-item-info">
                          <div className="scenario-dropdown-item-name-row">
                            <span className="scenario-dropdown-item-name">{preset.shortName || preset.name}</span>
                            {preset.severity && (
                              <span className="scenario-dropdown-item-badge">{preset.severity}</span>
                            )}
                          </div>
                          <span className="scenario-dropdown-item-desc">{preset.description}</span>
                        </div>
                        {isPresetActive && (
                          <span className="scenario-dropdown-item-check" aria-hidden="true">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
