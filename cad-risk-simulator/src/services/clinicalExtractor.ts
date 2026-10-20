/**
 * Clinical Extractor Engine
 * =========================
 * Robust, deterministic extraction of laboratory, imaging, and vital clinical
 * biomarkers from electronic medical records, laboratory PDFs, and scan images.
 *
 * Designed to strictly adhere to:
 * 1. Safe extraction (no hallucinated values; values must be present in report text).
 * 2. Distinction between patient result and reference ranges/limits.
 * 3. Deterministic unit normalization (SI <-> conventional where medically standardized).
 * 4. Dual-layer PDF ingestion (PDF text streams + Canvas OCR for scanned pages).
 */

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import type { ReportFields, PlaqueType, StenosisSeverity } from '../store/simStore';

// Initialize PDF.js worker using standard URL resolution
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // fallback to default
  }
}

export interface ExtractedReportResult {
  fields: ReportFields;
  extractedCount: number;
  rawText: string;
  patientName?: string;
  patientId?: string;
  summaryNote?: string;
  unmappedFields?: string[];
}

/**
 * Common clinical tests that may appear in clinical laboratory panels
 * but are not part of the platform's cardiovascular risk model.
 * These are identified and reported as unmapped rather than erroneously assigned.
 */
export const COMMON_UNSUPPORTED_TESTS: { name: string; pattern: RegExp }[] = [
  { name: 'Serum Creatinine', pattern: /\b(?:Serum\s+)?Creatinine\b/i },
  { name: 'Blood Urea Nitrogen (BUN)', pattern: /\b(?:Blood\s+Urea\s+Nitrogen|BUN)\b/i },
  { name: 'Serum Urea', pattern: /\b(?:Serum\s+)?Urea\b/i },
  { name: 'Serum Potassium', pattern: /\b(?:Serum\s+)?Potassium\b|\bK\+\b/i },
  { name: 'Serum Sodium', pattern: /\b(?:Serum\s+)?Sodium\b|\bNa\+\b/i },
  { name: 'Serum Chloride', pattern: /\b(?:Serum\s+)?Chloride\b|\bCl-\b/i },
  { name: 'Serum Calcium', pattern: /\b(?:Serum\s+)?Calcium\b(?!\s+(?:Score|CAC|Agatston))/i },
  { name: 'Hemoglobin (CBC)', pattern: /\b(?:Total\s+)?Hemoglobin\b(?!\s*A1c|\s*A1C)/i },
  { name: 'Platelet Count', pattern: /\b(?:Platelet\s+Count|Platelets)\b/i },
  { name: 'White Blood Cell Count (WBC)', pattern: /\b(?:White\s+Blood\s+Cell|WBC(?:\s+Count)?|Leukocyte\s+Count)\b/i },
  { name: 'Red Blood Cell Count (RBC)', pattern: /\b(?:Red\s+Blood\s+Cell|RBC(?:\s+Count)?|Erythrocyte\s+Count)\b/i },
  { name: 'Estimated GFR (eGFR)', pattern: /\b(?:Estimated\s+GFR|eGFR|GFR)\b/i },
  { name: 'Total Bilirubin', pattern: /\b(?:Total\s+)?Bilirubin\b/i },
  { name: 'ALT / SGPT', pattern: /\b(?:ALT|SGPT|Alanine\s+Aminotransferase)\b/i },
  { name: 'AST / SGOT', pattern: /\b(?:AST|SGOT|Aspartate\s+Aminotransferase)\b/i },
  { name: 'Alkaline Phosphatase (ALP)', pattern: /\b(?:Alkaline\s+Phosphatase|ALP)\b/i },
  { name: 'Total Protein', pattern: /\bTotal\s+Protein\b/i },
  { name: 'Serum Albumin', pattern: /\b(?:Serum\s+)?Albumin\b(?!\s*\/)/i },
  { name: 'Troponin (cTnI / cTnT)', pattern: /\b(?:Cardiac\s+)?Troponin(?:\s*[-–]?\s*[IT])?\b/i },
  { name: 'Thyroid Stimulating Hormone (TSH)', pattern: /\b(?:TSH|Thyroid\s+Stimulating\s+Hormone)\b/i },
  { name: 'Serum Uric Acid', pattern: /\b(?:Serum\s+)?Uric\s+Acid\b/i },
  { name: 'Vitamin D (25-OH)', pattern: /\b(?:Vitamin\s+D|25-OH\s+Vitamin\s+D)\b/i },
  { name: 'Vitamin B12', pattern: /\b(?:Vitamin\s+B12|Cobalamin)\b/i },
  { name: 'Prostate-Specific Antigen (PSA)', pattern: /\bPSA\b|\bProstate[- ]Specific\s+Antigen\b/i },
  { name: 'Urine Albumin / Creatinine Ratio (UACR)', pattern: /\b(?:UACR|Microalbumin)\b/i },
];

