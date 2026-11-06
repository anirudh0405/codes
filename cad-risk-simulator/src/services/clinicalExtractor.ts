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
 * 4. Dual-layer PDF ingestion (PDF text streams + Canvas/OCR for scanned pages across all pages).
 * 5. Full traceability of extracted values to original units and source page numbers.
 */

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import type { ReportFields, PlaqueType, StenosisSeverity, ExtractedParameterDetail } from '../store/simStore';

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

export type { ExtractedParameterDetail };

export interface ExtractedReportResult {
  fields: ReportFields;
  extractedCount: number;
  rawText: string;
  patientName?: string;
  patientId?: string;
  reportDate?: string;
  facilityName?: string;
  summaryNote?: string;
  parameterDetails?: ExtractedParameterDetail[];
  unmappedFields?: string[];
  pagesProcessed?: number;
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
 * Standardize and clean unit string extracted from report or OCR text
 */
export function cleanUnitString(rawUnit?: string): string | undefined {
  if (!rawUnit) return undefined;
  const u = rawUnit.trim();
  if (/^mg\s*[\/|.]?\s*d[l1i]|^mgd|^mg[i1l]a[l1]|^mg[i1l]d[l1]|^mgldl|^mglal/i.test(u)) return 'mg/dL';
  if (/^mmol\s*[\/|.]?\s*[l1|]/i.test(u)) return 'mmol/L';
  if (/^g\s*[\/|.]?\s*[ld]/i.test(u)) return 'g/L';
  if (/^mg\s*[\/|.]?\s*[l1]/i.test(u)) return 'mg/L';
  if (/%/i.test(u)) return '%';
  if (/mm\s*hg/i.test(u)) return 'mmHg';
  if (/bpm|beats/i.test(u)) return 'bpm';
  if (/kg\s*[\/|.]?\s*m/i.test(u)) return 'kg/m²';
  if (/hu/i.test(u)) return 'HU';
  if (/au|agatston/i.test(u)) return 'AU';
  return u.split(/\s+/)[0];
}

/**
 * Clean OCR text by fixing common typographical, character artifacts, and unit misreads.
 * Properly handles thousands separators (e.g. 1,200 -> 1200) vs decimal commas (e.g. 5,6 -> 5.6).
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[“”"']/g, '"')
    // Remove stray quote/degree characters immediately after numbers (e.g. 156.00" -> 156.00, 84° -> 84)
    .replace(/(\d+)\s*[°*^'"]\s*/g, '$1 ')
    // Normalize OCR misreads of conventional laboratory units
    .replace(/\b(?:mg\/dl|mg\/d[l1i]|mg[i1l]a[l1]|mg[i1l]d[l1]|mgldl|mglal)\b/gi, 'mg/dL')
    .replace(/\b(?:mmol\/[l|1]|mmo\/l)\b/gi, 'mmol/L')
    // Remove thousands separators e.g. 1,200 -> 1200 or 250,000 -> 250000
    .replace(/(\d{1,3}),(\d{3})\b/g, '$1$2')
    // Convert decimal comma e.g. 5,6 -> 5.6 or 28,6 -> 28.6
    .replace(/(\d+)\s*,\s*(\d{1,2})\b/g, '$1.$2');
}

/**
 * Remove reference range columns, historical comparisons, flags, and trailing noise
 * from a line to strictly isolate the current patient result.
 */
