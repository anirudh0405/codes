/**
 * Lp(a) Card — Dashboard Readout
 * ================================
 * Displays the manually-entered Lipoprotein(a) [Lp(a)] value from the Lab
 * Report section. Unlike the ApoB card (which is derived via regression) or
 * the PPG lipid cards (which are optically estimated), Lp(a) here is a direct
 * manual user entry — so this card is deliberately labelled "Manual entry"
 * rather than "est." to make that distinction unambiguous to the reader.
 *
 * Risk thresholds (AHA/ACC 2018; ESC/EAS 2019 consensus):
 *   ≥ 50 mg/dL  — Elevated  (independent cardiovascular risk factor)
 *   30–49 mg/dL — Borderline
 *   < 30 mg/dL  — Normal
 *
 * Reference: Ashavaid TF, Kondkar AA, Todur SP, Dherai AJ, Morey J, Raghavan R.
 *   "Lipid, lipoprotein, apolipoprotein and lipoprotein(a) levels: reference
 *   intervals in a healthy Indian population."
 *   J Atheroscler Thromb. 2005;12(5):251-259.
 *
 * Styling: panel-card-alt — identical surface to ApoBCard. No new design tokens.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';
import { RangeIndicator } from '../RangeIndicator';

export function LpaCard() {
  const lpa = useSimStore(useShallow((s) => s.labInputs.lpa));

  // AHA/ACC 2018; ESC/EAS 2019 Lp(a) risk thresholds
  const lpaColor =
    lpa >= 50
      ? 'var(--alert-red)'
      : lpa >= 30
      ? 'var(--alert-amber)'
      : 'var(--text-secondary)';

  const lpaLabel =
    lpa >= 50 ? '⚠ Elevated' : lpa >= 30 ? 'Borderline' : 'Normal';

  return (
    <div id="readout-lpa" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="eyebrow-label">Lipoprotein(a) [Lp(a)]</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Manual entry
        </span>
      </div>

      {/* Primary value */}
      <div
        className="flex items-baseline"
        style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}
      >
        <span
          className="text-[22px] font-semibold tabular-nums"
          style={{ color: lpaColor }}
        >
          {lpa.toFixed(1)}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          mg/dL
        </span>
      </div>

      {/* Risk sub-label */}
      <span className="text-[11px]" style={{ color: lpaColor }}>
        {lpaLabel}
      </span>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          margin: 'var(--space-sm) 0',
        }}
      />

      {/* Threshold context */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Elevated threshold
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            ≥ 50 mg/dL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Borderline
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            30 – 49 mg/dL
          </span>
        </div>
      </div>

      {/* Reference range indicator */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 'var(--space-xs)', paddingTop: 'var(--space-xs)' }}>
        <RangeIndicator rangeKey="lpA" value={lpa} />
      </div>

      {/* Reference attribution */}
      <span
        className="text-[9px]"
        style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.3 }}
      >
        Reference: 12.9 mg/dL (healthy) · Ashavaid et al., J Atheroscler Thromb 2005
        <br />
        AHA/ESC 2019 risk thresholds · Not derived — direct lab value only
      </span>
    </div>
  );
}
