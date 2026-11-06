/**
 * Multi-Report Merger Service
 * ===========================
 * Deterministic aggregation, conflict detection, and provenance tracking
 * when processing multiple medical reports from different laboratories,
 * hospitals, or diagnostic centers.
 *
 * Strict Clinical Safety Rules:
 * 1. Do NOT silently overwrite one result with another.
 * 2. Preserve both source values, source documents, dates, and units.
 * 3. Never average conflicting values or invent clinical selection rules.
 * 4. Distinct complementary parameters from different reports merge cleanly.
 * 5. Full traceability to source file, report date, facility, and page number.
 */

import type { ReportFields, ExtractedParameterDetail, ParameterConflict, ParameterConflictSource } from '../store/simStore';
import type { ExtractedReportResult } from './clinicalExtractor';

export const FIELD_LABELS: Record<keyof ReportFields, { label: string; defaultUnit?: string }> = {
  totalCholesterol: { label: 'Total Cholesterol', defaultUnit: 'mg/dL' },
  hdl: { label: 'HDL Cholesterol', defaultUnit: 'mg/dL' },
  ldl: { label: 'LDL Cholesterol', defaultUnit: 'mg/dL' },
  vldl: { label: 'VLDL Cholesterol', defaultUnit: 'mg/dL' },
  triglycerides: { label: 'Triglycerides', defaultUnit: 'mg/dL' },
  apoB: { label: 'Apolipoprotein B', defaultUnit: 'mg/dL' },
  apoBApoa1Ratio: { label: 'ApoB / ApoA-1 Ratio', defaultUnit: 'ratio' },
  lpa: { label: 'Lipoprotein(a)', defaultUnit: 'mg/dL' },
  hsCRP: { label: 'High-Sensitivity CRP', defaultUnit: 'mg/L' },
  hba1c: { label: 'HbA1c Glycated Hemoglobin', defaultUnit: '%' },
  fastingGlucose: { label: 'Fasting Blood Glucose', defaultUnit: 'mg/dL' },
  postprandialGlucose: { label: 'Postprandial Blood Glucose', defaultUnit: 'mg/dL' },
  cac: { label: 'Coronary Artery Calcium (CAC)', defaultUnit: 'Agatston' },
  fai: { label: 'Fat Attenuation Index (FAI)', defaultUnit: 'HU' },
  plaqueType: { label: 'Plaque Morphology' },
  plaqueLocation: { label: 'Plaque Location' },
  stenosisSeverity: { label: 'Maximal Stenosis' },
  systolic: { label: 'Systolic Blood Pressure', defaultUnit: 'mmHg' },
  diastolic: { label: 'Diastolic Blood Pressure', defaultUnit: 'mmHg' },
  heartRate: { label: 'Heart Rate', defaultUnit: 'bpm' },
  bmi: { label: 'Body Mass Index (BMI)', defaultUnit: 'kg/m²' },
  patientName: { label: 'Patient Name' },
  patientId: { label: 'Patient ID / MRN' },
  age: { label: 'Age', defaultUnit: 'years' },
  sex: { label: 'Biological Sex' },
};

export interface ProcessedReportInput {
  fileName: string;
  result: ExtractedReportResult;
  reportDate?: string;
  facilityName?: string;
}

export interface MergedReportsResult {
  mergedFields: ReportFields;
  parameterDetails: ExtractedParameterDetail[];
  conflicts: ParameterConflict[];
  unmappedFields: string[];
  totalExtractedCount: number;
  patientName?: string;
  patientId?: string;
  summaryNotes: string[];
  sourceReportsCount: number;
  hasUnresolvedConflicts: boolean;
}

/**
 * Compare two biomarker values for clinical equivalence
 */
export function areValuesEqual(
  a: number | string | string[] | undefined,
  b: number | string | string[] | undefined
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.001;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v.toLowerCase() === sortedB[i].toLowerCase());
  }

  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Detect conflicting biomarker measurements across multiple extracted reports
 */