/**
 * Remove reference range columns, historical comparisons, flags, and trailing noise
 * from a line to strictly isolate the current patient result.
 */
export function cleanLineForPatientResult(line: string): string {
  let resultPart = line;

  // 1. Strip bracketed or parenthesized ranges, reference intervals, or historical markers
  // e.g. (< 200), [120 - 200 mg/dL], (4.0 - 5.6%), (Ref: < 200), [Normal: 120-200], (Prior: 210 mg/dL), (Historical: 210)
  resultPart = resultPart.replace(/\([^)]*(?:ref|range|interval|norm|desir|optim|stand|limit|prior|prev|hist|base|<|>|≤|≥)[^)]*\)/gi, ' ');
  resultPart = resultPart.replace(/\[[^\]]*(?:ref|range|interval|norm|desir|optim|stand|limit|prior|prev|hist|base|<|>|≤|≥)[^\]]*\]/gi, ' ');
  // Also strip plain numeric ranges in parentheses/brackets e.g. (120 - 200) or (4.0 - 5.6%)
  resultPart = resultPart.replace(/\(\s*\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\s*\)/gi, ' ');
  resultPart = resultPart.replace(/\[\s*\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\s*\]/gi, ' ');

  // 2. Strip explicit historical / previous measurement phrases (inline or prefixed)
  // e.g. "Previous: 210 mg/dL", "Prior Result: 210", "Historical Value: 210", "Baseline: 210"
  resultPart = resultPart.replace(/\b(?:previous|prior|historical|prev|past|baseline)(?:\s*(?:value|result|reading))?[\s.:=]+[<>]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*[a-zA-Z%µ/²³^]*/gi, ' ');

  // 3. Strip common reference interval headers or indicators
  const refKeywords = [
    /\b(?:reference\s*(?:interval|range|values?|limits?)?|ref\.?\s*(?:range|interval|values?|limits?)?|biological\s*ref|normal\s*(?:range|values?|interval)?|norm\.?\s*(?:range)?|desirable|optimal|interval|std\s*range|standard\s*range|cut-?off|limits?|expected\s*(?:range|values?)?|target\s*(?:range|values?)?)\b/i,
  ];

  for (const kw of refKeywords) {
    const idx = resultPart.search(kw);
    if (idx !== -1) {
      const rest = resultPart.slice(idx);
      // If patient result column appears AFTER reference range column in tabular data
      const afterResultMatch = rest.match(/(?:patient\s*result|result|value|observed|reading)[\s.:=]+(\d+(?:\.\d+)?)/i);
      if (afterResultMatch) {
        resultPart = resultPart.slice(0, idx) + ' ' + rest.replace(kw, '').replace(/[<>]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*[a-zA-Z%µ/²³^]*/i, ' ');
      } else {
        resultPart = resultPart.slice(0, idx);
      }
    }
  }

  // 4. Strip reference thresholds preceded by comparison operators (e.g. < 200, <= 150)
  resultPart = resultPart.replace(/[<>≤≥]\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?/g, ' ');

  // 5. Strip unparenthesized reference ranges (e.g. "120 - 200 mg/dL", "60 - 100 bpm")
  resultPart = resultPart.replace(/\b\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\b/gi, ' ');

  return resultPart;
}

