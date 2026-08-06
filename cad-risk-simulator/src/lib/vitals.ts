/**
 * Shared clinical status classification helpers.
 * Keeps threshold logic in one place so cards never duplicate it.
 */

export function getRiskColor(band: string): string {
  if (band === 'High') return 'var(--alert-red)';
  if (band === 'Moderate') return 'var(--alert-amber)';
  return 'var(--accent)';
}

export function bpStatus(sys: number) {
  if (sys >= 140) return { label: 'Hypertensive', color: 'var(--alert-red)' };
  if (sys >= 130) return { label: 'Elevated', color: 'var(--alert-amber)' };
  return { label: 'Normal', color: 'var(--accent)' };
}

export function stressStatus(s: number) {
  if (s > 70) return { label: 'High', color: 'var(--alert-red)' };
  if (s > 40) return { label: 'Moderate', color: 'var(--alert-amber)' };
  return { label: 'Low', color: 'var(--accent)' };
}

export function hrvStatus(hrv: number) {
  return hrv < 20
    ? { label: 'Low', color: 'var(--alert-amber)' }
    : { label: 'Healthy', color: 'var(--accent)' };
}

export function hrStatus(bpm: number) {
  if (bpm < 60) return { label: 'Bradycardia', color: 'var(--alert-amber)' };
  if (bpm > 100) return { label: 'Tachycardia', color: 'var(--alert-amber)' };
  return { label: 'NSR', color: 'var(--accent)' };
}

export function qtcStatus(qtc: number) {
  if (qtc > 450) return { label: 'Prolonged', color: 'var(--alert-amber)' };
  return { label: 'Normal', color: 'var(--accent)' };
}

export function stStatus(mv: number) {
  return Math.abs(mv) > 0.1
    ? { label: 'Deviated', color: 'var(--alert-amber)' }
    : { label: 'Isoelectric', color: 'var(--accent)' };
}

export function lipidStatus(value: number): { label: string; color: string } {
  // value = cholesterol/triglyceride index 0–100
  if (value >= 65) return { label: 'High', color: 'var(--alert-red)' };
  if (value >= 35) return { label: 'Borderline', color: 'var(--alert-amber)' };
  return { label: 'Normal', color: 'var(--accent)' };
}

export function apoBStatus(apoB: number) {
  if (apoB >= 100) return { label: 'Elevated', color: 'var(--alert-red)' };
  if (apoB >= 80) return { label: 'Borderline', color: 'var(--alert-amber)' };
  return { label: 'Near-Optimal', color: 'var(--text-secondary)' };
}

export function lpaStatus(lpa: number) {
  if (lpa >= 50) return { label: 'Elevated', color: 'var(--alert-red)' };
  if (lpa >= 30) return { label: 'Borderline', color: 'var(--alert-amber)' };
  return { label: 'Normal', color: 'var(--accent)' };
}

export function mapPressure(sys: number, dia: number): number {
  return Math.round(dia + (sys - dia) / 3);
}
