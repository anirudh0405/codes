import React from 'react';
import { useSimStore } from '@/store/simStore';

export function DiseaseRiskSection() {
  const storeSubScores = useSimStore((s) => s.diseaseSubScores);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const uploadedReport = useSimStore((s) => s.uploadedReport);
  const hasAppliedReport = uploadedReport?.status === 'applied';
  const isCustomScenario = (activeProfile && activeProfile.category !== 'healthy') || hasAppliedReport;

  const cadScore = isCustomScenario && storeSubScores ? Math.round(storeSubScores.atherosclerosis) : 30;
  const iscScore = isCustomScenario && storeSubScores ? Math.round(storeSubScores.myocardialIschemia) : 0;
  const arrScore = isCustomScenario && storeSubScores ? Math.round(storeSubScores.arrhythmia) : 0;
  const hhdScore = isCustomScenario && storeSubScores ? Math.round(storeSubScores.hypertensiveHeartDisease) : 6;
  const hfScore = isCustomScenario && storeSubScores ? Math.round(storeSubScores.heartFailure) : 4;

  const conditions = [
    {
      id: 'cad',
      name: 'Coronary Artery Disease (CAD)',
      score: cadScore,
      barColor: '#F59E0B', // Highlighted/Orange bar
      textColor: '#D97706',
      isHighlighted: true,
    },
    {
      id: 'isc',
      name: 'Myocardial Ischemia',
      score: iscScore,
      barColor: '#10B981', // Green bar
      textColor: '#059669',
      isHighlighted: false,
    },
    {
      id: 'arr',
      name: 'Cardiac Arrhythmia',
      score: arrScore,
      barColor: '#10B981', // Green bar
      textColor: '#059669',
      isHighlighted: false,
    },
    {
      id: 'hhd',
      name: 'Hypertensive Heart Disease',
      score: hhdScore,
      barColor: '#10B981', // Green bar
      textColor: '#059669',
      isHighlighted: false,
    },
    {
      id: 'hf',
      name: 'Heart Failure',
      score: hfScore,
      barColor: '#10B981', // Green bar
      textColor: '#059669',
      isHighlighted: false,
    },
  ];

  return (
    <div className="overview-card overview-disease-card" id="card-disease-risk">
      {/* Header: Disease-Specific Risk | Subheader: SIMULATED MODEL */}
      <div className="overview-disease-header">
        <div className="overview-disease-title-group">
          <h3 className="overview-disease-title">
            Disease-Specific Risk
          </h3>
          <span className="overview-disease-subheader">
            SIMULATED MODEL
          </span>
        </div>
      </div>

      {/* Note */}
      <p className="overview-disease-note">
        Relative risk levels across specific cardiovascular conditions in the simulator.
      </p>

      {/* List of conditions with progress indicators/percentages */}
      <div className="overview-disease-list">
        {conditions.map((cond) => (
          <div key={cond.id} className="overview-disease-item" id={`disease-item-${cond.id}`}>
            <div className="overview-disease-label-row">
              <span className={`overview-disease-name ${cond.isHighlighted ? 'overview-disease-name-highlighted' : ''}`}>
                {cond.name}
              </span>
              <span
                className="overview-disease-percentage font-tabular"
                style={{ color: cond.textColor }}
              >
                {cond.score}%
              </span>
            </div>

            {/* Progress track */}
            <div className="overview-disease-track">
              <div
                className="overview-disease-fill"
                style={{
                  width: `${Math.max(cond.score, cond.score > 0 ? 3 : 0)}%`,
                  backgroundColor: cond.barColor,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
