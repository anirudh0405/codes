import React from 'react';
import { useSimStore } from '@/store/simStore';

export function PatientSummary() {
  const patientProfile = useSimStore((s) => s.patientProfile);
  const activeProfile = useSimStore((s) => s.activeProfile);
  const selectedCategory = useSimStore((s) => s.selectedCategory);
  const uploadedReport = useSimStore((s) => s.uploadedReport);

  // Extract patient ID safely
  const patientId =
    uploadedReport?.patientName && uploadedReport.patientName.startsWith('P-')
      ? uploadedReport.patientName
      : typeof window !== 'undefined' && window.sessionStorage?.getItem('arohan_patient_id')
      ? window.sessionStorage.getItem('arohan_patient_id')!
      : 'PT-001';

  // Age formatting
  const ageDisplay = patientProfile.ageRange || 'Not available';

  // Gender formatting
  const genderDisplay =
    patientProfile.sex === 'male'
      ? 'Male'
      : patientProfile.sex === 'female'
      ? 'Female'
      : 'Not available';

  // Location: strictly "Not available" if not defined in patientProfile
  const locationDisplay = (patientProfile as any).location ?? 'Not available';

  // Current Scenario Name & Category
  let scenarioName = 'Healthy — Baseline';
  let scenarioCategory = selectedCategory ?? 'healthy';

  if (activeProfile) {
    scenarioName = activeProfile.name;
    scenarioCategory = activeProfile.category;
  } else if (selectedCategory === 'cad') {
    scenarioName = 'CAD / Cardiac Concern';
  } else if (selectedCategory === 'cvd') {
    scenarioName = 'CVD / Cardiovascular Profile';
  } else if (selectedCategory === 'healthy') {
    scenarioName = 'Healthy Profile';
  }

  // Pill styling based on scenario
  let pillStyle = {
    bg: '#F0FDF4',
    text: '#166534',
    border: '#BBF7D0',
    dot: '#22C55E',
  };
  if (scenarioCategory === 'cad') {
    pillStyle = {
      bg: '#FEF2F2',
      text: '#991B1B',
      border: '#FECACA',
      dot: '#EF4444',
    };
  } else if (scenarioCategory === 'cvd') {
    pillStyle = {
      bg: '#FFFBEB',
      text: '#92400E',
      border: '#FDE68A',
      dot: '#F59E0B',
    };
  }

  return (
    <section className="pl-summary-card" aria-label="Patient Overview Summary">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="pl-summary-item">
          <span className="pl-summary-label">Patient ID</span>
          <span className="pl-summary-value font-mono">{patientId}</span>
        </div>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="pl-summary-item">
          <span className="pl-summary-label">Age</span>
          <span className="pl-summary-value">{ageDisplay}</span>
        </div>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="pl-summary-item">
          <span className="pl-summary-label">Gender</span>
          <span className="pl-summary-value">{genderDisplay}</span>
        </div>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="pl-summary-item">
          <span className="pl-summary-label">Location</span>
          <span className="pl-summary-value">{locationDisplay}</span>
        </div>
      </div>

      {/* Scenario Pill */}
      <div className="flex items-center gap-3">
        <div className="pl-summary-item items-end">
          <span className="pl-summary-label">Current Scenario</span>
          <div
            className="pl-scenario-pill border"
            style={{
              backgroundColor: pillStyle.bg,
              color: pillStyle.text,
              borderColor: pillStyle.border,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: pillStyle.dot }}
            />
            <span>{scenarioName}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
