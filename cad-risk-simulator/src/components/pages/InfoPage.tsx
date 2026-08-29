/**
 * InfoPage — Read-Only Reference & Knowledge Reference Tab
 * ==========================================================
 * Provides complete medical, mathematical, parameter, fusion, and clinical literature
 * documentation for the CAD Risk Simulator.
 *
 * Read-only layout using standard design tokens. No simulator state mutation.
 */

import React, { useState } from 'react';

type InfoSubTab = 'about' | 'parameters' | 'formulas' | 'fusion' | 'references';

interface SubTabOption {
  id: InfoSubTab;
  label: string;
}

const SUB_TABS: SubTabOption[] = [
  { id: 'about',      label: 'About CAD' },
  { id: 'parameters', label: 'Parameters' },
  { id: 'formulas',   label: 'Formulas' },
  { id: 'fusion',     label: 'Fusion Design' },
  { id: 'references', label: 'References' },
];

function InfoKeyword({ children }: { children: React.ReactNode }) {
  return <span className="info-keyword">{children}</span>;
}

// ── Sub-Tab 1: About CAD ─────────────────────────────────────────────────────

function AboutCADContent() {
  return (
    <div className="info-text-section">
      <div className="info-block">
        <h2 className="info-heading">WHAT IS CAD?</h2>
        <p className="info-paragraph">
          <InfoKeyword>CAD</InfoKeyword> is <InfoKeyword>atherosclerotic narrowing</InfoKeyword> of the <InfoKeyword>coronary arteries</InfoKeyword>, reducing blood supply to the heart. It can lead to <InfoKeyword>angina</InfoKeyword>, <InfoKeyword>ischemia</InfoKeyword>, and <InfoKeyword>myocardial infarction</InfoKeyword>.
        </p>
      </div>

      <div className="info-block">
        <h2 className="info-heading">WHY CONTINUOUS MONITORING?</h2>
        <p className="info-paragraph">
          Clinic tests capture a snapshot. Continuous <InfoKeyword>ECG</InfoKeyword>, <InfoKeyword>PPG</InfoKeyword>, and <InfoKeyword>BP</InfoKeyword> monitoring helps detect early <InfoKeyword>risk drift</InfoKeyword> before a major event.
        </p>
      </div>

      <div className="info-block">
        <h2 className="info-heading">KEY RISK FACTORS</h2>
        <p className="info-paragraph mb-2">
          The <InfoKeyword>INTERHEART</InfoKeyword> study shows that nine modifiable factors explain over <InfoKeyword>90%</InfoKeyword> of MI risk, especially in <InfoKeyword>South Asian</InfoKeyword> populations.
        </p>
        <ol className="info-ordered-list">
          <li><InfoKeyword>ApoB/ApoA1</InfoKeyword> ratio</li>
          <li><InfoKeyword>Smoking</InfoKeyword></li>
          <li><InfoKeyword>Hypertension</InfoKeyword></li>
          <li><InfoKeyword>Diabetes</InfoKeyword></li>
          <li><InfoKeyword>Obesity</InfoKeyword></li>
          <li><InfoKeyword>Stress</InfoKeyword></li>
          <li><InfoKeyword>Diet</InfoKeyword></li>
          <li><InfoKeyword>Physical inactivity</InfoKeyword></li>
          <li><InfoKeyword>Alcohol</InfoKeyword> pattern</li>
        </ol>
      </div>

      <div className="info-block">
        <h2 className="info-heading">INDIAN CONTEXT</h2>
        <p className="info-paragraph">
          CAD often appears earlier in Indian populations. Key contributors are <InfoKeyword>smoking</InfoKeyword>, <InfoKeyword>hypertension</InfoKeyword>, <InfoKeyword>dyslipidaemia</InfoKeyword>, <InfoKeyword>diabetes</InfoKeyword>, and <InfoKeyword>central adiposity</InfoKeyword>.
        </p>
      </div>

      <div className="info-block">
        <h2 className="info-heading">HOW THIS SIMULATOR WORKS</h2>
        <p className="info-paragraph">
          It fuses <InfoKeyword>5 signals</InfoKeyword> through a <InfoKeyword>7-layer pipeline</InfoKeyword> to generate a <InfoKeyword>0–100 CAD risk score</InfoKeyword>.
        </p>
      </div>
    </div>
  );
}

