import React from 'react';
import { useSimStore } from '@/store/simStore';
import { Heart, Stethoscope, Activity, Droplet, Tag, Star } from 'lucide-react';

export function CardiovascularMetricsHierarchy() {
  const params = useSimStore((s) => s.params);
  const snapshot = useSimStore((s) => s.snapshot);
  const activeDiseaseParams = useSimStore((s) => s.activeDiseaseParams);
  const fai = useSimStore((s) => s.fai);
  const cac = useSimStore((s) => s.cac);

  const activeProfile = useSimStore((s) => s.activeProfile);
  const uploadedReport = useSimStore((s) => s.uploadedReport);
  const isCustomScenario = (activeProfile && activeProfile.category !== 'healthy') || Boolean(uploadedReport);

  // Derive parameters with fallback to exact prompt baseline
  const hrVal = isCustomScenario
    ? (snapshot?.heartRate ? Math.round(snapshot.heartRate) : params.heartRate ? Math.round(params.heartRate) : 68)
    : 68;

  const sysVal = isCustomScenario
    ? (snapshot?.systolic ? Math.round(snapshot.systolic) : params.systolic ? Math.round(params.systolic) : 117)
    : 117;

  const diaVal = isCustomScenario
    ? (snapshot?.diastolic ? Math.round(snapshot.diastolic) : params.diastolic ? Math.round(params.diastolic) : 78)
    : 78;

  const hrvVal = isCustomScenario
    ? (snapshot?.hrv ? Math.round(snapshot.hrv) : params.hrv ? Math.round(params.hrv) : 70)
    : 70;

  let spo2Display = '98%';
  if (isCustomScenario && activeDiseaseParams && activeDiseaseParams['SpO₂']) {
    spo2Display = String(activeDiseaseParams['SpO₂']);
    if (!spo2Display.endsWith('%')) spo2Display += '%';
  }

  const faiVal = isCustomScenario && typeof fai === 'number' ? fai.toFixed(1) : '-82.0';
  const cacVal = isCustomScenario && typeof cac === 'number' ? Math.round(cac) : 0;

  const vitals = [
    {
      id: 'hr',
      name: 'Heart Rate',
      value: `${hrVal}`,
      unit: 'bpm',
      icon: <Heart className="overview-metric-icon" style={{ color: '#EF4444' }} />,
    },
    {
      id: 'bp',
      name: 'Blood Pressure',
      value: `${sysVal} / ${diaVal}`,
      unit: 'mmHg',
      icon: <Stethoscope className="overview-metric-icon" style={{ color: '#3B82F6' }} />,
    },
    {
      id: 'hrv',
      name: 'Heart Rate Var.',
      value: `${hrvVal}`,
      unit: 'ms',
      icon: <Activity className="overview-metric-icon" style={{ color: '#10B981' }} />,
    },
    {
      id: 'spo2',
      name: 'Blood Oxygen (SpO2)',
      value: spo2Display,
      unit: '',
      icon: <Droplet className="overview-metric-icon" style={{ color: '#06B6D4' }} />,
    },
    {
      id: 'fai',
      name: 'Fat Attenuation (FAI)',
      value: `${faiVal}`,
      unit: 'HU',
      icon: <Tag className="overview-metric-icon" style={{ color: '#8B5CF6' }} />,
    },
    {
      id: 'cac',
      name: 'Calcium Score (CAC)',
      value: `${cacVal}`,
      unit: 'Agatston',
      icon: <Star className="overview-metric-icon" style={{ color: '#F59E0B' }} />,
    },
  ];

  return (
    <section className="overview-vitals-section" aria-label="Current Vital Signs">
      <div className="overview-vitals-grid">
        {vitals.map((v) => (
          <div key={v.id} className="overview-card overview-vital-card" id={`card-vital-${v.id}`}>
            {/* Top row: Icon + Name, and "CURRENT" badge */}
            <div className="overview-vital-card-header">
              <div className="overview-vital-title-group">
                <div className="overview-vital-icon-box">
                  {v.icon}
                </div>
                <span className="overview-vital-name">{v.name}</span>
              </div>
              <span className="overview-vital-current-badge">CURRENT</span>
            </div>

            {/* Value + Unit Row */}
            <div className="overview-vital-value-row">
              <span className="overview-vital-value font-tabular">{v.value}</span>
              {v.unit && (
                <span className="overview-vital-unit">{v.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
