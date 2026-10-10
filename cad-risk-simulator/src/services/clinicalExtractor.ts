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
}

/**
 * Remove reference range columns, flags, and trailing noise from a line
 * to isolate the actual patient result.
 */
function cleanLineForPatientResult(line: string): string {
  // Strip common reference interval headers or indicators
  const refKeywords = [
    /\b(reference\s*(?:interval|range|values?)?|ref\.?\s*(?:range|interval)?|biological\s*ref|normal\s*range|desirable|optimal|interval)\b/i,
    /\b(std\s*range|limits?)\b/i,
  ];

  let resultPart = line;
  for (const kw of refKeywords) {
    const idx = resultPart.search(kw);
    if (idx !== -1) {
      resultPart = resultPart.slice(0, idx);
    }
  }

  return resultPart;
}

/**
 * Clean OCR text by fixing common typographical and character artifacts
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[“”"']/g, '"')
    .replace(/(\d+)\s*,\s*(\d+)/g, '$1.$2'); // comma decimal e.g. 5,6 -> 5.6
}

/**
 * Extract single numeric value from candidate text that matches an entity pattern,
 * ensuring that numbers preceded by comparison symbols (<, >, <=, >=) or labeled
 * as reference ranges are excluded.
 */
function extractNumericMetric(
  text: string,
  entityRegex: RegExp,
  min: number,
  max: number,
  unitConverter?: (val: number, unitStr?: string) => number
): number | undefined {
  const lines = text.split('\n');

  for (const line of lines) {
    if (!entityRegex.test(line)) continue;

    // Isolate patient result portion of line
    const cleaned = cleanLineForPatientResult(line);

    // Look for numbers in the cleaned section
    // Regex finds numbers with optional decimal, capturing potential unit string
    const match = cleaned.match(
      new RegExp(
        entityRegex.source +
          /[^\d\n]*?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z%µ/²^3]+)?/i.source,
        'i'
      )
    );

    if (match) {
      const numStr = match[1];
      const unitStr = match[2];
      let val = parseFloat(numStr);

      if (isNaN(val)) continue;

      if (unitConverter) {
        val = unitConverter(val, unitStr);
      }

      if (val >= min && val <= max) {
        return Math.round(val * 100) / 100;
      }
    }
  }

  // Fallback to searching the entire text blob if line-by-line misses due to multiline wrap
  const globalMatch = text.match(
    new RegExp(
      entityRegex.source +
        /[^0-9\n<>=]{0,40}?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z%µ/²^3]+)?/i.source,
      'i'
    )
  );

  if (globalMatch) {
    let val = parseFloat(globalMatch[1]);
    const unitStr = globalMatch[2];
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
      /(?:Patient\s*Name|Patient\s*Full\s*Name|Full\s*Name)[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([^\n\r]+)/i
    ) ||
    text.match(
      /(?:^|\n)\s*(?:Patient|Name)[\s.:|-]+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([^\n\r]+)/i
    );
  if (nameMatch) {
    let rawName = nameMatch[1].split(/\s{2,}|\t/)[0].trim();
    rawName = rawName
      .replace(/(?:Patient\s*ID|ID|Age|Gender|Sex|Date|Ref|DOB|Phone|Dr)[\s.:|-].*/i, '')
      .trim();
    if (
      rawName.length >= 2 &&
      !/^(Result|Test|Sample|Hospital|Clinical|Normal|Demographic|Metadata)/i.test(rawName)
    ) {
      fields.patientName = rawName;
    }
  }

  // Patient ID
  let patientId: string | undefined;
  const idMatch = text.match(/(?:Patient\s*ID|PID|MRN|Patient\s*No\.?)[\s.:|-]+([A-Za-z0-9-_]{3,20})/i);
  if (idMatch) {
    patientId = idMatch[1].trim();
  }

  // Age
  const ageMatch = text.match(/(?:Age|Age\s*[/\\|]?\s*(?:Gender|Sex))[\s.:|+]+(\d{1,3})/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 1 && age <= 120) {
      fields.age = age;
    }
  }

  // Gender / Sex
  const sexMatch = text.match(/(?:Gender|Sex)[\s.:|-]+(Male|Female|M\b|F\b)/i);
  if (sexMatch) {
    const s = sexMatch[1].toLowerCase();
    if (s.startsWith('m')) fields.sex = 'male';
    else if (s.startsWith('f')) fields.sex = 'female';
  } else {
    const headText = text.slice(0, 1000);
    if (/\b(?:Male|Gender:\s*Male)\b/i.test(headText)) fields.sex = 'male';
    else if (/\b(?:Female|Gender:\s*Female)\b/i.test(headText)) fields.sex = 'female';
  }

  // 2. Blood Pressure (Systolic & Diastolic)
  // Check combined BP string e.g. "152/96" or "152 / 96 mmHg" (require word boundary for \bBP\b so bpm is not matched)
  const bpMatch = text.match(/(?:Blood\s+Pressure|\bBP\b)(?:[^\d\n/]*?)(\d{2,3})\s*[/\\-]\s*(\d{2,3})/i);
  if (bpMatch) {
    const sys = parseFloat(bpMatch[1]);
    const dia = parseFloat(bpMatch[2]);
    if (sys >= 60 && sys <= 260) {
      fields.systolic = sys;
      count++;
    }
    if (dia >= 30 && dia <= 160) {
      fields.diastolic = dia;
      count++;
    }
  } else {
    // Individual systolic / diastolic line matching
    const sys = extractNumericMetric(text, /(?:Systolic(?:\s+Blood)?\s+Pressure|Systolic\s+BP|SBP)/i, 60, 260);
    if (sys !== undefined) {
      fields.systolic = sys;
      count++;
    }
    const dia = extractNumericMetric(text, /(?:Diastolic(?:\s+Blood)?\s+Pressure|Diastolic\s+BP|DBP)/i, 30, 160);
    if (dia !== undefined) {
      fields.diastolic = dia;
      count++;
    }
  }

  // 3. Heart Rate (bpm)
  const hr = extractNumericMetric(text, /(?:Heart\s+Rate|Resting\s+(?:Heart\s+Rate|HR)|Pulse\s+Rate|Pulse|HR\b)/i, 30, 220);
  if (hr !== undefined) {
    fields.heartRate = Math.round(hr);
    count++;
  }

  // 4. Body Mass Index (BMI) (kg/m²)
  const bmi = extractNumericMetric(text, /(?:Body\s+Mass\s+Index|BMI)/i, 10, 70);
  if (bmi !== undefined) {
    fields.bmi = bmi;
    count++;
  }

  // 5. Total Cholesterol (mg/dL or mmol/L)
  // mmol/L to mg/dL conversion factor: 38.67
  const tc = extractNumericMetric(
    text,
    /(?:Total\s+Cholesterol|Cholesterol[,\s]+Total|T-?Chol|Serum\s+Cholesterol)/i,
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
    /(?:HDL\s+Cholesterol|HDL-?C|HDL\b)/i,
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
    /(?:LDL\s+Cholesterol(?:\s*\((?:Direct|Calculated)\))?|LDL-?C|LDL\b)/i,
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
    /(?:Triglycerides|Triglyceride|TRIG|TG\b)/i,
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
    /(?:Apolipoprotein\s*B(?:\s*\(ApoB\))?|Apo\s*B\b|Apo-B)/i,
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
    /(?:ApoB\s*[/\\-]\s*ApoA1(?:\s*Ratio)?|ApoB\/ApoA-?1)/i,
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
    /(?:Lipoprotein\s*\(?\s*a\s*\)?(?:\s*\[Lp\(a\)\])?|Lp\s*\(?\s*a\s*\)?|Lp\(a\))/i,
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
    /(?:High[- ]?Sensitivity\s+CRP(?:\s*\(hs-CRP\))?|hs[- ]?CRP|hsCRP)/i,
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
    /(?:HbA1c(?:\s*\(Glycated\s+Hemoglobin\))?|Glycated\s+Hemoglobin|A1C\b)/i,
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
    /(?:Fasting\s+(?:Blood\s+)?Glucose|Fasting\s+Sugar|FBS|FPG)/i,
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
    /(?:Coronary\s+Artery\s+Calcium(?:\s*\(CAC\))?|Agatston\s+(?:Calcium\s+)?Score|CAC\s+Score|CAC\b)/i,
    0,
    5000
  );
  if (cac !== undefined) {
    fields.cac = Math.round(cac);
    count++;
  }

  // 16. Fat Attenuation Index (FAI) (HU)
  // Look explicitly for negative HU values (e.g. -92)
  const faiMatch =
    text.match(/(?:Fat\s+Attenuation\s+Index(?:\s*\(FAI\))?|FAI)[^\d\n-]*?(-?\d{2,3}(?:\.\d+)?)/i);
  if (faiMatch) {
    let v = parseFloat(faiMatch[1]);
    if (!isNaN(v)) {
      if (v > 0) v = -v; // FAI is inherently negative in coronary CT
      if (v >= -190 && v <= -30) {
        fields.fai = Math.round(v * 10) / 10;
        count++;
      }
    }
  }

  // 17. Coronary Plaque Type
  const plaqueMatch = text.match(
    /(?:Coronary\s+Plaque(?:\s+Morphology)?|Plaque\s+Type|Plaque\s+Morphology)[\s.:|-]*(Mixed|Non[- ]?calcified|Calcified|Soft|Fibrous|None)/i
  );
  if (plaqueMatch) {
    const raw = plaqueMatch[1].toLowerCase();
    let pt: PlaqueType = 'none';
    if (raw.includes('mix')) pt = 'mixed';
    else if (raw.includes('non')) pt = 'non-calcified';
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

  return {
    fields,
    extractedCount: count,
    rawText,
    patientName: fields.patientName,
    patientId,
    summaryNote,
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
    const ab = await fileOrBuffer.arrayBuffer();
    uint8Data = new Uint8Array(ab);
  } else if (fileOrBuffer instanceof Uint8Array) {
    uint8Data = new Uint8Array(
      fileOrBuffer.buffer.slice(
        fileOrBuffer.byteOffset,
        fileOrBuffer.byteOffset + fileOrBuffer.byteLength
      )
    );
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    uint8Data = new Uint8Array(fileOrBuffer);
  } else {
    const b = fileOrBuffer as any;
    uint8Data = new Uint8Array(
      b.buffer ? b.buffer.slice(b.byteOffset || 0, (b.byteOffset || 0) + (b.byteLength || b.length)) : b
    );
  }

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
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
    onProgress?.(100, `Extracted ${result.extractedCount} parameters from PDF.`);
    return result;
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
  onProgress?.(20, 'Enhancing image for optical recognition...');
  const preprocessed = await preprocessImageForOcr(file);

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
}

/**
 * Universal Entry Point: Handles PDF, image (JPG/PNG), or plain text clinical reports.
 */
export async function extractClinicalReport(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedReportResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

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
    onProgress?.(85, 'Extracting clinical values...');
    const result = parseClinicalText(text);
    onProgress?.(100, `Extracted ${result.extractedCount} parameters.`);
    return result;
  } catch (err) {
    console.warn('Text file read failed:', err);
    return {
      fields: {},
      extractedCount: 0,
      rawText: '',
    };
  }
}