// ── Sub-Tab 2: Parameters ────────────────────────────────────────────────────

interface ParameterRow {
  name: string;
  source: string;
  derivedFrom: string;
  normalRange: string;
  cadRange: string;
  citation: string;
}

interface ParameterGroup {
  groupName: string;
  rows: ParameterRow[];
}

const PARAMETER_GROUPS: ParameterGroup[] = [
  {
    groupName: 'SENSOR-DERIVED (direct measurement)',
    rows: [
      { name: 'Heart Rate', source: 'ECG/PPG', derivedFrom: 'Peak detection', normalRange: '60–100 bpm', cadRange: '—', citation: 'Asian Heart Institute' },
      { name: 'ST Segment', source: 'ECG', derivedFrom: 'Baseline offset', normalRange: '-0.05–0.05 mV', cadRange: '>0.1 mV elevation', citation: 'Thygesen et al. 2018' },
      { name: 'QT Interval (raw)', source: 'ECG', derivedFrom: 'R-wave to T-end', normalRange: '350–440 ms', cadRange: '>440 ms', citation: 'AHA guidelines' },
      { name: 'HRV RMSSD', source: 'ECG/PPG', derivedFrom: 'Inter-beat timing', normalRange: '>50 ms (healthy)', cadRange: '<25 ms', citation: 'Published HRV norms' },
      { name: 'Systolic BP', source: 'BP sensor / PTT', derivedFrom: 'Direct/PTT-derived', normalRange: '<120 mmHg', cadRange: '138.4±12.6 mmHg', citation: 'SVMC / Gadhwal et al.' },
      { name: 'Diastolic BP', source: 'BP sensor / PTT', derivedFrom: 'Direct/PTT-derived', normalRange: '<80 mmHg', cadRange: '86.5±8.4 mmHg', citation: 'SVMC / Gadhwal et al.' },
      { name: 'Stress Score', source: 'EDA/GSR proxy', derivedFrom: 'HRV + skin response', normalRange: '0–30 (low)', cadRange: '>60 (high)', citation: '—' },
      { name: 'Motion Level', source: 'Accelerometer', derivedFrom: 'Raw accel signal', normalRange: 'Low baseline', cadRange: '—', citation: '—' },
    ],
  },
  {
    groupName: 'PPG MORPHOLOGY-DERIVED',
    rows: [
      { name: 'Reflection Index (RI)', source: 'PPG', derivedFrom: 'Diastolic/Systolic peak ratio', normalRange: '—', cadRange: '—', citation: 'Millasseau et al.' },
      { name: 'Stiffness Index (SI)', source: 'PPG', derivedFrom: 'Height ÷ ΔT between peaks', normalRange: '—', cadRange: '—', citation: 'Millasseau et al. 2006' },
      { name: 'Augmentation Index (AIx)', source: 'PPG', derivedFrom: '(Diastolic−Notch)/Systolic', normalRange: '—', cadRange: '—', citation: 'Takazawa et al. 1998' },
      { name: 'Rise Time', source: 'PPG', derivedFrom: 'Systolic peak index/beat cycle', normalRange: '—', cadRange: '—', citation: 'PPG landmark analysis' },
      { name: 'Dicrotic Notch Position', source: 'PPG', derivedFrom: 'Notch index/beat cycle', normalRange: '—', cadRange: '—', citation: 'PPG landmark analysis' },
      { name: 'Total Cholesterol (est.)', source: 'PPG morphology', derivedFrom: 'RI, SI, AIx formula', normalRange: '198±37 mg/dL', cadRange: '192–213 mg/dL', citation: 'Ashavaid et al. 2005 / Gadhwal et al.' },
      { name: 'Triglycerides (est.)', source: 'PPG morphology', derivedFrom: 'RI, SI, AIx formula', normalRange: '119±53 mg/dL', cadRange: '176–178 mg/dL', citation: 'Ashavaid et al. 2005 / Gadhwal et al.' },
    ],
  },
  {
    groupName: 'CALCULATED FROM LAB INPUTS',
    rows: [
      { name: 'HDL-C', source: 'Lab report (manual)', derivedFrom: 'Direct entry', normalRange: '47±11 mg/dL', cadRange: '38.6±8.2 mg/dL', citation: 'Ashavaid et al. 2005' },
      { name: 'Non-HDL-C', source: 'Lab calculation', derivedFrom: 'TC − HDL', normalRange: '—', cadRange: '—', citation: 'Standard definition' },
      { name: 'LDL-C', source: 'Lab calculation', derivedFrom: 'Friedewald equation', normalRange: '121±29 mg/dL', cadRange: '125–141 mg/dL', citation: 'Ashavaid et al. 2005' },
      { name: 'ApoB', source: 'Lab calculation', derivedFrom: '0.65×non-HDL-C + 6.3', normalRange: '95±21 mg/dL', cadRange: '108.2±22.5 mg/dL', citation: 'Hermans et al. 2011' },
      { name: 'ApoA1', source: 'Lab report (manual)', derivedFrom: 'Direct entry', normalRange: '—', cadRange: '—', citation: '—' },
      { name: 'ApoB/ApoA1 Ratio', source: 'Lab calculation', derivedFrom: 'ApoB ÷ ApoA1', normalRange: '0.76±0.19', cadRange: '0.92±0.26', citation: 'Ashavaid et al. 2005' },
      { name: 'Lp(a)', source: 'Lab report (manual)', derivedFrom: 'Direct entry', normalRange: '12.9 mg/dL (median)', cadRange: '44.5±19.8 mg/dL', citation: 'Ashavaid et al. 2005' },
      { name: 'sdLDL (est.)', source: 'Lab calculation', derivedFrom: 'Sampson/modified equation', normalRange: '—', cadRange: '42.7±14.3 mg/dL', citation: 'Gadhwal et al.' },
      { name: 'BMI', source: 'Patient profile', derivedFrom: 'Weight(kg)/Height(m)²', normalRange: '18.5–22.9 kg/m²', cadRange: '26.1–26.8 kg/m²', citation: 'Regency Healthcare / Gadhwal et al.' },
    ],
  },
  {
    groupName: 'ECG/PPG COMPOSITE',
    rows: [
      { name: 'QTc (Bazett)', source: 'ECG', derivedFrom: 'QT/√RR', normalRange: '<440 ms', cadRange: '440–500 ms risk', citation: 'Bazett 1920' },
      { name: 'MAP', source: 'BP', derivedFrom: 'DBP + (SBP−DBP)/3', normalRange: '70–100 mmHg', cadRange: '—', citation: 'Standard physiology' },
      { name: 'Pulse Pressure', source: 'BP', derivedFrom: 'SBP − DBP', normalRange: '40 mmHg', cadRange: '—', citation: 'Standard physiology' },
      { name: 'PTT', source: 'ECG + PPG', derivedFrom: 'R-wave to PPG foot', normalRange: '—', cadRange: '—', citation: 'Ding et al. IEEE TBME 2015' },
      { name: 'SpO₂', source: 'PPG (optical)', derivedFrom: 'Light absorption ratio', normalRange: '95–100%', cadRange: '—', citation: 'Standard oximetry' },
    ],
  },
];

