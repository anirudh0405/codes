/**
 * ContributionBreakdown — Right column, thin bar per parameter
 * Bar color tracks the risk band: low=trace, moderate=amber, high=red
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { WEIGHTS } from '../../riskEngine';

const PARAMS: { key: string; label: string }[] = [
  { key: 'bloodPressure', label: 'BP'     },
  { key: 'heartRate',     label: 'HR'     },
  { key: 'hrv',           label: 'HRV'    },
  { key: 'stress',        label: 'STRESS' },
  { key: 'qtInterval',    label: 'QTC'    },
  { key: 'stSegment',     label: 'ST-SEG' },
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
      <div className="contribution-panel-label">Contributions</div>
      {PARAMS.map(({ key, label }) => {
        const raw      = riskResult?.rawContributions[key as keyof typeof riskResult.rawContributions] ?? 0;
        const weighted = riskResult?.contributions[key as keyof typeof riskResult.contributions] ?? 0;
        const wt       = Math.round((WEIGHTS[key as keyof typeof WEIGHTS] ?? 0) * 100);
        const variant  = barVariant(raw);

        return (
          <div key={key} className="contrib-row" id={`contrib-${key}`}>
            <div className="contrib-name" title={`Weight: ${wt}%`}>
              {label}
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
    </div>
  );
}