export function cleanLineForPatientResult(line: string): string {
  let resultPart = line;

  // 1. Strip bracketed or parenthesized ranges, reference intervals, or historical markers
  // e.g. (< 200), [120 - 200 mg/dL], (4.0 - 5.6%), (Ref: < 200), [Normal: 120-200], (Prior: 210 mg/dL)
  // Ensure we do NOT strip clinical parameter abbreviations such as (Fasting Blood Sugar / FBS) or (PPBS) or (Direct)
  resultPart = resultPart.replace(/\((?!\s*(?:fasting|ppbs|fbs|direct|calculated|cbc|esr|agatston|fai|cac|hdl|ldl|vldl)\b)[^)]*(?:ref|range|interval|norm|desir|optim|stand|limit|prior|prev|hist|base|<|>|≤|≥)[^)]*\)/gi, ' ');
  resultPart = resultPart.replace(/\[(?!\s*(?:fasting|ppbs|fbs|direct|calculated|cbc|esr|agatston|fai|cac|hdl|ldl|vldl)\b)[^\]]*(?:ref|range|interval|norm|desir|optim|stand|limit|prior|prev|hist|base|<|>|≤|≥)[^\]]*\]/gi, ' ');
  // Also strip plain numeric ranges in parentheses/brackets e.g. (120 - 200) or (4.0 - 5.6%)
  resultPart = resultPart.replace(/\(\s*\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\s*\)/gi, ' ');
  resultPart = resultPart.replace(/\[\s*\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\s*\]/gi, ' ');

  // 2. Strip explicit historical / previous measurement phrases (inline or prefixed)
  resultPart = resultPart.replace(/\b(?:previous|prior|historical|prev|past|baseline)(?:\s*(?:value|result|reading))?[\s.:=]+[<>]?\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*[a-zA-Z%µ/²³^]*/gi, ' ');

  // 3. Strip common reference interval headers or indicators
  const refKeywords = [
    /\b(?:biological\s*ref(?:erence)?\s*(?:interval|range|values?|limits?)?|reference\s*(?:interval|range|values?|limits?)?|ref\.?\s*(?:range|interval|values?|limits?)?|normal\s*(?:range|values?|interval)?|norm\.?\s*(?:range)?|desirable|optimal|interval|std\s*range|standard\s*range|cut-?off|limits?|expected\s*(?:range|values?)?|target\s*(?:range|values?)?)\b/i,
  ];

  for (const kw of refKeywords) {
    const idx = resultPart.search(kw);
    if (idx !== -1) {
      const rest = resultPart.slice(idx);
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

  // 5. Strip unparenthesized reference ranges (e.g. "120 - 200 mg/dL", "60 - 100 bpm", "74-109", "70-140")
  resultPart = resultPart.replace(/\b\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?\s*[a-zA-Z%µ/²³^]*\b/gi, ' ');

  return resultPart;
}

interface ExtractedMetricMatch {
  value: number;
  unit?: string;
  rawSnippet?: string;
}

function matchValueAfterEntity(
  cleanedText: string,
  entityRegex: RegExp,
  min: number,
  max: number,
  unitConverter?: (val: number, unitStr?: string) => number
): ExtractedMetricMatch | undefined {
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
        return {
          value: Math.round(val * 100) / 100,
          unit: cleanUnitString(unitStr),
          rawSnippet: entityMatch[0] + ' ' + numMatch[0].trim(),
        };
      }
    }
  }
  return undefined;
}

/**
 * Extract numeric value from candidate text matching entity pattern.
 * Supports multiline table rows and columns.
 */
function extractNumericMetric(
  text: string,
  entityRegex: RegExp,
  min: number,
  max: number,
  unitConverter?: (val: number, unitStr?: string) => number
): ExtractedMetricMatch | undefined {
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
      if (/^(?:Total\s+Cholesterol|HDL|LDL|VLDL|Triglycerides|Apolipoprotein|Blood\s+Pressure|Heart\s+Rate|HbA1c|Glucose|Fast|Calcium|CAC|FAI|IMAGING|VITAL|High-Sensitivity)/i.test(nextLine)) {
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
    const snippet = text.slice(match.index + match[0].length, match.index + match[0].length + 50);
    const firstLine = snippet.split('\n')[0];
    const cleaned = cleanLineForPatientResult(firstLine);
    const numMatch = cleaned.match(/^[^\d<>]{0,25}?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z%µ/²^3]+)?/i);
    if (numMatch) {
      let val = parseFloat(numMatch[1]);
      const unitStr = numMatch[2];
      if (!isNaN(val)) {
        if (unitConverter) val = unitConverter(val, unitStr);
        if (val >= min && val <= max) {
          return {
            value: Math.round(val * 100) / 100,
            unit: cleanUnitString(unitStr),
            rawSnippet: match[0] + ' ' + numMatch[0].trim(),
          };
        }
      }
    }
  }

  return undefined;
}

/**
 * Deterministic extraction of all supported clinical parameters from raw text.
 * When pageNumber is provided, records source page metadata for full traceability.
 */
