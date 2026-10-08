import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Badge } from '@/components/ui/badge';

export function RiskOverview() {
  const riskResult = useSimStore((s) => s.riskResult);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const selectedCategory = useSimStore((s) => s.selectedCategory);

  // Exact simulated score and classification from existing store
  const rawScore = riskResult?.score ?? 0;
  const score = Math.round(rawScore);
  const band = riskResult?.band ?? 'Low';

  // Band styling & semantics
  let bandBadgeVariant: 'success' | 'warning' | 'destructive' = 'success';
  let arcColor = '#16A34A'; // emerald
  let arcBgColor = '#DCFCE7';

  if (band === 'High') {
    bandBadgeVariant = 'destructive';
    arcColor = '#DC2626';
    arcBgColor = '#FEE2E2';
  } else if (band === 'Moderate') {
    bandBadgeVariant = 'warning';
    arcColor = '#D97706';
    arcBgColor = '#FEF3C7';
  }

  // SVG Gauge calculation (clean circle radius 58, perimeter ~364)
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Scenario-aware contextual explanation
  let scenarioInsight =
    'The current simulation indicates a generally healthy cardiovascular profile based on the available simulated parameters.';

  const category = activeProfile?.category ?? selectedCategory;
  if (category === 'cad') {
    scenarioInsight =
      'The simulation currently shows cardiovascular patterns associated with coronary artery disease risk.';
  } else if (category === 'cvd') {
    const diseaseName = activeProfile?.name ?? 'cardiovascular';
    scenarioInsight = `The simulation currently shows patterns associated with ${diseaseName.toLowerCase()} risk.`;
  }

  return (
    <div className="pl-card" aria-label="Cardiovascular Risk Assessment">
      <div className="pl-risk-card-content">
        {/* Left: Large circular arc risk indicator */}
        <div className="pl-gauge-container">
          <div className="pl-gauge-circle">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              {/* Colored Indicator Arc */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={arcColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Centered Score */}
            <div className="pl-gauge-number-wrap">
              <span className="pl-gauge-score" style={{ color: arcColor }}>
                {score}%
              </span>
              <span className="pl-gauge-title">Risk Score</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 mt-2">
            <Badge variant={bandBadgeVariant} className="text-xs px-2.5 py-0.5 font-semibold">
              {band} Risk
            </Badge>
            <span className="text-[10px] text-slate-500 font-medium">
              Current simulated risk level
            </span>
          </div>
        </div>

        {/* Right: Patient-friendly explanation */}
        <div className="pl-risk-explanation-wrap">
          <div className="flex items-center gap-2">
            <h4 className="pl-risk-explanation-title">What does this mean?</h4>
          </div>

          <p className="pl-risk-explanation-text">
            This score represents the cardiovascular risk estimated by the current simulation using the available physiological and patient data. A higher score indicates greater simulated cardiovascular risk.
          </p>

          <p className="pl-risk-explanation-text font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
            {scenarioInsight}
          </p>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Based on physiological vitals, lipid profiles, and simulated clinical history.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