/**
 * Clean OCR text by fixing common typographical and character artifacts.
 * Properly handles thousands separators (e.g. 1,200 -> 1200) vs decimal commas (e.g. 5,6 -> 5.6).
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[“”"']/g, '"')
    // Remove thousands separators e.g. 1,200 -> 1200 or 250,000 -> 250000
    .replace(/(\d{1,3}),(\d{3})\b/g, '$1$2')
    // Convert decimal comma e.g. 5,6 -> 5.6 or 28,6 -> 28.6
    .replace(/(\d+)\s*,\s*(\d{1,2})\b/g, '$1.$2');
}

function matchValueAfterEntity(
  cleanedText: string,
  entityRegex: RegExp,
  min: number,
  max: number,
  unitConverter?: (val: number, unitStr?: string) => number
): number | undefined {
  const entityMatch = entityRegex.exec(cleanedText);
  if (!entityMatch) return undefined;

  const after = cleanedText.slice(entityMatch.index + entityMatch[0].length);
  // Match the first number, ignoring non-numeric characters (up to 60 chars)
  const numMatch = after.match(/^[^\d<>]{0,60}?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z%µ²³^/]+(?:\s*[a-zA-Z%µ²³^/]+)*)?/i);
  if (numMatch) {
    let val = parseFloat(numMatch[1]);
    const unitStr = numMatch[2] ? numMatch[2].trim() : undefined;
    if (!isNaN(val)) {
      if (unitConverter) {
        val = unitConverter(val, unitStr);
      }
      if (val >= min && val <= max) {
        return Math.round(val * 100) / 100;
      }
    }
  }
  return undefined;
}

/**
 * Extract single numeric value from candidate text that matches an entity pattern,
 * ensuring that numbers preceded by comparison symbols (<, >, <=, >=) or labeled
 * as reference ranges are excluded. Supports multiline table rows.
 */
function extractNumericMetric(
  text: string,
  entityRegex: RegExp,
  min: number,
  max: number,
  unitConverter?: (val: number, unitStr?: string) => number
): number | undefined {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!entityRegex.test(line)) continue;

    // Check on current line
    const cleaned = cleanLineForPatientResult(line);
    const match = matchValueAfterEntity(cleaned, entityRegex, min, max, unitConverter);
    if (match !== undefined) return match;

    // Check combining current line with subsequent 1-2 lines (handles multiline table cells)
    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const nextLine = lines[i + j].trim();
      // Don't cross into another test item header
      if (/^(?:Total\s+Cholesterol|HDL|LDL|Triglycerides|Apolipoprotein|Blood\s+Pressure|Heart\s+Rate|HbA1c|Glucose|Fast|Calcium|CAC|FAI|IMAGING|VITAL|High-Sensitivity)/i.test(nextLine)) {
        break;
      }
      const combined = cleanLineForPatientResult(lines.slice(i, i + j + 1).join(' '));
      const nextMatch = matchValueAfterEntity(combined, entityRegex, min, max, unitConverter);
      if (nextMatch !== undefined) return nextMatch;
    }
  }

  // Fallback for wrapped text blobs without multiline cross-contamination
  const match = entityRegex.exec(text);
  if (match) {
    const snippet = text.slice(match.index + match[0].length, match.index + match[0].length + 40);
    const firstLine = snippet.split('\n')[0];
    const cleaned = cleanLineForPatientResult(firstLine);
    const numMatch = cleaned.match(/^[^\d<>]{0,25}?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z%µ/²^3]+)?/i);
    if (numMatch) {
      let val = parseFloat(numMatch[1]);
      const unitStr = numMatch[2];
      if (!isNaN(val)) {
        if (unitConverter) val = unitConverter(val, unitStr);
        if (val >= min && val <= max) {
          return Math.round(val * 100) / 100;
        }
      }
    }
  }

  return undefined;
}

/**
 * Deterministic extraction of all supported clinical parameters from raw text.
 */