export function parseClinicalText(rawText: string, pageNumber?: number): ExtractedReportResult {
  const text = cleanOcrText(rawText);
  const fields: ReportFields = {};
  const parameterDetails: ExtractedParameterDetail[] = [];
  let count = 0;

  // 1. Patient Demographics & Identifiers
  // Patient Name
  const nameMatch =
    text.match(/(?:Patient\s*Name|Patient\s*Full\s*Name|Full\s*Name|Pt\s*Name|Name\s*of\s*Patient)[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([A-Za-z\s.]{3,35})/i) ||
    text.match(/(?:^|\n)\s*Name[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([A-Za-z\s.]{3,35})/i) ||
    text.match(/(?:^|\n)\s*Patient\s*[:|]\s*(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([A-Za-z\s.]{3,35})/i);
  if (nameMatch) {
    let rawName = nameMatch[1].split(/\s{2,}|\t/)[0].trim();
    rawName = rawName
      .replace(/(?:Patient\s*ID|\bPID\b|\bUHID\b|Age|Gender|Sex|Date|Ref|DOB|Phone|Dr)[\s.:|-].*/i, '')
      .trim();
    if (
      rawName.length >= 2 &&
      !/^(?:No|UFID|UTD|ID|Sample|Test|Hospital|Clinical|Normal|Result|Doctor|Billed|Case|Profile|Investigation)/i.test(rawName)
    ) {
      fields.patientName = rawName;
    }
  }

  // Patient ID (enforce word boundary \bPID\b so LIPID is never confused with PID)
  const idMatch =
    text.match(/(?:Patient\s*No\.?\s*[/\\|]?\s*U[FH]ID|Patient\s*ID|\bPID\b|\bUHID\b|MRN|Patient\s*#|Reg(?:\.|istration)?\s*No\.?|Case\s*No\.?)[\s.:|=/]+([A-Za-z0-9-_/]{4,35})/i);
  if (idMatch) {
    const rawId = idMatch[1].trim();
    if (!/^(?:UTD|UFID|PROFILE|NORMAL|RESULT)$/i.test(rawId)) {
      fields.patientId = rawId;
    }
  }

  // Age
  const ageMatch = text.match(/(?:^|\n|\s|\b)(?:Age|Age\s*[/\\|]?\s*(?:Gender|Sex))[\s.:|+]+(\d{1,3})\b/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 1 && age <= 120) {
      fields.age = age;
    }
  }

  // Gender / Sex
  const sexMatch = text.match(/(?:^|\n|\s|\b)(?:Gender|Sex)[\s.:|-]+(Male|Female|\bM\b|\bF\b)/i);
  if (sexMatch) {
    const s = sexMatch[1].toLowerCase();
    if (s.startsWith('m')) fields.sex = 'male';
    else if (s.startsWith('f')) fields.sex = 'female';
  } else {
    const combinedDemog = text.match(/(?:Age|Demographics)[\s.:|-]+\d{1,3}\s*(?:Y|Yrs|Years)?\s*[/\\|]\s*(Male|Female|\bM\b|\bF\b)/i);
    if (combinedDemog) {
      const s = combinedDemog[1].toLowerCase();
      if (s.startsWith('m')) fields.sex = 'male';
      else if (s.startsWith('f')) fields.sex = 'female';
    }
  }

  // Report Date extraction
  let reportDate: string | undefined;
  const dateMatch =
    text.match(/(?:Report\s*Date|Collection\s*Date|Sample\s*Date|Test\s*Date|Date\s*of\s*Collection|Date\s*of\s*Report|Date)[\s.:|-]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-\s/]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s/]+\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
  if (dateMatch) {
    reportDate = dateMatch[1].trim();
  }

  // Facility / Laboratory extraction
  let facilityName: string | undefined;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    const prefixMatch = trimmed.match(/^(?:Laboratory|Lab|Hospital|Diagnostic\s*Centre?|Diagnostics|Clinic|Medical\s*Center)[\s.:|-]+([A-Za-z0-9\s&,.-]{3,40})/i);
    if (prefixMatch) {
      const candidate = prefixMatch[1].trim();
      if (!/^(?:Report|Result|Test|Sample|Patient|Investigation|Department)/i.test(candidate)) {
        facilityName = candidate;
        break;
      }
    }

    if (/(?:Hospitals?|Diagnostics?|Laborator(?:y|ies)|PathLabs?|Healthcare|Clinic|Medical\s*Center)/i.test(trimmed)) {
      if (!/^(?:Report|Patient|Doctor|Normal|Result|Test|Sample|Clinical|Biological|Reference)/i.test(trimmed)) {
        if (!/^(?:Laboratory|Lab|Hospital|Diagnostic)\s*(?:Report|Summary|Investigation|Results?)$/i.test(trimmed)) {
          facilityName = trimmed.replace(/[\s.:|-]+$/, '');
          break;
        }
      }
    }
  }

  // 2. Blood Pressure (Systolic & Diastolic)
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
      parameterDetails.push({
        parameter: 'Blood Pressure',
        fieldKey: 'systolic',
        value: `${Math.round(sys)}/${Math.round(dia)}`,
        unit: 'mmHg',
        sourcePage: pageNumber,
        status: sys >= 90 && sys <= 180 && dia >= 60 && dia <= 110 ? 'accepted' : 'review',
        rawSnippet: bpLineMatch[0],
      });
      bpFound = true;
      break;
    }
  }

  if (!bpFound) {
    const sys = extractNumericMetric(text, /(?:Systolic(?:\s+Blood)?(?:\s+Pressure)?|Systolic\s+BP|\bSBP\b)/i, 60, 260);
    if (sys !== undefined) {
      fields.systolic = Math.round(sys.value);
      count++;
      parameterDetails.push({
        parameter: 'Systolic Blood Pressure',
        fieldKey: 'systolic',
        value: Math.round(sys.value),
        unit: 'mmHg',
        sourcePage: pageNumber,
        status: sys.value >= 90 && sys.value <= 180 ? 'accepted' : 'review',
        rawSnippet: sys.rawSnippet,
      });
    }
    const dia = extractNumericMetric(text, /(?:Diastolic(?:\s+Blood)?(?:\s+Pressure)?|Diastolic\s+BP|\bDBP\b)/i, 30, 160);
    if (dia !== undefined) {
      fields.diastolic = Math.round(dia.value);
      count++;
      parameterDetails.push({
        parameter: 'Diastolic Blood Pressure',
        fieldKey: 'diastolic',
        value: Math.round(dia.value),
        unit: 'mmHg',
        sourcePage: pageNumber,
        status: dia.value >= 60 && dia.value <= 110 ? 'accepted' : 'review',
        rawSnippet: dia.rawSnippet,
      });
    }
  }

  // 3. Heart Rate (bpm)
  const hr = extractNumericMetric(text, /(?:Heart\s+Rate|Resting\s+(?:Heart\s+Rate|HR)|Pulse\s+Rate|Pulse|\bHR\b|\bP\.?R\.?\b)/i, 30, 220);
  if (hr !== undefined) {
    fields.heartRate = Math.round(hr.value);
    count++;
    parameterDetails.push({
      parameter: 'Heart Rate',
      fieldKey: 'heartRate',
      value: Math.round(hr.value),
      unit: 'bpm',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: hr.rawSnippet,
    });
  }

  // 4. Body Mass Index (BMI) (kg/m²)
  const bmi = extractNumericMetric(text, /(?:Body\s+Mass\s+Index|\bBMI\b)/i, 10, 70);
  if (bmi !== undefined) {
    fields.bmi = bmi.value;
    count++;
    parameterDetails.push({
      parameter: 'Body Mass Index',
      fieldKey: 'bmi',
      value: bmi.value,
      unit: 'kg/m²',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: bmi.rawSnippet,
    });
  }

  // 5. Total Cholesterol (mg/dL or mmol/L)
  const tc = extractNumericMetric(
    text,
    /(?:(?:Total|Serum|S\.?)\s*[-–]?\s*Cholesterol|Cholesterol[,\s\-–]+Total|Cholesterol\s*\(\s*Total\s*\)|T-?Chol\b|\bTC\b|Cholesterol-Total\b|Cholesterol\b)/i,
    50,
    600,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (tc !== undefined) {
    fields.totalCholesterol = Math.round(tc.value);
    count++;
    parameterDetails.push({
      parameter: 'Total Cholesterol',
      fieldKey: 'totalCholesterol',
      value: Math.round(tc.value),
      unit: tc.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: tc.rawSnippet,
    });
  }

  // 6. HDL Cholesterol (mg/dL or mmol/L)
  const hdl = extractNumericMetric(
    text,
    /(?:High\s+Density\s+Lipoproteins?(?:\s*\(HDL\))?|HDL(?:\s*[-–]?\s*Cholesterol)?(?:\s*[-–]?\s*Direct)?|HDL-?C|\bHDL\b)/i,
    10,
    150,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (hdl !== undefined) {
    fields.hdl = Math.round(hdl.value);
    count++;
    parameterDetails.push({
      parameter: 'HDL Cholesterol',
      fieldKey: 'hdl',
      value: Math.round(hdl.value),
      unit: hdl.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: hdl.rawSnippet,
    });
  }

  // 7. LDL Cholesterol (mg/dL or mmol/L)
  const ldl = extractNumericMetric(
    text,
    /(?:Low\s+Density\s+Lipoproteins?(?:\s*\(LDL\))?|LDL(?:\s*[-–]?\s*Cholesterol)?(?:\s*[-–]?\s*(?:Direct|Calculated|\(Direct\)|\(Calculated\)))?|LDL-?C|\bLDL\b)/i,
    20,
    450,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (ldl !== undefined) {
    fields.ldl = Math.round(ldl.value);
    count++;
    parameterDetails.push({
      parameter: 'LDL Cholesterol',
      fieldKey: 'ldl',
      value: Math.round(ldl.value),
      unit: ldl.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: ldl.rawSnippet,
    });
  }

  // 8. Triglycerides (mg/dL or mmol/L)
  const tg = extractNumericMetric(
    text,
    /(?:(?:Serum|S\.?)\s*[-–]?\s*Triglycerides?|Triglycerides?|TRIG\b|TGL\b|\bTG\b)/i,
    20,
    1500,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 88.57 : val)
  );
  if (tg !== undefined) {
    fields.triglycerides = Math.round(tg.value);
    count++;
    parameterDetails.push({
      parameter: 'Triglycerides',
      fieldKey: 'triglycerides',
      value: Math.round(tg.value),
      unit: tg.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: tg.rawSnippet,
    });
  }

  // 9. VLDL Cholesterol (mg/dL or mmol/L)
  const vldl = extractNumericMetric(
    text,
    /(?:Very\s+Low\s+Density\s+Lipoproteins?(?:\s*\(VLDL\))?|VLDL(?:\s*[-–]?\s*Cholesterol)?|VLDL-?C|\bVLDL\b)/i,
    2,
    150,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 38.67 : val)
  );
  if (vldl !== undefined) {
    fields.vldl = Math.round(vldl.value);
    count++;
    parameterDetails.push({
      parameter: 'VLDL Cholesterol',
      fieldKey: 'vldl',
      value: Math.round(vldl.value),
      unit: vldl.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: vldl.rawSnippet,
    });
  }

  // 10. Apolipoprotein B (ApoB) (mg/dL or g/L)
  const apob = extractNumericMetric(
    text,
    /(?:Apolipoprotein\s*[-–]?\s*B(?:-?100)?(?:\s*\(ApoB\))?|Apo\s*[-–]?\s*B(?:-?100)?\b)/i,
    20,
    350,
    (val, unit) => (unit && /g\/[ld]/i.test(unit) && val < 5 ? val * 100 : val)
  );
  if (apob !== undefined) {
    fields.apoB = Math.round(apob.value);
    count++;
    parameterDetails.push({
      parameter: 'Apolipoprotein B',
      fieldKey: 'apoB',
      value: Math.round(apob.value),
      unit: 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: apob.rawSnippet,
    });
  }

  // 11. ApoB / ApoA1 Ratio
  const apobRatio = extractNumericMetric(
    text,
    /(?:Apo\s*B\s*[/\\:–-]\s*Apo\s*A-?1(?:\s*Ratio)?)/i,
    0.1,
    4.0
  );
  if (apobRatio !== undefined) {
    fields.apoBApoa1Ratio = apobRatio.value;
    count++;
    parameterDetails.push({
      parameter: 'ApoB / ApoA1 Ratio',
      fieldKey: 'apoBApoa1Ratio',
      value: apobRatio.value,
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: apobRatio.rawSnippet,
    });
  }

  // 12. Lipoprotein(a) [Lp(a)] (mg/dL)
  const lpa = extractNumericMetric(
    text,
    /(?:Lipoprotein\s*[-–]?\s*\(?\s*a\s*\)?(?:\s*\[Lp\(a\)\])?|Lp\s*\(?\s*a\s*\)?)/i,
    0,
    400
  );
  if (lpa !== undefined) {
    fields.lpa = Math.round(lpa.value);
    count++;
    parameterDetails.push({
      parameter: 'Lipoprotein(a)',
      fieldKey: 'lpa',
      value: Math.round(lpa.value),
      unit: 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: lpa.rawSnippet,
    });
  }

  // 13. High-Sensitivity CRP (hs-CRP) (mg/L or mg/dL)
  const hscrp = extractNumericMetric(
    text,
    /(?:High[- ]?Sensitivity\s+(?:C[- ]?Reactive\s+Protein|CRP)(?:\s*\(hs[- ]?CRP\))?|hs[- ]?(?:C[- ]?Reactive\s+Protein|CRP)|hsCRP)/i,
    0.05,
    100,
    (val, unit) => (unit && /mg\/dl/i.test(unit) ? val * 10 : val)
  );
  if (hscrp !== undefined) {
    fields.hsCRP = hscrp.value;
    count++;
    parameterDetails.push({
      parameter: 'High-Sensitivity CRP',
      fieldKey: 'hsCRP',
      value: hscrp.value,
      unit: 'mg/L',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: hscrp.rawSnippet,
    });
  }

  // 14. Glycated Hemoglobin (HbA1c) (% or mmol/mol)
  const hba1c = extractNumericMetric(
    text,
    /(?:Hb\s*A1c|HbA1c(?:\s*\(Glycated\s+Hemoglobin\))?|Glycosylated\s+Hemoglobin|Glycated\s+Hemoglobin|Hemoglobin\s+A1c|A1C\b)/i,
    3.0,
    20.0,
    (val, unit) => (unit && /mmol\/mol/i.test(unit) ? (val * 0.09148) + 2.152 : val)
  );
  if (hba1c !== undefined) {
    fields.hba1c = Math.round(hba1c.value * 10) / 10;
    count++;
    parameterDetails.push({
      parameter: 'HbA1c',
      fieldKey: 'hba1c',
      value: Math.round(hba1c.value * 10) / 10,
      unit: '%',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: hba1c.rawSnippet,
    });
  }

  // 15. Fasting Blood Glucose (mg/dL or mmol/L)
  const fbs = extractNumericMetric(
    text,
    /(?:Fasting\s+(?:Blood\s+|Plasma\s+)?(?:Glucose|Sugar)|(?:Blood\s+|Plasma\s+)?Glucose[,\s\-–\/(]+\s*(?:Fasting|FBS)|Glucose\s*\(\s*(?:Fasting|FBS)[^)]*\)|FBS\b|FPG\b)/i,
    30,
    600,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 18.0182 : val)
  );
  if (fbs !== undefined) {
    fields.fastingGlucose = Math.round(fbs.value);
    count++;
    parameterDetails.push({
      parameter: 'Fasting Glucose',
      fieldKey: 'fastingGlucose',
      value: Math.round(fbs.value),
      unit: fbs.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: fbs.rawSnippet,
    });
  }

  // 16. Postprandial Blood Glucose (PPBS) (mg/dL or mmol/L)
  const ppbs = extractNumericMetric(
    text,
    /(?:(?:Glucose\s+)?Post\s*[-–]?\s*Prandial(?:\s+(?:Blood\s+|Plasma\s+)?(?:Glucose|Sugar))?|Glucose\s+Post\s*Prandial(?:\s*\(PPBS\))?|PPBS\b|Postprandial\s+(?:Blood\s+|Plasma\s+)?Glucose)/i,
    40,
    600,
    (val, unit) => (unit && /mmol/i.test(unit) ? val * 18.0182 : val)
  );
  if (ppbs !== undefined) {
    fields.postprandialGlucose = Math.round(ppbs.value);
    count++;
    parameterDetails.push({
      parameter: 'Postprandial Glucose',
      fieldKey: 'postprandialGlucose',
      value: Math.round(ppbs.value),
      unit: ppbs.unit || 'mg/dL',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: ppbs.rawSnippet,
    });
  }

  // 17. Coronary Artery Calcium (CAC) Score (Agatston)
  const cac = extractNumericMetric(
    text,
    /(?:Coronary\s+(?:Artery\s+)?Calcium(?:\s*\(CAC\))?(?:\s+Score)?|(?:Coronary\s+)?Calcium\s+Score|Agatston\s+(?:Calcium\s+)?Score|CAC\s+Score|\bCAC\b)/i,
    0,
    5000
  );
  if (cac !== undefined) {
    fields.cac = Math.round(cac.value);
    count++;
    parameterDetails.push({
      parameter: 'Coronary Calcium Score (CAC)',
      fieldKey: 'cac',
      value: Math.round(cac.value),
      unit: 'AU',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: cac.rawSnippet,
    });
  }

  // 18. Fat Attenuation Index (FAI) (HU)
  let faiVal: number | undefined;
  let faiSnippet: string | undefined;
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
          faiSnippet = m[0];
          break;
        }
      }
    }
  }
  if (faiVal !== undefined) {
    fields.fai = faiVal;
    count++;
    parameterDetails.push({
      parameter: 'Fat Attenuation Index (FAI)',
      fieldKey: 'fai',
      value: faiVal,
      unit: 'HU',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: faiSnippet,
    });
  }

  // 19. Coronary Plaque Type
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
    parameterDetails.push({
      parameter: 'Plaque Type',
      fieldKey: 'plaqueType',
      value: pt,
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: plaqueMatch[0],
    });
  } else if (/mixed\s+plaque/i.test(text)) {
    fields.plaqueType = 'mixed';
    count++;
    parameterDetails.push({
      parameter: 'Plaque Type',
      fieldKey: 'plaqueType',
      value: 'mixed',
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
    });
  } else if (/non[- ]?calcified\s+plaque/i.test(text)) {
    fields.plaqueType = 'non-calcified';
    count++;
    parameterDetails.push({
      parameter: 'Plaque Type',
      fieldKey: 'plaqueType',
      value: 'non-calcified',
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
    });
  } else if (/calcified\s+plaque/i.test(text)) {
    fields.plaqueType = 'calcified';
    count++;
    parameterDetails.push({
      parameter: 'Plaque Type',
      fieldKey: 'plaqueType',
      value: 'calcified',
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
    });
  }

  // 20. Plaque Location (Vessels: LAD, RCA, LCX, LM)
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
    parameterDetails.push({
      parameter: 'Plaque Location',
      fieldKey: 'plaqueLocation',
      value: Array.from(detectedLocs),
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: Array.from(detectedLocs).join(', '),
    });
  }

  // 21. Maximal Stenosis Severity
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
    parameterDetails.push({
      parameter: 'Maximal Stenosis',
      fieldKey: 'stenosisSeverity',
      value: sev,
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
      rawSnippet: stenosisMatch[0],
    });
  } else if (/>70%/i.test(text)) {
    fields.stenosisSeverity = '>70%';
    count++;
    parameterDetails.push({
      parameter: 'Maximal Stenosis',
      fieldKey: 'stenosisSeverity',
      value: '>70%',
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
    });
  } else if (/50-70%|50–70%/i.test(text)) {
    fields.stenosisSeverity = '50-70%';
    count++;
    parameterDetails.push({
      parameter: 'Maximal Stenosis',
      fieldKey: 'stenosisSeverity',
      value: '50-70%',
      unit: '',
      sourcePage: pageNumber,
      status: 'accepted',
    });
  }

  // 22. Summary Impression / Clinical Note
  const summaryMatch = text.match(/Summary\s*(?:Impression|Note)?[\s.:|-]+([\s\S]*?)(?:===|Dr\.|Date:|$)/i);
  const summaryNote = summaryMatch ? summaryMatch[1].trim().slice(0, 300) : undefined;

  // 23. Detect common unsupported clinical parameters and report as unmapped
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
    reportDate,
    facilityName,
    summaryNote,
    parameterDetails,
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
 * Helper to create standard uncompressed BMP buffer from raw RGB image data in Node.js test environment.
 */
