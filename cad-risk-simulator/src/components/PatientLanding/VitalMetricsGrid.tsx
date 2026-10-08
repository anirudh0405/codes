import React from 'react';
import { useSimStore } from '@/store/simStore';

export function VitalMetricsGrid() {
  const params = useSimStore((s) => s.params);
  const snapshot = useSimStore((s) => s.snapshot);
  const activeDiseaseParams = useSimStore((s) => s.activeDiseaseParams);
  const fai = useSimStore((s) => s.fai);
  const cac = useSimStore((s) => s.cac);

  // Derive parameters from existing store
  const heartRate = snapshot?.heartRate ?? params.heartRate;
  const systolic = snapshot?.systolic ?? params.systolic;
  const diastolic = snapshot?.diastolic ?? params.diastolic;
  const hrv = snapshot?.hrv ?? params.hrv;

  // SpO2 derivation from active CVD params or default healthy 98%
  let spo2Value = '98%';
  if (activeDiseaseParams && activeDiseaseParams['SpO₂']) {
    spo2Value = String(activeDiseaseParams['SpO₂']);
    if (!spo2Value.endsWith('%')) spo2Value += '%';
  }

  // FAI & CAC
  const faiDisplay = `${fai.toFixed(1)} HU`;
  const cacDisplay = String(Math.round(cac));

  const metrics = [
    {
      id: 'hr',
      name: 'Heart Rate',
      value: heartRate ? String(Math.round(heartRate)) : '—',
      unit: 'bpm',
      iconBg: '#FEF2F2',
      iconColor: '#EF4444',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ),
    },
    {
      id: 'bp',
      name: 'Blood Pressure',
      value: systolic && diastolic ? `${Math.round(systolic)} / ${Math.round(diastolic)}` : '—',
      unit: 'mmHg',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: 'hrv',
      name: 'Heart Rate Var.',
      value: hrv ? String(Math.round(hrv)) : '—',
      unit: 'ms',
      iconBg: '#F0FDF4',
      iconColor: '#10B981',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: 'spo2',
      name: 'Blood Oxygen (SpO₂)',
      value: spo2Value,
      unit: '',
      iconBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
    },
    {
      id: 'fai',
      name: 'Fat Attenuation (FAI)',
      value: faiDisplay,
      unit: '',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      id: 'cac',
      name: 'Calcium Score (CAC)',
      value: cacDisplay,
      unit: 'Agatston',
      iconBg: '#F8FAFC',
      iconColor: '#64748B',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="pl-vitals-grid" aria-label="Key Cardiovascular Parameters">
      {metrics.map((m) => (
        <div key={m.id} className="pl-vital-card" id={`vital-card-${m.id}`}>
          <div className="pl-vital-top">
            <div
              className="pl-vital-icon"
              style={{ backgroundColor: m.iconBg, color: m.iconColor }}
            >
              {m.icon}
            </div>
            <span className="pl-vital-badge">Current</span>
          </div>

          <div>
            <div className="pl-vital-name">{m.name}</div>
            <div className="pl-vital-value">
              {m.value}
              {m.unit && <span className="pl-vital-unit">{m.unit}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