export function parseClinicalText(rawText: string): ExtractedReportResult {
  const text = cleanOcrText(rawText);
  const fields: ReportFields = {};
  let count = 0;

  // 1. Patient Demographics & Identifiers
  // Patient Name
  const nameMatch =
    text.match(
      /(?:Patient\s*Name|Patient\s*Full\s*Name|Full\s*Name|Pt\s*Name|Name\s*of\s*Patient)[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([^\n\r]+)/i
    ) ||
    text.match(
      /(?:^|\n)\s*(?:Patient)[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([^\n\r]+)/i
    );
  if (nameMatch) {
    let rawName = nameMatch[1].split(/\s{2,}|\t/)[0].trim();
    rawName = rawName
      .replace(/(?:Patient\s*ID|ID|Age|Gender|Sex|Date|Ref|DOB|Phone|Dr)[\s.:|-].*/i, '')
      .trim();
    if (
      rawName.length >= 2 &&
      !/^(Result|Test|Sample|Hospital|Clinical|Normal|Demographic|Metadata|Patient\s+Profile|Patient\s+Report|Patient\s+Overview|Dashboard|Monitor|Laboratory|Investigation|Profile)/i.test(rawName)
    ) {
      fields.patientName = rawName;
    }
  }

  // Patient ID
  let patientId: string | undefined;
  const idMatch = text.match(/(?:Patient\s*ID|PID|MRN|UHID|Patient\s*No\.?|Patient\s*#|Reg(?:\.|istration)?\s*No\.?|Case\s*No\.?)[\s.:|-]+([A-Za-z0-9-_]{3,25})/i);
  if (idMatch) {
    patientId = idMatch[1].trim();
    fields.patientId = patientId;
  }

  // Age
  const ageMatch = text.match(/(?:^|\n|\s|\b)(?:Age|Age\s*[/\\|]?\s*(?:Gender|Sex))[\s.:|+]+(\d{1,3})\b/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 1 && age <= 120) {
      fields.age = age;
    }
  }

  // Gender / Sex (Explicit demographic markers only — no guessing from free text)
  const sexMatch = text.match(/(?:^|\n|\s|\b)(?:Gender|Sex)[\s.:|-]+(Male|Female|\bM\b|\bF\b)/i);
  if (sexMatch) {
    const s = sexMatch[1].toLowerCase();
    if (s.startsWith('m')) fields.sex = 'male';
    else if (s.startsWith('f')) fields.sex = 'female';
  } else {
    // Check combined Age / Sex format e.g. "64 / Male" or "64Y / M"
    const combinedDemog = text.match(/(?:Age|Demographics)[\s.:|-]+\d{1,3}\s*(?:Y|Yrs|Years)?\s*[/\\|]\s*(Male|Female|\bM\b|\bF\b)/i);
    if (combinedDemog) {
      const s = combinedDemog[1].toLowerCase();
      if (s.startsWith('m')) fields.sex = 'male';
      else if (s.startsWith('f')) fields.sex = 'female';
    }
  }

  // 2. Blood Pressure (Systolic & Diastolic)
  // Check combined BP string e.g. "152/96" or "152 / 96 mmHg" or "BP: 152/96"
  // Clean line first to prevent reference ranges like (Ref: < 120/80) from polluting result
  let bpFound = false;
  const lines = text.split('\n');
  for (const line of lines) {
    if (!/(?:Blood\s+Pressure|\bB\.?P\.?\b|\bNIBP\b)/i.test(line)) continue;
    const cleanedLine = cleanLineForPatientResult(line);
    const bpLineMatch = cleanedLine.match(/(?:Blood\s+Pressure|\bB\.?P\.?\b|\bNIBP\b)[^\d/]{0,40}?(\d{2,3})\s*[/\\-]\s*(\d{2,3})/i);
    if (bpLineMatch) {
      const sys = parseFloat(bpLineMatch[1]);
      const dia = parseFloat(bpLineMatch[2]);
      if (sys >= 60 && sys <= 260) {
        fields.systolic = Math.round(sys);
        count++;
      }
      if (dia >= 30 && dia <= 160) {
        fields.diastolic = Math.round(dia);
        count++;
      }
      bpFound = true;
      break;
    }
  }

  if (!bpFound) {
    // Individual systolic / diastolic line matching
    const sys = extractNumericMetric(text, /(?:Systolic(?:\s+Blood)?(?:\s+Pressure)?|Systolic\s+BP|\bSBP\b)/i, 60, 260);
    if (sys !== undefined) {
      fields.systolic = Math.round(sys);
      count++;
    }
    const dia = extractNumericMetric(text, /(?:Diastolic(?:\s+Blood)?(?:\s+Pressure)?|Diastolic\s+BP|\bDBP\b)/i, 30, 160);
    if (dia !== undefined) {
      fields.diastolic = Math.round(dia);
      count++;
    }
  }

  // 3. Heart Rate (bpm)
  const hr = extractNumericMetric(text, /(?:Heart\s+Rate|Resting\s+(?:Heart\s+Rate|HR)|Pulse\s+Rate|Pulse|\bHR\b|\bP\.?R\.?\b)/i, 30, 220);
  if (hr !== undefined) {
    fields.heartRate = Math.round(hr);
    count++;
  }

  // 4. Body Mass Index (BMI) (kg/m²)
  const bmi = extractNumericMetric(text, /(?:Body\s+Mass\s+Index|\bBMI\b)/i, 10, 70);
  if (bmi !== undefined) {
    fields.bmi = bmi;
    count++;
  }

  // 5. Total Cholesterol (mg/dL or mmol/L)
  // mmol/L to mg/dL conversion factor: 38.67
  const tc = extractNumericMetric(
    text,
    /(?:(?:Total|Serum|S\.?)\s*[-–]?\s*Cholesterol|Cholesterol[,\s\-–]+Total|Cholesterol\s*\(\s*Total\s*\)|T-?Chol\b|Cholesterol\b)/i,
    50,
    600,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (tc !== undefined) {
    fields.totalCholesterol = Math.round(tc);
    count++;
  }

  // 6. HDL Cholesterol (mg/dL or mmol/L)
  const hdl = extractNumericMetric(
    text,
    /(?:High\s+Density\s+Lipoproteins?(?:\s*\(HDL\))?|HDL(?:\s*[-–]?\s*Cholesterol)?(?:\s*[-–]?\s*Direct)?|HDL-?C|HDL\b)/i,
    10,
    150,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (hdl !== undefined) {
    fields.hdl = Math.round(hdl);
    count++;
  }

  // 7. LDL Cholesterol (Direct / Calculated) (mg/dL or mmol/L)
  const ldl = extractNumericMetric(
    text,
    /(?:Low\s+Density\s+Lipoproteins?(?:\s*\(LDL\))?|LDL(?:\s*[-–]?\s*Cholesterol)?(?:\s*[-–]?\s*(?:Direct|Calculated|\(Direct\)|\(Calculated\)))?|LDL-?C|LDL\b)/i,
    20,
    450,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (ldl !== undefined) {
    fields.ldl = Math.round(ldl);
    count++;
  }

  // 8. Triglycerides (mg/dL or mmol/L)
  // mmol/L to mg/dL conversion factor: 88.57
  const tg = extractNumericMetric(
    text,
    /(?:(?:Serum|S\.?)\s*[-–]?\s*Triglycerides?|Triglycerides?|TRIG\b|TGL\b|TG\b)/i,
    20,
    1500,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 88.57 : val)
  );
  if (tg !== undefined) {
    fields.triglycerides = Math.round(tg);
    count++;
  }

  // 9. Apolipoprotein B (ApoB) (mg/dL or g/L)
  // g/L to mg/dL conversion factor: 100
  const apob = extractNumericMetric(
    text,
    /(?:Apolipoprotein\s*[-–]?\s*B(?:-?100)?(?:\s*\(ApoB\))?|Apo\s*[-–]?\s*B(?:-?100)?\b)/i,
    20,
    350,
    (val, unit) => (unit && /g\/[ld]/i.test(unit) && val < 5 ? val * 100 : val)
  );
  if (apob !== undefined) {
    fields.apoB = Math.round(apob);
    count++;
  }

  // 10. ApoB / ApoA1 Ratio
  const apobRatio = extractNumericMetric(
    text,
    /(?:Apo\s*B\s*[/\\:–-]\s*Apo\s*A-?1(?:\s*Ratio)?)/i,
    0.1,
    4.0
  );
  if (apobRatio !== undefined) {
    fields.apoBApoa1Ratio = apobRatio;
    count++;
  }

  // 11. Lipoprotein(a) [Lp(a)] (mg/dL)
  const lpa = extractNumericMetric(
    text,
    /(?:Lipoprotein\s*[-–]?\s*\(?\s*a\s*\)?(?:\s*\[Lp\(a\)\])?|Lp\s*\(?\s*a\s*\)?)/i,
    0,
    400
  );
  if (lpa !== undefined) {
    fields.lpa = Math.round(lpa);
    count++;
  }

  // 12. High-Sensitivity CRP (hs-CRP) (mg/L or mg/dL)
  // mg/dL to mg/L conversion factor: 10
  const hscrp = extractNumericMetric(
    text,
    /(?:High[- ]?Sensitivity\s+(?:C[- ]?Reactive\s+Protein|CRP)(?:\s*\(hs[- ]?CRP\))?|hs[- ]?(?:C[- ]?Reactive\s+Protein|CRP)|hsCRP)/i,
    0.05,
    100,
    (val, unit) => (unit && /mg\/dl/i.test(unit) ? val * 10 : val)
  );
  if (hscrp !== undefined) {
    fields.hsCRP = hscrp;
    count++;
  }

  // 13. Glycated Hemoglobin (HbA1c) (% or mmol/mol)
  // mmol/mol to % conversion formula: (val * 0.09148) + 2.152
  const hba1c = extractNumericMetric(
    text,
    /(?:Hb\s*A1c|HbA1c(?:\s*\(Glycated\s+Hemoglobin\))?|Glycosylated\s+Hemoglobin|Glycated\s+Hemoglobin|Hemoglobin\s+A1c|A1C\b)/i,
    3.0,
    20.0,
    (val, unit) => (unit && /mmol\/mol/i.test(unit) ? (val * 0.09148) + 2.152 : val)
  );
  if (hba1c !== undefined) {
    fields.hba1c = Math.round(hba1c * 10) / 10;
    count++;
  }

  // 14. Fasting Blood Glucose (mg/dL or mmol/L)
  // mmol/L to mg/dL conversion factor: 18.0182
  const fbs = extractNumericMetric(
    text,
    /(?:Fasting\s+(?:Blood\s+|Plasma\s+)?(?:Glucose|Sugar)|(?:Blood\s+|Plasma\s+)?Glucose[,\s\-–]+\(?Fasting\)?|FBS\b|FPG\b)/i,
    30,
    600,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 18.0182 : val)
  );
  if (fbs !== undefined) {
    fields.fastingGlucose = Math.round(fbs);
    count++;
  }

  // 15. Coronary Artery Calcium (CAC) Score (Agatston)
  const cac = extractNumericMetric(
    text,
    /(?:Coronary\s+(?:Artery\s+)?Calcium(?:\s*\(CAC\))?(?:\s+Score)?|(?:Coronary\s+)?Calcium\s+Score|Agatston\s+(?:Calcium\s+)?Score|CAC\s+Score|\bCAC\b)/i,
    0,
    5000
  );
  if (cac !== undefined) {
    fields.cac = Math.round(cac);
    count++;
  }

  // 16. Fat Attenuation Index (FAI) (HU)
  // Look explicitly for negative HU values (e.g. -92) using line-cleaned text
  let faiVal: number | undefined;
  for (const line of lines) {
    if (!/(?:Fat\s+Attenuation\s+Index|\bFAI\b)/i.test(line)) continue;
    const cleanedLine = cleanLineForPatientResult(line);
    const m = cleanedLine.match(/(?:Fat\s+Attenuation\s+Index(?:\s*\(FAI\))?|\bFAI\b)[^\d\n-]{0,30}?(-?\s*\d{2,3}(?:\.\d+)?)/i);
    if (m) {
      let v = parseFloat(m[1].replace(/\s+/g, ''));
      if (!isNaN(v)) {
        if (v > 0) v = -v; // FAI is inherently negative in coronary CT
        if (v >= -190 && v <= -30) {
          faiVal = Math.round(v * 10) / 10;
          break;
        }
      }
    }
  }
  if (faiVal !== undefined) {
    fields.fai = faiVal;
    count++;
  }

  // 17. Coronary Plaque Type
  const plaqueMatch = text.match(
    /(?:Coronary\s+Plaque(?:\s+Morphology)?|Plaque\s+Type|Plaque\s+Morphology)[\s.:|-]*(Mixed|Non[- ]?calcified|Calcified|Soft|Fibrous|None)/i
  );
  if (plaqueMatch) {
    const raw = plaqueMatch[1].toLowerCase();
    let pt: PlaqueType = 'none';
    if (raw.includes('mix')) pt = 'mixed';
    else if (raw.includes('non') || raw.includes('soft') || raw.includes('fibrous')) pt = 'non-calcified';
    else if (raw.includes('calc')) pt = 'calcified';
    fields.plaqueType = pt;
    count++;
  } else if (/mixed\s+plaque/i.test(text)) {
    fields.plaqueType = 'mixed';
    count++;
  } else if (/non[- ]?calcified\s+plaque/i.test(text)) {
    fields.plaqueType = 'non-calcified';
    count++;
  } else if (/calcified\s+plaque/i.test(text)) {
    fields.plaqueType = 'calcified';
    count++;
  }

  // 18. Plaque Location (Vessels: LAD, RCA, LCX, LM)
  const locMatch = text.match(
    /(?:Plaque\s+Location|Affected\s+Vessels?|Vessel\s+Location)[\s.:|-]*([A-Za-z0-9,\s\+\/-]+)/i
  );
  const detectedLocs = new Set<string>();
  const searchBlob = locMatch ? locMatch[1] : text;

  if (/\b(?:LAD|Left\s+Anterior\s+Descending)\b/i.test(searchBlob)) detectedLocs.add('LAD');
  if (/\b(?:RCA|Right\s+Coronary\s+Artery)\b/i.test(searchBlob)) detectedLocs.add('RCA');
  if (/\b(?:LCX|Left\s+Circumflex|Circumflex)\b/i.test(searchBlob)) detectedLocs.add('LCX');
  if (/\b(?:LM|Left\s+Main)\b/i.test(searchBlob)) detectedLocs.add('LM');

  if (detectedLocs.size > 0) {
    fields.plaqueLocation = Array.from(detectedLocs);
    count++;
  }

  // 19. Maximal Stenosis Severity
  const stenosisMatch = text.match(
    /(?:Maximal\s+Stenosis\s+Severity|Stenosis\s+Severity|Stenosis)[\s.:|-]*([<>0-9%–\-\s]+(?:mild|moderate|severe)?)/i
  );
  if (stenosisMatch) {
    const raw = stenosisMatch[1];
    let sev: StenosisSeverity = 'none';
    if (raw.includes('>70') || /severe/i.test(raw)) sev = '>70%';
    else if (raw.includes('50-70') || raw.includes('50–70') || /moderate/i.test(raw)) sev = '50-70%';
    else if (raw.includes('<50') || /mild/i.test(raw)) sev = '<50%';
    fields.stenosisSeverity = sev;
    count++;
  } else if (/>70%/i.test(text)) {
    fields.stenosisSeverity = '>70%';
    count++;
  } else if (/50-70%|50–70%/i.test(text)) {
    fields.stenosisSeverity = '50-70%';
    count++;
  }

  // 20. Summary Impression / Clinical Note
  const summaryMatch = text.match(/Summary\s*(?:Impression|Note)?[\s.:|-]+([\s\S]*?)(?:===|Dr\.|Date:|$)/i);
  const summaryNote = summaryMatch ? summaryMatch[1].trim().slice(0, 300) : undefined;

  // 21. Detect common unsupported clinical parameters and report as unmapped
  const unmappedDetected: string[] = [];
  for (const testItem of COMMON_UNSUPPORTED_TESTS) {
    if (testItem.pattern.test(text)) {
      unmappedDetected.push(testItem.name);
    }
  }

  return {
    fields,
    extractedCount: count,
    rawText,
    patientName: fields.patientName,
    patientId: fields.patientId,
    summaryNote,
    unmappedFields: unmappedDetected,
  };
}

/**
 * Preprocess image bitmap on an HTML5 canvas for high-accuracy OCR.
 */
async function preprocessImageForOcr(file: File): Promise<string | File> {
  if (typeof window === 'undefined' || !window.createImageBitmap) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const scale = bitmap.width < 1200 ? 1200 / bitmap.width : 1;
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const contrast = 1.25;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const c = factor * (gray - 128) + 128;
      const finalVal = Math.min(255, Math.max(0, c));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Image preprocessing fallback:', err);
    return file;
  }
}

/**
 * Extract text from PDF document using PDF.js text layer.
 * If text layer contains no or insufficient text (scanned PDF), renders pages to canvas
 * and applies Tesseract.js OCR fallback.
 */
export async function extractFromPdf(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  onProgress?.(15, 'Loading PDF document structure...');

  let uint8Data: Uint8Array;
  if (typeof File !== 'undefined' && fileOrBuffer instanceof File) {
    if (fileOrBuffer.size === 0) {
      throw new Error(`PDF file "${fileOrBuffer.name}" is empty (0 bytes).`);
    }
    const ab = await fileOrBuffer.arrayBuffer();
    uint8Data = new Uint8Array(ab);
  } else if (fileOrBuffer instanceof Uint8Array) {
    if (fileOrBuffer.byteLength === 0) {
      throw new Error('PDF byte buffer is empty (0 bytes).');
    }
    uint8Data = new Uint8Array(
      fileOrBuffer.buffer.slice(
        fileOrBuffer.byteOffset,
        fileOrBuffer.byteOffset + fileOrBuffer.byteLength
      )
    );
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    if (fileOrBuffer.byteLength === 0) {
      throw new Error('PDF ArrayBuffer is empty (0 bytes).');
    }
    uint8Data = new Uint8Array(fileOrBuffer);
  } else {
    const b = fileOrBuffer as any;
    uint8Data = new Uint8Array(
      b.buffer ? b.buffer.slice(b.byteOffset || 0, (b.byteOffset || 0) + (b.byteLength || b.length)) : b
    );
  }

  let pdfDoc: any;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Data,
    });
    pdfDoc = await loadingTask.promise;
  } catch (err: any) {
    console.error('PDF document structure load failed:', err);
    throw new Error(`Corrupted or invalid PDF file: ${err?.message || 'Unable to parse PDF structure'}`);
  }

  const numPages = pdfDoc.numPages;
  if (!numPages || numPages === 0) {
    throw new Error('PDF document contains 0 pages.');
  }

  let fullText = '';
  onProgress?.(30, `Reading text layer across ${numPages} page(s)...`);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = '';
    let lastY: number | undefined = undefined;

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const currentY = item.transform ? item.transform[5] : undefined;
      if (lastY !== undefined && currentY !== undefined && Math.abs(currentY - lastY) > 4) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
        pageText += ' ';
      }
      pageText += item.str;
      if (item.hasEOL) {
        pageText += '\n';
      }
      lastY = currentY;
    }

    fullText += pageText + '\n';
  }

  // If text layer was present and rich enough, parse directly
  if (fullText.trim().length > 60) {
    onProgress?.(85, 'Extracting and validating clinical parameters...');
    const result = parseClinicalText(fullText);
    if (result.extractedCount > 0) {
      onProgress?.(100, `Extracted ${result.extractedCount} parameters from PDF.`);
      return result;
    }
  }

  // Scanned PDF fallback: render pages to canvas and run OCR
  onProgress?.(40, 'Scanned PDF detected. Rendering pages for OCR scanning...');
  let ocrAccumulatedText = '';

  for (let i = 1; i <= Math.min(numPages, 3); i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await (page.render({ canvasContext: ctx, viewport } as any)).promise;
        const dataUrl = canvas.toDataURL('image/png');

        onProgress?.(
          50 + Math.round((i / numPages) * 35),
          `Running OCR on page ${i} of ${numPages}...`
        );

        const ocrRes = await Tesseract.recognize(dataUrl, 'eng');
        ocrAccumulatedText += ocrRes.data.text + '\n';
      }
    }
  }

  onProgress?.(90, 'Extracting clinical values from OCR results...');
  const result = parseClinicalText(ocrAccumulatedText);
  onProgress?.(100, `Extracted ${result.extractedCount} parameters from scanned document.`);
  return result;
}

