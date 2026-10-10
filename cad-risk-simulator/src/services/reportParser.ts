/**
 * Report Parser Service
 * =====================
 * Bridge module maintaining full backwards-compatibility with existing callers.
 * Delegates all document extraction, OCR, and clinical regex processing to
 * clinicalExtractor.ts.
 */

import {
  extractClinicalReport,
  parseClinicalText as extractText,
  cleanOcrText,
  type ExtractedReportResult,
} from './clinicalExtractor';

export type { ExtractedReportResult };
export { cleanOcrText };

/**
 * Backwards-compatible synchronous parser for extracted raw text
 */
export function parseClinicalText(rawText: string): ExtractedReportResult {
  return extractText(rawText);
}

/**
 * Backwards-compatible async file parser (handles PDF, JPG, PNG, and TXT)
 */
export async function parseReportFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  return extractClinicalReport(file, onProgress);
}
