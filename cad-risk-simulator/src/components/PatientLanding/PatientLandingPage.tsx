import React, { useState } from 'react';
import { PatientHeader } from './PatientHeader';
import { PatientHeroScenario } from './PatientHeroScenario';
import { RiskScoreHero } from './RiskScoreHero';
import { CardiovascularMetricsHierarchy } from './CardiovascularMetricsHierarchy';
import { InsightsSection } from './InsightsSection';
import { RiskTrendSection } from './RiskTrendSection';
import { DiseaseRiskSection } from './DiseaseRiskSection';
import { ReportUploadModal } from './ReportUploadModal';
import './PatientLanding.css';

interface PatientLandingPageProps {
  onOpenDashboard: () => void;
}

export function PatientLandingPage({ onOpenDashboard }: PatientLandingPageProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <div className="overview-page" id="patient-landing-page">
      {/* 1. HEADER & TOP BAR */}
      <PatientHeader
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenDashboard={onOpenDashboard}
      />

      {/* 2. PATIENT META BAR (Horizontal Summary Strip) */}
      <PatientHeroScenario />

      {/* 3. MAIN 2-COLUMN GRID LAYOUT */}
      <main className="overview-main-container">
        <div className="overview-grid-layout">
          {/* Left Column */}
          <div className="overview-col-left">
            {/* 1. Risk Score Hero Card */}
            <RiskScoreHero />

            {/* 2. Vitals Cards Row (6 metric cards, each labeled CURRENT) */}
            <CardiovascularMetricsHierarchy />

            {/* 3. Personalized Wellness Insights Section (Header: GENERAL GUIDANCE) */}
            <InsightsSection />
          </div>

          {/* Right Column */}
          <div className="overview-col-right">
            {/* 1. 7-Day Risk Trend Card (HISTORICAL DATA) */}
            <RiskTrendSection />

            {/* 2. Disease-Specific Risk Card (SIMULATED MODEL) */}
            <DiseaseRiskSection />
          </div>
        </div>
      </main>

      {/* 4. Report Upload Modal */}
      <ReportUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