export function createBmpFromImageData(width: number, height: number, data: Uint8Array | Uint8ClampedArray, kind: number): any {
  const nodeBuf = (globalThis as any).Buffer;
  if (!nodeBuf) return null;

  const rowBytes = width * 3;
  const padding = (4 - (rowBytes % 4)) % 4;
  const stride = rowBytes + padding;
  const pixelArraySize = stride * height;
  const fileSize = 54 + pixelArraySize;
  const buf = nodeBuf.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22); // top-down
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);

  let srcOffset = 0;
  let dstOffset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf[dstOffset] = data[srcOffset + 2];     // B
      buf[dstOffset + 1] = data[srcOffset + 1]; // G
      buf[dstOffset + 2] = data[srcOffset];     // R
      srcOffset += 3;
      dstOffset += 3;
    }
    for (let p = 0; p < padding; p++) {
      buf[dstOffset++] = 0;
    }
  }
  return buf;
}

/**
 * Extract text from PDF document supporting both selectable text PDFs and scanned/image PDFs.
 * Accurately analyzes all pages, preserves page boundaries, tags parameters with source page numbers,
 * and skips OCR on pages that already contain readable text.
 */
export async function extractFromPdf(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  onProgress?.(10, 'Loading PDF document structure...');

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

  onProgress?.(15, `Inspecting text layers across ${numPages} page(s)...`);

  // Step 1: Read text layer for each page and identify scanned vs readable pages
  const pageEntries: Array<{ pageNumber: number; text: string; isScanned: boolean }> = [];
  let totalTextChars = 0;

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

    const meaningfulChars = pageText.replace(/\s+/g, '').length;
    totalTextChars += meaningfulChars;
    // If page has >= 35 characters of text content, it has readable text
    const isScanned = meaningfulChars < 35;
    pageEntries.push({ pageNumber: i, text: pageText, isScanned });
  }

  const scannedCount = pageEntries.filter((p) => p.isScanned).length;

  // Step 2: For scanned pages, run OCR using a shared Tesseract worker
  let ocrWorker: any = null;

  if (scannedCount > 0) {
    onProgress?.(25, `Scanned pages detected (${scannedCount} of ${numPages}). Initializing clinical OCR...`);
    try {
      ocrWorker = await Tesseract.createWorker('eng');
    } catch (err) {
      console.warn('Tesseract worker initialization fallback:', err);
    }

    for (let idx = 0; idx < pageEntries.length; idx++) {
      const entry = pageEntries[idx];
      if (!entry.isScanned) continue;

      const pageNum = entry.pageNumber;
      const currentPct = Math.round(25 + ((idx + 1) / numPages) * 60);
      onProgress?.(currentPct, `Running clinical OCR on page ${pageNum} of ${numPages}...`);

      const page = await pdfDoc.getPage(pageNum);
      let pageOcrText = '';

      try {
        if (typeof document !== 'undefined') {
          // Browser environment: render page to canvas
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await (page.render({ canvasContext: ctx, viewport } as any)).promise;
            const dataUrl = canvas.toDataURL('image/png');
            if (ocrWorker) {
              const res = await ocrWorker.recognize(dataUrl);
              pageOcrText = res.data.text;
            } else {
              const res = await Tesseract.recognize(dataUrl, 'eng');
              pageOcrText = res.data.text;
            }
          }
        } else {
          // Node.js test environment: extract embedded image from operator list
          const ops = await page.getOperatorList();
          for (let j = 0; j < ops.fnArray.length; j++) {
            if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
              const objId = ops.argsArray[j][0];
              const img: any = await new Promise((resolve) => page.objs.get(objId, resolve));
              if (img && img.data) {
                const bmp = createBmpFromImageData(img.width, img.height, img.data, img.kind);
                if (bmp) {
                  if (ocrWorker) {
                    const res = await ocrWorker.recognize(bmp);
                    pageOcrText = res.data.text;
                  } else {
                    const res = await Tesseract.recognize(bmp, 'eng');
                    pageOcrText = res.data.text;
                  }
                }
                break;
              }
            }
          }
        }
      } catch (ocrErr: any) {
        console.error(`OCR processing failed on page ${pageNum}:`, ocrErr);
        throw new Error(`OCR processing failed on page ${pageNum}: ${ocrErr?.message || 'Optical character recognition error'}`);
      }

      entry.text = pageOcrText;
    }

    if (ocrWorker) {
      await ocrWorker.terminate();
    }
  }

  // Step 3: Parse parameters page by page, preserving source page traceability
  onProgress?.(90, 'Aggregating and validating clinical parameters across all pages...');

  const aggregatedFields: ReportFields = {};
  const allParameterDetails: ExtractedParameterDetail[] = [];
  const unmappedSet = new Set<string>();
  let fullAccumulatedText = '';
  let patientName: string | undefined;
  let patientId: string | undefined;
  let summaryNote: string | undefined;
  let reportDate: string | undefined;
  let facilityName: string | undefined;

  for (const entry of pageEntries) {
    fullAccumulatedText += `\n--- Page ${entry.pageNumber} ---\n` + entry.text;
    const pageResult = parseClinicalText(entry.text, entry.pageNumber);

    if (pageResult.patientName && !patientName) {
      patientName = pageResult.patientName;
    }
    if (pageResult.patientId && !patientId) {
      patientId = pageResult.patientId;
    }
    if (pageResult.summaryNote && !summaryNote) {
      summaryNote = pageResult.summaryNote;
    }
    if (pageResult.reportDate && !reportDate) {
      reportDate = pageResult.reportDate;
    }
    if (pageResult.facilityName && !facilityName) {
      facilityName = pageResult.facilityName;
    }

    if (pageResult.unmappedFields) {
      for (const u of pageResult.unmappedFields) {
        unmappedSet.add(u);
      }
    }

    for (const [key, val] of Object.entries(pageResult.fields)) {
      if ((aggregatedFields as any)[key] === undefined && val !== undefined) {
        (aggregatedFields as any)[key] = val;
      }
    }

    if (pageResult.parameterDetails) {
      for (const pd of pageResult.parameterDetails) {
        // Only keep first occurrence per parameter key to avoid duplicates across pages
        if (!allParameterDetails.some((existing) => existing.fieldKey === pd.fieldKey)) {
          allParameterDetails.push(pd);
        }
      }
    }
  }

  if (patientName && !aggregatedFields.patientName) aggregatedFields.patientName = patientName;
  if (patientId && !aggregatedFields.patientId) aggregatedFields.patientId = patientId;

  // Total count of verified parameters
  const totalExtractedCount = Object.keys(aggregatedFields).filter(
    (k) => k !== 'patientName' && k !== 'patientId'
  ).length;

  onProgress?.(100, `Successfully processed ${numPages} page(s) (${totalExtractedCount} values recognized).`);

  return {
    fields: aggregatedFields,
    extractedCount: totalExtractedCount,
    rawText: fullAccumulatedText,
    patientName: aggregatedFields.patientName,
    patientId: aggregatedFields.patientId,
    reportDate,
    facilityName,
    summaryNote,
    parameterDetails: allParameterDetails,
    unmappedFields: Array.from(unmappedSet),
    pagesProcessed: numPages,
  };
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

    onProgress?.(95, 'Extracting and validating clinical parameters...');
    const result = parseClinicalText(ocrResult.data.text, 1);
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

  let result: ExtractedReportResult;

  if (isPdf) {
    result = await extractFromPdf(file, onProgress);
  } else if (isImage) {
    result = await extractFromImage(file, onProgress);
  } else {
    // Plain text fallback
    try {
      onProgress?.(40, 'Reading report text...');
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        throw new Error(`Report file "${file.name}" contains no readable text.`);
      }
      onProgress?.(85, 'Extracting clinical values...');
      result = parseClinicalText(text, 1);
      onProgress?.(100, `Extracted ${result.extractedCount} parameters.`);
    } catch (err: any) {
      console.error('Text file read failed:', err);
      if (err instanceof Error) throw err;
      throw new Error(`Failed to read plain text report: ${String(err)}`);
    }
  }

  // Preserve sourceFile, reportDate, and facilityName across all parameterDetails
  if (result && result.parameterDetails) {
    for (const pd of result.parameterDetails) {
      if (!pd.sourceFile) pd.sourceFile = file.name;
      if (!pd.sourceDate && result.reportDate) pd.sourceDate = result.reportDate;
      if (!pd.sourceFacility && result.facilityName) pd.sourceFacility = result.facilityName;
    }
  }

  return result;
}
