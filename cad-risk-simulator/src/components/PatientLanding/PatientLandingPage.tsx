import React, { useState } from 'react';
import { useSimStore } from '@/store/simStore';
import { PatientHeader } from './PatientHeader';
import { PatientHeroScenario } from './PatientHeroScenario';
import { RiskScoreHero } from './RiskScoreHero';
import { CardiovascularMetricsHierarchy } from './CardiovascularMetricsHierarchy';
import { InsightsSection } from './InsightsSection';
import { RiskTrendSection } from './RiskTrendSection';
import { DiseaseRiskSection } from './DiseaseRiskSection';
import { ReportUploadModal } from './ReportUploadModal';
import { UploadCloud, FileText, ShieldCheck } from 'lucide-react';
import './PatientLanding.css';

interface PatientLandingPageProps {
  onOpenDashboard: () => void;
}

export function PatientLandingPage({ onOpenDashboard }: PatientLandingPageProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Determine whether a report has been successfully processed
  const uploadedReport = useSimStore((s) => s.uploadedReport);
  const hasAppliedReport = uploadedReport?.status === 'applied';

  return (
    <div className="overview-page" id="patient-landing-page">
      {/* 1. HEADER & TOP BAR */}
      <PatientHeader
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenDashboard={onOpenDashboard}
      />

      {hasAppliedReport ? (
        <>
          {/* ── POST-UPLOAD: Full patient overview ──────────────────── */}

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
        </>
      ) : (
        <>
          {/* ── PRE-UPLOAD: Empty state with upload interface ───────── */}
          <main className="overview-main-container overview-empty-state-container">
            <div className="overview-empty-state">
              {/* Icon */}
              <div className="overview-empty-icon-wrap">
                <ShieldCheck className="overview-empty-icon" />
              </div>

              {/* Title */}
              <h2 className="overview-empty-title">Patient Overview</h2>

              {/* Description */}
              <p className="overview-empty-desc">
                Upload a clinical or laboratory report to view your cardiovascular health
                assessment, risk scores, trends, and personalized recommendations.
              </p>

              {/* Inline Upload Drop Zone */}
              <div
                className="overview-empty-dropzone"
                onClick={() => setUploadModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setUploadModalOpen(true); }}
              >
                <div className="overview-empty-dropzone-icon-box">
                  <UploadCloud style={{ width: 28, height: 28, strokeWidth: 1.8 }} />
                </div>
                <div className="overview-empty-dropzone-text">
                  <span className="overview-empty-dropzone-title">
                    Click to upload a clinical report
                  </span>
                  <span className="overview-empty-dropzone-subtitle">
                    or drag and drop a file into the upload dialog
                  </span>
                </div>
                <div className="overview-empty-dropzone-formats">
                  <span>PDF</span>
                  <span className="overview-empty-dropzone-dot">•</span>
                  <span>JPG</span>
                  <span className="overview-empty-dropzone-dot">•</span>
                  <span>PNG</span>
                  <span className="overview-empty-dropzone-dot">•</span>
                  <span>TXT</span>
                </div>
              </div>

              {/* Processing / error state indicator */}
              {uploadedReport?.status === 'analyzing' && (
                <div className="overview-empty-status overview-empty-status-processing">
                  <div className="overview-empty-spinner" />
                  <span>{uploadedReport.analysisStatusText || 'Processing report...'}</span>
                </div>
              )}
              {uploadedReport?.status === 'error' && (
                <div className="overview-empty-status overview-empty-status-error">
                  <span className="overview-empty-status-error-icon">⚠</span>
                  <span>{uploadedReport.analysisStatusText || 'Failed to process report.'}</span>
                </div>
              )}

              {/* Privacy note */}
              <div className="overview-empty-privacy">
                <FileText style={{ width: 13, height: 13 }} />
                <span>Private · All processing is performed locally in your browser</span>
              </div>
            </div>
          </main>
        </>
      )}

      {/* 4. Report Upload Modal */}
      <ReportUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
