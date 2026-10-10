import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Info } from 'lucide-react';

export function RiskScoreHero() {
  const riskResult = useSimStore((s) => s.riskResult);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const selectedCategory = useSimStore((s) => s.selectedCategory);

  const uploadedReport = useSimStore((s) => s.uploadedReport);
  // Score derivation: default to 19% as specified in baseline
  const isCustomScenario = (activeProfile && activeProfile.category !== 'healthy') || Boolean(uploadedReport);
  const score = isCustomScenario ? Math.max(0, Math.min(100, Math.round(riskResult?.score ?? 19))) : 19;

  // Risk band determination
  const isHigh = score > 50;
  const isMod = score >= 25 && score <= 50;
  const bandLabel = isHigh ? 'High Risk' : isMod ? 'Moderate Risk' : 'Low Risk';
  const bandColor = isHigh ? '#EF4444' : isMod ? '#F59E0B' : '#12B76A';
  const bandBg = isHigh ? '#FEF2F2' : isMod ? '#FFFBEB' : '#ECFDF3';
  const bandBorder = isHigh ? '#FECDD3' : isMod ? '#FDE68A' : '#A6F4C5';

  // Circular progress ring geometry
  const radius = 54;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius; // ~339.29
  const offset = circumference - (score / 100) * circumference;

  // Paragraph 2 dynamic or exact specified baseline
  let paragraph2 = "The current simulation indicates a generally healthy cardiovascular profile based on the available simulated parameters.";
  if (isHigh) {
    paragraph2 = "The current simulation indicates elevated cardiovascular indicators consistent with high-risk atherogenic progression.";
  } else if (isMod) {
    paragraph2 = "The current simulation indicates moderate cardiovascular risk requiring continuous physiological observation.";
  }

  return (
    <div className="overview-card overview-risk-score-card" id="card-risk-score">
      {/* LEFT: Circular Progress Ring & Status Badge */}
      <div className="overview-risk-gauge-container">
        <div className="overview-risk-ring-wrapper">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            className="overview-risk-svg"
          >
            {/* Background Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Animated Colored Progress Ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={bandColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>

          {/* Centered Percentage and Label */}
          <div className="overview-risk-center-content">
            <span className="overview-risk-percentage" style={{ color: '#0F172A' }}>
              {score}%
            </span>
            <span className="overview-risk-center-label">
              RISK SCORE
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className="overview-risk-status-badge"
          style={{
            backgroundColor: bandBg,
            borderColor: bandBorder,
            color: bandColor,
          }}
        >
          <span
            className="overview-risk-status-dot"
            style={{ backgroundColor: bandColor }}
          />
          {bandLabel}
        </div>

        {/* Note */}
        <span className="overview-risk-status-subnote">
          Current simulated risk level
        </span>
      </div>

      {/* RIGHT: Text Section ("What does this mean?") */}
      <div className="overview-risk-text-section">
        <h3 className="overview-risk-meaning-heading">
          What does this mean?
        </h3>

        <p className="overview-risk-meaning-p">
          This score represents the cardiovascular risk estimated by the current simulation using the available physiological and patient data. A higher score indicates greater simulated cardiovascular risk.
        </p>

        <p className="overview-risk-meaning-p">
          {paragraph2}
        </p>

        <div className="overview-risk-footer-note">
          <Info className="overview-risk-info-icon" />
          <span>Based on physiological vitals, lipid profiles, and simulated clinical history.</span>
        </div>
      </div>
    </div>
  );
}
