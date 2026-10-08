import React from 'react';
import { useSimStore } from '@/store/simStore';

export function ClinicalParametersSummary() {
  const params = useSimStore((s) => s.params);
  const snapshot = useSimStore((s) => s.snapshot);
  const activeDiseaseParams = useSimStore((s) => s.activeDiseaseParams);
  const labInputs = useSimStore((s) => s.labInputs);
  const apoBPanel = useSimStore((s) => s.apoBPanel);
  const fai = useSimStore((s) => s.fai);
  const cac = useSimStore((s) => s.cac);

  // Derive parameters directly from store
  const heartRate = snapshot?.heartRate ?? params.heartRate;
  const systolic = snapshot?.systolic ?? params.systolic;
  const diastolic = snapshot?.diastolic ?? params.diastolic;
  const hrv = snapshot?.hrv ?? params.hrv;

  // SpO2 derivation
  let spo2Value = '98%';
  if (activeDiseaseParams && activeDiseaseParams['SpO₂']) {
    spo2Value = String(activeDiseaseParams['SpO₂']);
    if (!spo2Value.endsWith('%')) spo2Value += '%';
  }

  // Left Column Parameters
  const hrVal = heartRate ? Math.round(heartRate) : 70;
  const hrPill =
    hrVal >= 60 && hrVal <= 100
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : hrVal > 110 || hrVal < 50
        ? { label: 'Abnormal', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' }
        : { label: 'Borderline', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' };

  const sysVal = systolic ? Math.round(systolic) : 120;
  const diaVal = diastolic ? Math.round(diastolic) : 80;
  const bpPill =
    sysVal < 125
      ? { label: 'Optimal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : sysVal >= 140
        ? { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' }
        : { label: 'Borderline', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' };

  const hrvVal = hrv ? Math.round(hrv) : 55;
  const hrvPill =
    hrvVal >= 45
      ? { label: 'Healthy', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : hrvVal < 30
        ? { label: 'Low Reserve', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' }
        : { label: 'Moderate', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' };

  const spo2Num = parseInt(spo2Value.replace('%', ''), 10) || 98;
  const spo2Pill =
    spo2Num >= 95
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : { label: 'Suboptimal', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' };

  const stressVal = Math.round(params.stressScore ?? 25);
  const stressPill =
    stressVal <= 35
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : stressVal <= 65
        ? { label: 'Moderate', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const qtcVal = Math.round(params.qtInterval ?? 410);
  const qtcPill =
    qtcVal <= 440
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : qtcVal <= 470
        ? { label: 'Borderline', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Prolonged', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  // Right Column Parameters
  const cholVal = Math.round(labInputs.totalCholesterol ?? 175);
  const cholPill =
    cholVal < 200
      ? { label: 'Desirable', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : cholVal < 240
        ? { label: 'Borderline', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const trigVal = Math.round(labInputs.triglycerides ?? 110);
  const trigPill =
    trigVal < 150
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : trigVal < 200
        ? { label: 'Borderline', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const apoBVal = Math.round(apoBPanel.apoB ?? 80);
  const apoBPill =
    apoBVal < 90
      ? { label: 'Optimal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : apoBVal < 110
        ? { label: 'Moderate', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const ldlVal = Math.round(apoBPanel.ldl ?? 95);
  const ldlPill =
    ldlVal < 100
      ? { label: 'Optimal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : ldlVal < 130
        ? { label: 'Moderate', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const faiPill =
    fai < -70.1
      ? { label: 'Normal', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : { label: 'Inflammation', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' };

  const cacVal = Math.round(cac);
  const cacPill =
    cacVal === 0
      ? { label: 'Zero Plaque', bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' }
      : cacVal < 100
        ? { label: 'Mild Plaque', bg: 'var(--risk-mod-bg)', color: 'var(--risk-mod)' }
        : { label: 'Elevated', bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' };

  const leftParams = [
    { name: 'Heart Rate', value: `${hrVal} bpm`, pill: hrPill },
    { name: 'Blood Pressure', value: `${sysVal} / ${diaVal} mmHg`, pill: bpPill },
    { name: 'HRV RMSSD', value: `${hrvVal} ms`, pill: hrvPill },
    { name: 'Blood Oxygen (SpO₂)', value: `${spo2Value}`, pill: spo2Pill },
    { name: 'Stress Index', value: `${stressVal} / 100`, pill: stressPill },
    { name: 'QTc Interval', value: `${qtcVal} ms`, pill: qtcPill },
  ];

  const rightParams = [
    { name: 'Total Cholesterol', value: `${cholVal} mg/dL`, pill: cholPill },
    { name: 'Triglycerides', value: `${trigVal} mg/dL`, pill: trigPill },
    { name: 'ApoB', value: `${apoBVal} mg/dL`, pill: apoBPill },
    { name: 'LDL Cholesterol', value: `${ldlVal} mg/dL`, pill: ldlPill },
    { name: 'Fat Attenuation Index', value: `${fai.toFixed(1)} HU`, pill: faiPill },
    { name: 'Coronary Calcium Score', value: `${cacVal} Agatston`, pill: cacPill },
  ];

  return (
    <div className="order-mobile-7" aria-label="Clinical Parameters Summary">
      <div className="overview-card" id="card-clinical-summary" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="overview-params-header">
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>
            Clinical Parameters Summary
          </span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--t3)' }}>
            All monitored values
          </span>
        </div>

        {/* 2-Column Grid of Rows */}
        <div className="overview-params-grid">
          {/* Left Column */}
          <div className="overview-params-col">
            {leftParams.map((item, idx) => (
              <div key={idx} className="overview-params-row">
                <span className="overview-params-row-name">{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="overview-params-row-val font-tabular">{item.value}</span>
                  <span
                    className="overview-params-pill"
                    style={{ backgroundColor: item.pill.bg, color: item.pill.color }}
                  >
                    {item.pill.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="overview-params-col overview-params-col-right">
            {rightParams.map((item, idx) => (
              <div key={idx} className="overview-params-row">
                <span className="overview-params-row-name">{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="overview-params-row-val font-tabular">{item.value}</span>
                  <span
                    className="overview-params-pill"
                    style={{ backgroundColor: item.pill.bg, color: item.pill.color }}
                  >
                    {item.pill.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