/**
 * Extract parameters from image file (JPG, PNG, WEBP) using Tesseract.js OCR.
 */
export async function extractFromImage(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  if (file.size === 0) {
    throw new Error(`Image file "${file.name}" is empty (0 bytes).`);
  }

  try {
    onProgress?.(20, 'Enhancing image for optical recognition...');
    let preprocessed: any = await preprocessImageForOcr(file);

    // In Node.js / SSR / testing environments without window, convert File to Buffer for Tesseract.js worker
    if (typeof window === 'undefined' && typeof File !== 'undefined' && preprocessed instanceof File) {
      const ab = await preprocessed.arrayBuffer();
      const nodeBuf = (globalThis as any).Buffer;
      preprocessed = nodeBuf ? nodeBuf.from(ab) : ab;
    }

    onProgress?.(45, 'Scanning optical characters (OCR)...');
    const ocrResult = await Tesseract.recognize(preprocessed, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          onProgress?.(45 + Math.round(m.progress * 45), `Recognizing text: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    onProgress?.(95, 'Extracting clinical parameters...');
    const result = parseClinicalText(ocrResult.data.text);
    onProgress?.(100, `Extracted ${result.extractedCount} parameters successfully.`);
    return result;
  } catch (err: any) {
    console.error('Image OCR failed:', err);
    throw new Error(`Image processing failed: ${err?.message || 'Could not process image file'}`);
  }
}

/**
 * Universal Entry Point: Handles PDF, image (JPG/PNG), or plain text clinical reports.
 */
export async function extractClinicalReport(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  if (!file) {
    throw new Error('No file provided for report extraction.');
  }

  // 1. Validate file size (detect empty / 0-byte files)
  if (file.size === 0) {
    throw new Error(`The selected file "${file.name}" is empty (0 bytes). Please upload a valid clinical report.`);
  }

  // 2. Validate file type / format
  const fileName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName);
  const isText = file.type === 'text/plain' || fileName.endsWith('.txt');

  if (!isPdf && !isImage && !isText) {
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : 'unknown';
    throw new Error(
      `Unsupported file format "${ext}". Supported formats are PDF, PNG, JPG, JPEG, and TXT.`
    );
  }

  if (isPdf) {
    return extractFromPdf(file, onProgress);
  }

  if (isImage) {
    return extractFromImage(file, onProgress);
  }

  // Plain text fallback
  try {
    onProgress?.(40, 'Reading report text...');
    const text = await file.text();
    if (!text || text.trim().length === 0) {
      throw new Error(`Report file "${file.name}" contains no readable text.`);
    }
    onProgress?.(85, 'Extracting clinical values...');
    const result = parseClinicalText(text);
    onProgress?.(100, `Extracted ${result.extractedCount} parameters.`);
    return result;
  } catch (err: any) {
    console.error('Text file read failed:', err);
    if (err instanceof Error) throw err;
    throw new Error(`Failed to read plain text report: ${String(err)}`);
  }
}
