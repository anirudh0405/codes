/**
 * ApoB Card — Dashboard Readout
 * ==============================
 * Displays the calculated ApoB estimate and derived lipid panel values
 * (Non-HDL-C, LDL-C via Friedewald) from the Lab Report inputs.
 *
 * Styling: uses panel-card-alt — same surface as the existing PPG lipid
 * readout cards. No new colors introduced.
 *
 * Source data: labInputs and apoBPanel from the Zustand store.
 * These are populated by the ControlPanel's Lab Report section and are
 * NOT produced by the sensor fusion pipeline.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';

export function ApoBCard() {
  const { apoBPanel, labInputs } = useSimStore(
    useShallow((s) => ({
      apoBPanel: s.apoBPanel,
      labInputs: s.labInputs,
    }))
  );

  const { apoB, ldl, nonHDL, friedewaldValid } = apoBPanel;

  // ApoB clinical thresholds (AHA/ACC 2018; ESC/EAS 2019):
  // < 80 mg/dL  — near-optimal / low risk
  // 80–99 mg/dL — borderline
  // ≥ 100 mg/dL — elevated (primary treatment target threshold)
  const apoBColor =
    apoB >= 100
      ? 'var(--alert-red)'
      : apoB >= 80
      ? 'var(--alert-amber)'
      : 'var(--text-secondary)';

  const apoBLabel =
    apoB >= 100 ? '⚠ Elevated' : apoB >= 80 ? 'Borderline' : 'Near-Optimal';

  return (
    <div id="readout-apob" className="panel-card-alt flex flex-col justify-between" style={{ padding: 'var(--space-md)' }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="eyebrow-label">ApoB (est.)</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          Non-HDL regression
        </span>
      </div>

      {/* Primary value */}
      <div
        className="flex items-baseline"
        style={{ gap: 'var(--space-xs)', margin: 'var(--space-sm) 0' }}
      >
        <span
          className="text-[22px] font-semibold tabular-nums"
          style={{ color: apoBColor }}
        >
          {apoB.toFixed(1)}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          mg/dL
        </span>
      </div>

      {/* Sub-label */}
      <span className="text-[11px]" style={{ color: apoBColor }}>
        {apoBLabel}
      </span>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          margin: 'var(--space-sm) 0',
        }}
      />

      {/* Derived values row */}
      <div className="flex flex-col" style={{ gap: 4 }}>
        {/* Non-HDL-C */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Non-HDL-C
          </span>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {nonHDL.toFixed(0)} mg/dL
          </span>
        </div>

        {/* LDL-C (Friedewald) */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            LDL-C (Friedewald)
          </span>
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{
              color: friedewaldValid ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {friedewaldValid ? `${ldl.toFixed(0)} mg/dL` : 'N/A (TG > 400)'}
          </span>
        </div>

        {/* Inputs used */}
        <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
          <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
            TC {labInputs.totalCholesterol} · HDL {labInputs.hdl} · TG {labInputs.triglycerides}
            {labInputs.trigsManuallySet ? ' (lab)' : ' (PPG est.)'}
          </span>
        </div>
      </div>

      {/* Formula attribution */}
      <span
        className="text-[9px]"
        style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.3 }}
      >
        Calculated from Total Cholesterol, HDL, Triglycerides
        <br />
        Sniderman et al. (2012) Non-HDL-C regression · Not a direct lab measurement
      </span>
    </div>
  );
}