function ParametersContent() {
  return (
    <div className="info-table-wrapper">
      <table className="info-table">
        <thead>
          <tr>
            <th className="info-th info-sticky-col">Parameter</th>
            <th className="info-th">Source</th>
            <th className="info-th">Derived From</th>
            <th className="info-th">Normal Range (India)</th>
            <th className="info-th">CAD Range (India)</th>
            <th className="info-th">Source Citation</th>
          </tr>
        </thead>
        <tbody>
          {PARAMETER_GROUPS.map((group) => (
            <React.Fragment key={group.groupName}>
              <tr className="info-group-row">
                <td colSpan={6} className="info-group-cell">
                  {group.groupName}
                </td>
              </tr>
              {group.rows.map((row, idx) => (
                <tr key={row.name} className={idx % 2 === 1 ? 'info-tr-alt' : ''}>
                  <td className="info-td info-td-name info-sticky-col">{row.name}</td>
                  <td className="info-td">{row.source}</td>
                  <td className="info-td info-mono">{row.derivedFrom}</td>
                  <td className="info-td info-mono">{row.normalRange}</td>
                  <td className="info-td info-mono">{row.cadRange}</td>
                  <td className="info-td text-xs text-[var(--text-tertiary)]">{row.citation}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sub-Tab 3: Formulas ──────────────────────────────────────────────────────

interface FormulaItem {
  id: number;
  category: string;
  name: string;
  formula: string;
  source: string;
  note?: string;
  isPlaceholder?: boolean;
  badgeLabel?: string;
}

const FORMULAS: FormulaItem[] = [
  // LIPID CALCULATIONS
  {
    id: 1,
    category: 'LIPID CALCULATIONS',
    name: '1. Friedewald LDL-C',
    formula: 'LDL\\text{-}C = TC - HDL\\text{-}C - \\frac{TG}{5}',
    source: 'Source: Friedewald WT et al. Clin Chem. 1972;18:499-502',
    note: 'Note: inaccurate at TG >400 mg/dL or very low LDL-C',
  },
  {
    id: 2,
    category: 'LIPID CALCULATIONS',
    name: '2. Non-HDL Cholesterol',
    formula: 'Non\\text{-}HDL\\text{-}C = TC - HDL\\text{-}C',
    source: 'Source: Standard clinical definition',
  },
  {
    id: 3,
    category: 'LIPID CALCULATIONS',
    name: '3. ApoB Estimation',
    formula: 'ApoB = 0.65 \\times Non\\text{-}HDL\\text{-}C + 6.3',
    source: 'Source: Hermans MP et al. Cardiovasc Diabetol. 2011;10:20',
  },
  {
    id: 4,
    category: 'LIPID CALCULATIONS',
    name: '4. LDL/HDL Ratio',
    formula: 'Ratio = \\frac{LDL\\text{-}C}{HDL\\text{-}C}',
    source: 'Source: Gadhwal et al. Reference: 3.35±0.97 (CAD patients)',
  },
  {
    id: 5,
    category: 'LIPID CALCULATIONS',
    name: '5. TG/HDL Ratio',
    formula: 'Ratio = \\frac{TG}{HDL\\text{-}C}',
    source: 'Source: Gadhwal et al. Reference: 4.58±1.73 (CAD patients)',
  },

  // ECG/PPG MORPHOLOGY
  {
    id: 6,
    category: 'ECG/PPG MORPHOLOGY',
    name: '6. QTc (Bazett)',
    formula: 'QTc = \\frac{QT}{\\sqrt{RR_{(seconds)}}}',
    source: 'Source: Bazett HC. Heart. 1920;7:353-370',
    note: 'Note: less accurate at extremes of heart rate vs. Fridericia',
  },
  {
    id: 7,
    category: 'ECG/PPG MORPHOLOGY',
    name: '7. Stiffness Index (Millasseau)',
    formula: 'SI = \\frac{Height_{(m)}}{\\Delta T_{(seconds\\ between\\ systolic\\ and\\ diastolic\\ peaks)}}',
    source: 'Source: Millasseau SC et al. J Hypertens. 2006;24:1449-1456',
  },
  {
    id: 8,
    category: 'ECG/PPG MORPHOLOGY',
    name: '8. Reflection Index',
    formula: 'RI = \\frac{Diastolic\\ Peak\\ Amplitude}{Systolic\\ Peak\\ Amplitude}',
    source: 'Source: PPG contour analysis — Millasseau et al.',
  },
  {
    id: 9,
    category: 'ECG/PPG MORPHOLOGY',
    name: '9. Augmentation Index',
    formula: 'AIx = \\frac{Diastolic\\ Peak - Notch\\ Amplitude}{Systolic\\ Peak\\ Amplitude}',
    source: 'Source: Takazawa K et al. Hypertension. 1998;32:365-370',
    note: 'Note: standard AIx definition is late/early systolic peak ratio; this implementation uses a related but distinct waveform index',
  },

  // BLOOD PRESSURE
  {
    id: 10,
    category: 'BLOOD PRESSURE',
    name: '10. Mean Arterial Pressure',
    formula: 'MAP = DBP + \\frac{SBP - DBP}{3}',
    source: 'Source: Standard cardiovascular physiology (Guyton & Hall)',
  },
  {
    id: 11,
    category: 'BLOOD PRESSURE',
    name: '11. Pulse Pressure',
    formula: 'PP = SBP - DBP',
    source: 'Source: Standard clinical definition',
  },
  {
    id: 12,
    category: 'BLOOD PRESSURE',
    name: '12. PTT-based BP Estimation',
    formula: 'PTT = t_{(PPG\\ foot)} - t_{(ECG\\ R-wave)} \\quad | \\quad SBP/DBP = f(PTT)\\ \\text{via regression}',
    source: 'Source: Ding X-R et al. IEEE Trans Biomed Eng. 2015;63(5):964-972',
    note: 'Note: requires per-subject calibration; degrades with motion',
  },

  // LIPID ESTIMATION FROM PPG (PLACEHOLDER)
  {
    id: 13,
    category: 'LIPID ESTIMATION FROM PPG (PLACEHOLDER)',
    name: '13. Total Cholesterol from PPG',
    formula: 'Chol = 180 + (\\Delta RI \\times 120) + (\\Delta SI \\times 10) + (\\Delta AIx \\times 100)',
    source: 'Source: Internal preliminary optical model',
    isPlaceholder: true,
    badgeLabel: 'NOT LITERATURE-BACKED — PLACEHOLDER FORMULA',
  },
  {
    id: 14,
    category: 'LIPID ESTIMATION FROM PPG (PLACEHOLDER)',
    name: '14. Triglycerides from PPG',
    formula: 'Trig = 110 + (\\Delta RI \\times 200) + (\\Delta SI \\times 8) + (\\Delta AIx \\times 80)',
    source: 'Source: Internal preliminary optical model',
    isPlaceholder: true,
    badgeLabel: 'NOT LITERATURE-BACKED — PLACEHOLDER FORMULA',
  },

  // RISK SCORING
  {
    id: 15,
    category: 'RISK SCORING',
    name: '15. CAD Risk Score',
    formula: 'Score = \\min\\left(100, \\sum_{i=1}^{8} (w_i \\times SubIndex_i)\\right)',
    source: 'Source: Internal weighted composite model',
    isPlaceholder: true,
    badgeLabel: 'NOT LITERATURE-BACKED — WEIGHTS ARE SELF-DEFINED',
  },
  {
    id: 16,
    category: 'RISK SCORING',
    name: '16. WHO 10-year CVD Risk (South Asia)',
    formula: 'Lookup: Age \\times Sex \\times SBP\\ Band \\times Smoking \\times BMI\\ Band',
    source: 'Source: WHO CVD Risk Chart Working Group. Lancet Glob Health. 2019;7(10):e1332-e1345',
  },
];

function RenderMathDisplay({ formula }: { formula: string }) {
  // Convert TeX-like strings to clean readable mathematical presentation
  const formatted = formula
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
    .replace(/\\times/g, '×')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'Σ($1..$2)')
    .replace(/\\min\\left\(100,/g, 'min(100,')
    .replace(/\\right\)/g, ')')
    .replace(/\\quad \| \\quad/g, '  |  ')
    .replace(/\\ /g, ' ');

  return (
    <div className="info-math-box">
      <code className="info-math-code">{formatted}</code>
    </div>
  );
}

function FormulasContent() {
  return (
    <div className="info-formula-grid">
      {FORMULAS.map((item) => (
        <div key={item.id} className="info-formula-card">
          <div className="info-formula-card-header">
            <h3 className="info-formula-title">{item.name}</h3>
            {item.isPlaceholder && (
              <span className="info-badge-not-backed">
                {item.badgeLabel || 'NOT LITERATURE-BACKED'}
              </span>
            )}
          </div>

          <RenderMathDisplay formula={item.formula} />

          <div className="info-formula-footer">
            <span className="info-formula-source">{item.source}</span>
            {item.note && <p className="info-formula-note">{item.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sub-Tab 4: Fusion Design ─────────────────────────────────────────────────

function FusionDesignContent() {
  return (
    <div className="info-text-section">
      <div className="info-block">
        <h2 className="info-heading">WHY SENSOR FUSION?</h2>
        <p className="info-paragraph">
          One sensor is noisy. <InfoKeyword>ECG</InfoKeyword> adds rhythm, <InfoKeyword>PPG</InfoKeyword> adds perfusion, and <InfoKeyword>motion</InfoKeyword> helps separate real signals from <InfoKeyword>artifact</InfoKeyword>.
        </p>
      </div>

      <div className="info-block">
        <h2 className="info-heading">CARDIAC + MOTION FUSION</h2>
        <p className="info-paragraph">
          We compare the cardiac signal with the <InfoKeyword>motion</InfoKeyword> channel using <InfoKeyword>correlation</InfoKeyword>. If they move together, the event is likely motion-related; if not, it is more likely a true cardiac signal.
        </p>
      </div>

      <div className="info-block">
        <h2 className="info-heading">METABOLIC + VASCULAR FUSION</h2>
        <p className="info-paragraph">
          <InfoKeyword>BP</InfoKeyword>, <InfoKeyword>cholesterol</InfoKeyword>, and <InfoKeyword>triglycerides</InfoKeyword> are combined as a vascular signal. <InfoKeyword>ApoB</InfoKeyword> acts as an independent anchor to check whether the PPG-based estimates are drifting or misleading.
        </p>
      </div>
    </div>
  );
}

// ── Sub-Tab 5: References ────────────────────────────────────────────────────

interface ReferenceItem {
  id: number;
  authors: string;
  title: string;
  journal: string;
  year: string;
  doi?: string;
  doiUrl?: string;
}

const REFERENCES: ReferenceItem[] = [
  {
    id: 1,
    authors: 'Friedewald WT, Levy RI, Fredrickson DS.',
    title: 'Estimation of the concentration of low-density lipoprotein cholesterol in plasma, without use of the preparative ultracentrifuge.',
    journal: 'Clin Chem.',
    year: '1972;18(6):499-502.',
  },
  {
    id: 2,
    authors: 'Hermans MP et al.',
    title: 'Non-HDL-cholesterol as valid surrogate to ApoB in type 2 diabetes.',
    journal: 'Cardiovasc Diabetol.',
    year: '2011;10:20.',
    doi: '10.1186/1475-2840-10-20',
    doiUrl: 'https://doi.org/10.1186/1475-2840-10-20',
  },
  {
    id: 3,
    authors: 'Bazett HC.',
    title: 'An analysis of the time-relations of electrocardiograms.',
    journal: 'Heart.',
    year: '1920;7:353-370.',
  },
  {
    id: 4,
    authors: 'Millasseau SC et al.',
    title: 'Contour Analysis of the Photoplethysmographic Pulse Interval.',
    journal: 'J Hypertens.',
    year: '2006;24:1449-1456.',
  },
  {
    id: 5,
    authors: 'Takazawa K et al.',
    title: 'Assessment of Vasoactive Agents Using the Second Derivative of Photoplethysmogram Waveform.',
    journal: 'Hypertension.',
    year: '1998;32(2):365-370.',
  },
  {
    id: 6,
    authors: 'Ding X-R et al.',
    title: 'Continuous cuffless blood pressure estimation using pulse transit time and photoplethysmogram intensity ratio.',
    journal: 'IEEE Trans Biomed Eng.',
    year: '2015;63(5):964-972.',
  },
  {
    id: 7,
    authors: 'Yusuf S et al. (INTERHEART Study).',
    title: 'Effect of potentially modifiable risk factors associated with myocardial infarction in 52 countries.',
    journal: 'Lancet.',
    year: '2004;364(9438):937-952.',
    doi: '10.1016/S0140-6736(04)17018-9',
    doiUrl: 'https://doi.org/10.1016/S0140-6736(04)17018-9',
  },
  {
    id: 8,
    authors: 'WHO CVD Risk Chart Working Group.',
    title: 'World Health Organization cardiovascular disease risk charts: revised models to estimate risk in 21 global regions.',
    journal: 'Lancet Glob Health.',
    year: '2019;7(10):e1332-e1345.',
  },
  {
    id: 9,
    authors: 'Ashavaid TF et al.',
    title: 'Lipid reference intervals in a healthy Indian population.',
    journal: 'J Atheroscler Thromb.',
    year: '2005;12(5):251-259.',
  },
  {
    id: 10,
    authors: 'Gadhwal et al.',
    title: 'Conventional and emerging lipid biomarkers in premature CAD.',
    journal: 'JAMP.',
    year: '2025.',
    doi: '10.47009/jamp.2025.7.2.216',
    doiUrl: 'https://doi.org/10.47009/jamp.2025.7.2.216',
  },
  {
    id: 11,
    authors: 'Jha et al.',
    title: 'CAD prevalence and lipid profile parameters.',
    journal: 'IJLBPR.',
    year: '2025.',
    doi: '10.69605/ijlbpr_14.7.2025.285',
    doiUrl: 'https://doi.org/10.69605/ijlbpr_14.7.2025.285',
  },
  {
    id: 12,
    authors: 'Sheikh JM et al.',
    title: 'Risk factors in angiographically proven CAD in rural and urban Indian population.',
    journal: 'J Fam Med Prim Care.',
    year: '2024;13(11):4874-4879.',
    doi: '10.4103/jfmpc.jfmpc_265_24',
    doiUrl: 'https://doi.org/10.4103/jfmpc.jfmpc_265_24',
  },
  {
    id: 13,
    authors: 'Gupta P et al.',
    title: 'CVD risk prediction in India: recalibrated Framingham models.',
    journal: 'Wellcome Open Res.',
    year: '2019.',
    doi: '10.12688/wellcomeopenres.15137.2',
    doiUrl: 'https://doi.org/10.12688/wellcomeopenres.15137.2',
  },
  {
    id: 14,
    authors: 'Martin SS et al.',
    title: 'Friedewald-Estimated Versus Directly Measured Low-Density Lipoprotein Cholesterol.',
    journal: 'J Am Coll Cardiol.',
    year: '2013;62(8):732-739.',
  },
  {
    id: 15,
    authors: 'Sharma K, Panwar J et al.',
    title: 'CVD high risk prediction in Indian Population.',
    journal: 'J Saudi Heart Assoc.',
    year: '2024;36(2).',
  },
];

function ReferencesContent() {
  return (
    <ol className="info-reference-list">
      {REFERENCES.map((ref) => (
        <li key={ref.id} className="info-reference-item">
          <span className="info-ref-authors">{ref.authors}</span>{' '}
          <span className="info-ref-title">{ref.title}</span>{' '}
          <em className="info-ref-journal">{ref.journal}</em>{' '}
          <span className="info-ref-year">{ref.year}</span>
          {ref.doiUrl && (
            <span className="ml-2">
              <a
                href={ref.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="info-doi-link"
              >
                DOI: {ref.doi}
              </a>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// ── Main InfoPage Component ──────────────────────────────────────────────────

export function InfoPage() {
  const [activeTab, setActiveTab] = useState<InfoSubTab>('about');

  return (
    <div className="info-page">
      {/* Top Header */}
      <div className="info-header">
        <h1 className="info-title">INFORMATION & CLINICAL REFERENCE</h1>
        <p className="info-subtitle">
          Comprehensive reference guide to CAD risk modeling, medical formulas, parameters, and sensor fusion architecture.
        </p>
      </div>

      {/* Fixed Horizontal Sub-Navigation Strip */}
      <div className="info-subtab-strip">
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`info-subtab-btn${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Rendering based on Active Sub-Tab */}
      <div className="info-content-container">
        {activeTab === 'about' && <AboutCADContent />}
        {activeTab === 'parameters' && <ParametersContent />}
        {activeTab === 'formulas' && <FormulasContent />}
        {activeTab === 'fusion' && <FusionDesignContent />}
        {activeTab === 'references' && <ReferencesContent />}
      </div>
    </div>
  );
}
