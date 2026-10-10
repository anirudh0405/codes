import React from 'react';
import { useSimStore } from '@/store/simStore';

export function PatientHeroScenario() {
  const patientProfile = useSimStore((s) => s.patientProfile);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const selectedCategory = useSimStore((s) => s.selectedCategory);
  const uploadedReport = useSimStore((s) => s.uploadedReport);
  const riskResult = useSimStore((s) => s.riskResult);

  // Patient ID strictly from existing store or default PT-001
  const patientId =
    uploadedReport?.patientId
      ? uploadedReport.patientId
      : uploadedReport?.patientName && uploadedReport.patientName.startsWith('P-')
        ? uploadedReport.patientName
        : typeof window !== 'undefined' && window.sessionStorage?.getItem('arohan_patient_id')
          ? window.sessionStorage.getItem('arohan_patient_id')!
          : 'PT-001';

  // Age formatting
  const ageDisplay = patientProfile.ageRange || '40-49';

  // Gender formatting
  const genderDisplay =
    patientProfile.sex === 'male'
      ? 'Male'
      : patientProfile.sex === 'female'
        ? 'Female'
        : 'Male';

  // Location formatting
  const locationDisplay = (patientProfile as any).location ?? 'Not available';

  // Current Scenario
  let scenarioName = 'Healthy — Baseline';
  let isHealthy = true;

  if (activeProfile) {
    scenarioName = activeProfile.name;
    isHealthy = activeProfile.category === 'healthy';
  } else if (selectedCategory === 'cad') {
    scenarioName = 'CAD / Cardiac Concern';
    isHealthy = false;
  } else if (selectedCategory === 'cvd') {
    scenarioName = 'Cardiovascular Concern';
    isHealthy = false;
  }

  const dotColor = isHealthy ? '#12B76A' : riskResult?.band === 'High' ? '#EF4444' : '#F59E0B';
  const pillBg = isHealthy ? '#ECFDF3' : riskResult?.band === 'High' ? '#FEF2F2' : '#FFFBEB';
  const pillBorder = isHealthy ? '#A6F4C5' : riskResult?.band === 'High' ? '#FECDD3' : '#FDE68A';
  const pillColor = isHealthy ? '#027A48' : riskResult?.band === 'High' ? '#B42318' : '#B54708';

  return (
    <section className="overview-patient-strip" aria-label="Patient and Scenario Strip">
      {/* Left: 4 inline data fields */}
      <div className="overview-patient-strip-left">
        <div className="overview-patient-field">
          <span className="overview-patient-field-label">PATIENT ID:</span>
          <span className="overview-patient-field-value font-tabular">{patientId}</span>
        </div>

        <div className="overview-patient-divider" />

        <div className="overview-patient-field">
          <span className="overview-patient-field-label">AGE:</span>
          <span className="overview-patient-field-value">{ageDisplay}</span>
        </div>

        <div className="overview-patient-divider" />

        <div className="overview-patient-field">
          <span className="overview-patient-field-label">GENDER:</span>
          <span className="overview-patient-field-value">{genderDisplay}</span>
        </div>

        {/* Location commented out for now
        <div className="overview-patient-divider" />

        <div className="overview-patient-field">
          <span className="overview-patient-field-label">LOCATION:</span>
          <span className="overview-patient-field-value">{locationDisplay}</span>
        </div>
        */}
      </div>

      {/* Right: CURRENT SCENARIO: Healthy — Baseline (with green indicator dot) */}
      <div className="overview-patient-strip-right">
        <span className="overview-scenario-eyebrow-text">CURRENT SCENARIO:</span>
        <div
          className="overview-scenario-pill"
          style={{
            backgroundColor: pillBg,
            borderColor: pillBorder,
            color: pillColor,
          }}
        >
          <span className="overview-scenario-dot" style={{ backgroundColor: dotColor }} />
          <span>{scenarioName}</span>
        </div>
      </div>
    </section>
  );
}