export function detectReportConflicts(reports: ProcessedReportInput[]): ParameterConflict[] {
  const conflicts: ParameterConflict[] = [];
  const fieldKeys = Object.keys(FIELD_LABELS) as (keyof ReportFields)[];

  for (const key of fieldKeys) {
    if (key === 'patientName' || key === 'patientId') continue;

    const occurrences: {
      sourceFile: string;
      sourceDate?: string;
      sourceFacility?: string;
      value: number | string | string[];
      unit?: string;
      sourcePage?: number;
    }[] = [];

    for (const report of reports) {
      const val = report.result.fields[key];
      if (val !== undefined) {
        // Find parameter detail for unit and page if available
        const detail = report.result.parameterDetails?.find(pd => pd.fieldKey === key);
        occurrences.push({
          sourceFile: report.fileName,
          sourceDate: report.reportDate || report.result.reportDate,
          sourceFacility: report.facilityName || report.result.facilityName,
          value: val,
          unit: detail?.unit || FIELD_LABELS[key]?.defaultUnit,
          sourcePage: detail?.sourcePage,
        });
      }
    }

    if (occurrences.length > 1) {
      // Check if all values are equal
      const firstVal = occurrences[0].value;
      const hasConflict = occurrences.some(occ => !areValuesEqual(occ.value, firstVal));

      if (hasConflict) {
        conflicts.push({
          parameter: FIELD_LABELS[key]?.label || String(key),
          fieldKey: key,
          sources: occurrences,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Merge multiple extracted reports into a single unified patient assessment,
 * respecting user-selected conflict resolutions and preserving complete provenance.
 */
export function mergeExtractedReports(
  reports: ProcessedReportInput[],
  conflictResolutions?: Record<string, number>
): MergedReportsResult {
  const mergedFields: ReportFields = {};
  const allParameterDetails: ExtractedParameterDetail[] = [];
  const unmappedSet = new Set<string>();
  const summaryNotes: string[] = [];

  // 1. Detect all conflicts across reports
  const rawConflicts = detectReportConflicts(reports);
  const conflicts: ParameterConflict[] = rawConflicts.map(c => {
    const chosenIndex = conflictResolutions ? conflictResolutions[c.fieldKey] : undefined;
    if (chosenIndex !== undefined && c.sources[chosenIndex]) {
      return {
        ...c,
        resolvedValue: c.sources[chosenIndex].value,
        selectedSourceIndex: chosenIndex,
      };
    }
    return c;
  });

  const conflictKeySet = new Set(conflicts.map(c => c.fieldKey));
  let hasUnresolvedConflicts = false;

  // 2. Handle demographic fields (patientName, patientId, age, sex)
  let resolvedPatientName: string | undefined;
  let resolvedPatientId: string | undefined;
  let resolvedAge: number | undefined;
  let resolvedSex: 'male' | 'female' | undefined;

  for (const report of reports) {
    if (!resolvedPatientName && report.result.patientName) {
      resolvedPatientName = report.result.patientName;
    }
    if (!resolvedPatientId && report.result.patientId) {
      resolvedPatientId = report.result.patientId;
    }
    if (resolvedAge === undefined && report.result.fields.age !== undefined) {
      resolvedAge = report.result.fields.age;
    }
    if (!resolvedSex && report.result.fields.sex) {
      resolvedSex = report.result.fields.sex;
    }
    if (report.result.summaryNote) {
      summaryNotes.push(`[${report.fileName}] ${report.result.summaryNote}`);
    }
    if (report.result.unmappedFields) {
      report.result.unmappedFields.forEach(u => unmappedSet.add(u));
    }
  }

  if (resolvedPatientName) mergedFields.patientName = resolvedPatientName;
  if (resolvedPatientId) mergedFields.patientId = resolvedPatientId;
  if (resolvedAge !== undefined) mergedFields.age = resolvedAge;
  if (resolvedSex) mergedFields.sex = resolvedSex;

  // 3. Process each biomarker parameter
  const fieldKeys = Object.keys(FIELD_LABELS) as (keyof ReportFields)[];

  for (const key of fieldKeys) {
    if (key === 'patientName' || key === 'patientId' || key === 'age' || key === 'sex') continue;

    const isConflicting = conflictKeySet.has(key);

    if (isConflicting) {
      const conflict = conflicts.find(c => c.fieldKey === key);
      if (conflict && conflict.resolvedValue !== undefined) {
        // User has explicitly resolved this conflict
        (mergedFields as any)[key] = conflict.resolvedValue;

        const chosenSource = conflict.sources[conflict.selectedSourceIndex ?? 0];
        allParameterDetails.push({
          parameter: conflict.parameter,
          fieldKey: key,
          value: conflict.resolvedValue,
          unit: chosenSource?.unit || FIELD_LABELS[key]?.defaultUnit,
          sourcePage: chosenSource?.sourcePage,
          sourceFile: chosenSource?.sourceFile,
          sourceDate: chosenSource?.sourceDate,
          sourceFacility: chosenSource?.sourceFacility,
          status: 'accepted',
          rawSnippet: `Resolved from ${chosenSource?.sourceFile} (value: ${conflict.resolvedValue})`,
        });
      } else {
        // Flagged for user review: do NOT guess, average, or arbitrarily overwrite
        hasUnresolvedConflicts = true;
      }
    } else {
      // Non-conflicting parameter (either present in 1 report, or identical in multiple)
      for (const report of reports) {
        const val = report.result.fields[key];
        if (val !== undefined && (mergedFields as any)[key] === undefined) {
          (mergedFields as any)[key] = val;

          const detail = report.result.parameterDetails?.find(pd => pd.fieldKey === key);
          allParameterDetails.push({
            parameter: detail?.parameter || FIELD_LABELS[key]?.label || String(key),
            fieldKey: key,
            value: val,
            unit: detail?.unit || FIELD_LABELS[key]?.defaultUnit,
            sourcePage: detail?.sourcePage,
            sourceFile: report.fileName,
            sourceDate: report.reportDate || report.result.reportDate,
            sourceFacility: report.facilityName || report.result.facilityName,
            status: detail?.status || 'accepted',
            rawSnippet: detail?.rawSnippet,
          });
        }
      }
    }
  }

  // Count unique clinical parameters successfully populated
  const totalExtractedCount = Object.keys(mergedFields).filter(
    k => k !== 'patientName' && k !== 'patientId'
  ).length;

  return {
    mergedFields,
    parameterDetails: allParameterDetails,
    conflicts,
    unmappedFields: Array.from(unmappedSet),
    totalExtractedCount,
    patientName: resolvedPatientName,
    patientId: resolvedPatientId,
    summaryNotes,
    sourceReportsCount: reports.length,
    hasUnresolvedConflicts,
  };
}

