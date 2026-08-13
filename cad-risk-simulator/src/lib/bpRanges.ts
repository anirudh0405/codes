/**
 * Clinical Blood Pressure Range & Classification Standards
 * Based on AHA / ACC / WHO Hypertension Guidelines:
 *  - Normal / Healthy: < 120 mmHg Systolic AND < 80 mmHg Diastolic
 *  - Elevated: 120–129 mmHg Systolic AND < 80 mmHg Diastolic
 *  - Stage 1 Hypertension (Moderate Risk): 130–139 mmHg Systolic OR 80–89 mmHg Diastolic
 *  - Stage 2 Hypertension (High Risk): ≥ 140 mmHg Systolic OR ≥ 90 mmHg Diastolic
 */

export interface BPRangeClassification {
  category: 'healthy' | 'elevated' | 'stage1' | 'stage2';
  label: string;            // "Normal / Healthy BP" | "Elevated BP" | "Stage 1 Hypertensive" | "Stage 2 Hypertensive"
  shortLabel: string;       // "Healthy" | "Elevated" | "Stage 1 Risk" | "Stage 2 Risk"
  rangeText: string;        // "< 120 / < 80 mmHg" | "120–129 / < 80 mmHg" | "130–139 / 80–89 mmHg" | "≥ 140 / ≥ 90 mmHg"
  healthyRangeText: string; // "Healthy: <120/80 mmHg"
  riskRangeText: string;    // "Risk: ≥130/80 mmHg"
  color: string;            // CSS color
}

export const BP_REFERENCE_RANGES = {
  healthy:  { label: 'Healthy (Normal)', range: '< 120 / < 80 mmHg', color: 'var(--risk-low, #10b981)' },
  elevated: { label: 'Elevated',         range: '120–129 / < 80 mmHg', color: 'var(--alert-amber, #eab308)' },
  stage1:   { label: 'Stage 1 Risk',     range: '130–139 / 80–89 mmHg', color: 'var(--risk-moderate, #f59e0b)' },
  stage2:   { label: 'Stage 2 Risk',     range: '≥ 140 / ≥ 90 mmHg', color: 'var(--risk-high, #ef4444)' },
};

export function classifyBP(systolic: number, diastolic: number = 80): BPRangeClassification {
  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: 'stage2',
      label: 'Stage 2 Hypertensive',
      shortLabel: 'Stage 2 Risk',
      rangeText: '≥ 140 / ≥ 90 mmHg',
      healthyRangeText: 'Healthy: <120/80 mmHg',
      riskRangeText: 'High Risk: ≥140/90 mmHg',
      color: 'var(--risk-high, #ef4444)',
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      category: 'stage1',
      label: 'Stage 1 Hypertensive',
      shortLabel: 'Stage 1 Risk',
      rangeText: '130–139 / 80–89 mmHg',
      healthyRangeText: 'Healthy: <120/80 mmHg',
      riskRangeText: 'Moderate Risk: 130–139/80–89 mmHg',
      color: 'var(--risk-moderate, #f59e0b)',
    };
  }
  if (systolic >= 120) {
    return {
      category: 'elevated',
      label: 'Elevated BP',
      shortLabel: 'Elevated',
      rangeText: '120–129 / < 80 mmHg',
      healthyRangeText: 'Healthy: <120/80 mmHg',
      riskRangeText: 'Elevated: 120–129/<80 mmHg',
      color: 'var(--alert-amber, #eab308)',
    };
  }
  return {
    category: 'healthy',
    label: 'Normal / Healthy BP',
    shortLabel: 'Healthy',
    rangeText: '< 120 / < 80 mmHg',
    healthyRangeText: 'Healthy: <120/80 mmHg',
    riskRangeText: 'Risk Threshold: ≥130/80 mmHg',
    color: 'var(--risk-low, #10b981)',
  };
}
