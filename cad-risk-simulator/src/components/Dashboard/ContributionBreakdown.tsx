/**
 * ContributionBreakdown — Right column, thin bar per parameter
 * Bar color tracks the risk band: low=trace, moderate=amber, high=red
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { WEIGHTS } from '../../riskEngine';

const PARAMS: { key: string; label: string }[] = [
  { key: 'apoB',             label: 'APOB'   },
  { key: 'bloodPressure',    label: 'BP'     },
  { key: 'smoking',          label: 'SMOKING'},
  { key: 'stress',           label: 'STRESS' },
  { key: 'heartRate',        label: 'HR'     },
  { key: 'hrv',              label: 'HRV'    },
  { key: 'qtInterval',       label: 'QTC'    },
  { key: 'stSegment',        label: 'ST-SEG' },
  { key: 'totalCholesterol', label: 'CHOL'   },
  { key: 'triglycerides',    label: 'TRIG'   },
];

function barVariant(rawVal: number): string {
  if (rawVal >= 65) return 'high';
  if (rawVal >= 35) return 'moderate';
  return '';
}

export function ContributionBreakdown() {
  const riskResult = useSimStore(s => s.riskResult);

  return (
    <div className="contribution-panel">
      <div className="contribution-panel-label">Contributions (INTERHEART Weighted)</div>
      {PARAMS.map(({ key, label }) => {
        const raw      = riskResult?.rawContributions[key as keyof typeof riskResult.rawContributions] ?? 0;
        const weighted = riskResult?.contributions[key as keyof typeof riskResult.contributions] ?? 0;
        const wt       = Math.round((WEIGHTS[key as keyof typeof WEIGHTS] ?? 0) * 100);
        const variant  = barVariant(raw);

        // Show a muted "(est.)" suffix on lipid rows to distinguish from measured signals
        const isLipid = key === 'totalCholesterol' || key === 'triglycerides';
        const displayLabel = isLipid ? `${label}*` : label;

        return (
          <div key={key} className="contrib-row" id={`contrib-${key}`}>
            <div className="contrib-name" title={isLipid ? `Weight: ${wt}% — PPG-estimated` : `Weight: ${wt}%`}>
              {displayLabel}
            </div>
            <div className="contrib-track">
              <div
                className={`contrib-fill${variant ? ' ' + variant : ''}`}
                style={{ width: `${raw}%` }}
              />
            </div>
            <div className="contrib-val">{weighted}</div>
          </div>
        );
      })}
      {/* Legend for estimated values */}
      <div style={{
        fontSize: '8px',
        color: 'var(--text-tertiary)',
        marginTop: '6px',
        paddingTop: '4px',
        borderTop: '1px solid var(--border)',
        letterSpacing: '0.05em',
      }}>
        * PPG-estimated, not measured
      </div>
    </div>
  );
}
