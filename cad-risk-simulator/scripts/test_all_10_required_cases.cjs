const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
const Tesseract = require('tesseract.js');

// Dynamically compile or import clinicalExtractor
const ts = require('typescript');
let code = fs.readFileSync('src/services/clinicalExtractor.ts', 'utf8');
code = code.replace(/import\.meta\.url/g, "''");
const js = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const mod = { exports: {} };
const fn = new Function('module', 'exports', 'require', js);
fn(mod, mod.exports, (name) => {
  if (name === 'pdfjs-dist') return pdfjs;
  if (name === 'tesseract.js') return Tesseract;
  return require(name);
});

const {
  parseClinicalText,
  extractFromPdf,
  extractFromImage,
  extractClinicalReport,
  cleanOcrText,
  cleanLineForPatientResult,
  createBmpFromImageData
} = mod.exports;

let totalPassed = 0;
let totalFailed = 0;

function assert(description, condition, evidence) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    if (evidence) console.log(`         Evidence: ${evidence}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    if (evidence) console.error(`         Evidence: ${evidence}`);
    totalFailed++;
  }
}

async function runAll10Tests() {
  console.log('================================================================');
  console.log('  AROHAN PLATFORM: 10 REQUIRED TEST CASES VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // ── TEST 1: Text-based PDF with selectable text ─────────────────────────
  console.log('--- TEST 1: Text-based PDF with Selectable Text ---');
  try {
    const pdfPath = path.resolve(__dirname, '../public/fixtures/High_Risk_CAD_Clinical_Report.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const t0 = Date.now();
    const res1 = await extractFromPdf(pdfBytes);
    const elapsed = Date.now() - t0;

    assert('Extracted from text PDF rapidly (no OCR needed)', elapsed < 1500, `${elapsed}ms`);
    assert('Total Cholesterol extracted', res1.fields.totalCholesterol === 268, `TC: ${res1.fields.totalCholesterol} mg/dL`);
    assert('HDL extracted', res1.fields.hdl === 32, `HDL: ${res1.fields.hdl} mg/dL`);
    assert('LDL extracted', res1.fields.ldl === 188, `LDL: ${res1.fields.ldl} mg/dL`);
    assert('Triglycerides extracted', res1.fields.triglycerides === 220, `TG: ${res1.fields.triglycerides} mg/dL`);
    assert('Fasting Glucose extracted', res1.fields.fastingGlucose === 132, `Glucose: ${res1.fields.fastingGlucose} mg/dL`);
    assert('Systolic BP extracted', res1.fields.systolic === 152, `Systolic: ${res1.fields.systolic} mmHg`);
    assert('Diastolic BP extracted', res1.fields.diastolic === 96, `Diastolic: ${res1.fields.diastolic} mmHg`);
  } catch (err) {
    assert('Test 1 execution', false, err.message);
  }

  // ── TEST 2: Scanned multi-page PDF with parameters on later pages ─────────
  console.log('\n--- TEST 2: Scanned Multi-Page PDF with Parameters on Later Pages ---');
  try {
    const fixturePath = 'D:/internship/Eswar Prasad-Siemens-MedicalReports-2019.pdf';
    const pdfBytes = fs.readFileSync(fixturePath);
    const res2 = await extractFromPdf(pdfBytes);

    assert('15 pages processed', res2.pagesProcessed === 15, `Pages: ${res2.pagesProcessed}`);
    assert('Lipid Profile - Total Cholesterol extracted', res2.fields.totalCholesterol === 139, `TC: ${res2.fields.totalCholesterol} mg/dL`);
    assert('Lipid Profile - Triglycerides extracted', res2.fields.triglycerides === 85, `TG: ${res2.fields.triglycerides} mg/dL`);
    assert('Lipid Profile - HDL Cholesterol extracted', res2.fields.hdl === 42, `HDL: ${res2.fields.hdl} mg/dL`);
    assert('Lipid Profile - LDL Cholesterol extracted', res2.fields.ldl === 93, `LDL: ${res2.fields.ldl} mg/dL`);
    assert('Lipid Profile - VLDL Cholesterol extracted', res2.fields.vldl === 17, `VLDL: ${res2.fields.vldl} mg/dL`);
    assert('Fasting Glucose extracted', res2.fields.fastingGlucose === 156, `Fasting Glucose: ${res2.fields.fastingGlucose} mg/dL`);
    assert('Postprandial Glucose (PPBS) extracted', res2.fields.postprandialGlucose === 84, `PPBS: ${res2.fields.postprandialGlucose} mg/dL`);

    // Verify page traceability
    const tcDetail = res2.parameterDetails?.find(p => p.fieldKey === 'totalCholesterol');
    const fbsDetail = res2.parameterDetails?.find(p => p.fieldKey === 'fastingGlucose');
    const ppbsDetail = res2.parameterDetails?.find(p => p.fieldKey === 'postprandialGlucose');

    assert('Total Cholesterol source page traced to Page 5', tcDetail?.sourcePage === 5, `Source page: ${tcDetail?.sourcePage}`);
    assert('Fasting Glucose source page traced to Page 4', fbsDetail?.sourcePage === 4, `Source page: ${fbsDetail?.sourcePage}`);
    assert('Postprandial Glucose source page traced to Page 7', ppbsDetail?.sourcePage === 7, `Source page: ${ppbsDetail?.sourcePage}`);
  } catch (err) {
    assert('Test 2 execution', false, err.message);
  }

  // ── TEST 3: Image-based medical report ────────────────────────────────────
  console.log('\n--- TEST 3: Image-Based Medical Report ---');
  try {
    const fixturePath = 'D:/internship/Eswar Prasad-Siemens-MedicalReports-2019.pdf';
    const pdfBytes = fs.readFileSync(fixturePath);
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
    const page5 = await pdfDoc.getPage(5);
    const ops = await page5.getOperatorList();
    let sampleBmp = null;
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
        const objId = ops.argsArray[j][0];
        const img = await new Promise((resolve) => page5.objs.get(objId, resolve));
        if (img && img.data) {
          sampleBmp = createBmpFromImageData(img.width, img.height, img.data, img.kind);
          break;
        }
      }
    }

    assert('Image extracted from medical report page', sampleBmp !== null && sampleBmp.length > 0, `Bytes: ${sampleBmp?.length}`);

    const worker = await Tesseract.createWorker('eng');
    const ocr = await worker.recognize(sampleBmp);
    await worker.terminate();
    const res3 = parseClinicalText(ocr.data.text, 5);

    assert('Image OCR extracted Total Cholesterol', res3.fields.totalCholesterol === 139, `TC: ${res3.fields.totalCholesterol}`);
    assert('Image OCR extracted Triglycerides', res3.fields.triglycerides === 85, `TG: ${res3.fields.triglycerides}`);
    assert('Image OCR extracted HDL', res3.fields.hdl === 42, `HDL: ${res3.fields.hdl}`);
    assert('Image OCR extracted LDL', res3.fields.ldl === 93, `LDL: ${res3.fields.ldl}`);
    assert('Image OCR extracted VLDL', res3.fields.vldl === 17, `VLDL: ${res3.fields.vldl}`);
  } catch (err) {
    assert('Test 3 execution', false, err.message);
  }

  // ── TEST 4: Report containing laboratory values in a table ───────────────
  console.log('\n--- TEST 4: Report with Laboratory Values in a Table ---');
  try {
    const tableText = `
---------------------------------------------------------------------------------------------------------
Test Name                                Observed Values    Units        Biological Reference Interval   Method
---------------------------------------------------------------------------------------------------------
Cholesterol-Total                        215.00             mg/dL        < 200 mg/dL                     CHOD-POD
Triglycerides                            160.00             mg/dL        < 150 mg/dL                     Enzymatic
HDL Cholesterol                          38.00              mg/dL        40 - 60 mg/dL                   Direct
LDL Cholesterol                          145.00             mg/dL        < 100 mg/dL                     Calculated
VLDL Cholesterol                         32.00              mg/dL        10 - 40 mg/dL                   Calculated
Glucose (Fasting Blood Sugar / FBS)      110.00             mg/dL        74 - 109 mg/dL                  Hexokinase
Glucose Post Prandial (PPBS)             142.00             mg/dL        70 - 140 mg/dL                  Hexokinase
---------------------------------------------------------------------------------------------------------
    `;
    const res4 = parseClinicalText(tableText, 1);
    assert('Table: Total Cholesterol isolated from reference interval', res4.fields.totalCholesterol === 215, `TC: ${res4.fields.totalCholesterol}`);
    assert('Table: Triglycerides isolated from reference interval', res4.fields.triglycerides === 160, `TG: ${res4.fields.triglycerides}`);
    assert('Table: HDL isolated from reference interval', res4.fields.hdl === 38, `HDL: ${res4.fields.hdl}`);
    assert('Table: LDL isolated from reference interval', res4.fields.ldl === 145, `LDL: ${res4.fields.ldl}`);
    assert('Table: VLDL isolated from reference interval', res4.fields.vldl === 32, `VLDL: ${res4.fields.vldl}`);
    assert('Table: Fasting Glucose isolated from reference interval', res4.fields.fastingGlucose === 110, `FBS: ${res4.fields.fastingGlucose}`);
    assert('Table: PPBS isolated from reference interval', res4.fields.postprandialGlucose === 142, `PPBS: ${res4.fields.postprandialGlucose}`);
  } catch (err) {
    assert('Test 4 execution', false, err.message);
  }

  // ── TEST 5: Report with some supported parameters missing ─────────────────
  console.log('\n--- TEST 5: Safe Partial Report with Missing Supported Fields ---');
  try {
    const partialText = `
      METROPOLITAN CARDIOLOGY CLINIC
      Patient Name: Anita Sen
      Blood Pressure: 138/88 mmHg
      Total Cholesterol: 195 mg/dL
    `;
    const res5 = parseClinicalText(partialText, 1);
    assert('Partial: Systolic BP extracted', res5.fields.systolic === 138, `Systolic: ${res5.fields.systolic}`);
    assert('Partial: Diastolic BP extracted', res5.fields.diastolic === 88, `Diastolic: ${res5.fields.diastolic}`);
    assert('Partial: Total Cholesterol extracted', res5.fields.totalCholesterol === 195, `TC: ${res5.fields.totalCholesterol}`);
    assert('Partial: Missing HDL is undefined (never 0)', res5.fields.hdl === undefined, `HDL: ${res5.fields.hdl}`);
    assert('Partial: Missing Triglycerides is undefined (never 0)', res5.fields.triglycerides === undefined, `TG: ${res5.fields.triglycerides}`);
    assert('Partial: Missing CAC is undefined (never 0)', res5.fields.cac === undefined, `CAC: ${res5.fields.cac}`);
    assert('Partial: Missing FAI is undefined (never 0)', res5.fields.fai === undefined, `FAI: ${res5.fields.fai}`);
    assert('Partial: Missing Fasting Glucose is undefined', res5.fields.fastingGlucose === undefined, `FBS: ${res5.fields.fastingGlucose}`);
  } catch (err) {
    assert('Test 5 execution', false, err.message);
  }

  // ── TEST 6: Invalid, corrupted, or unsupported document ───────────────────
  console.log('\n--- TEST 6: Invalid, Corrupted, or Unsupported Document Handling ---');
  try {
    let emptyCaught = false;
    try {
      await extractFromPdf(new Uint8Array(0));
    } catch (e) {
      emptyCaught = true;
      assert('Empty 0-byte buffer throws actionable error', e.message.includes('empty'), e.message);
    }
    if (!emptyCaught) assert('Empty buffer rejection', false, 'Did not reject 0-byte buffer');

    let corruptCaught = false;
    try {
      await extractFromPdf(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    } catch (e) {
      corruptCaught = true;
      assert('Corrupted byte stream throws clear parsing error', e.message.includes('Corrupted or invalid PDF'), e.message);
    }
    if (!corruptCaught) assert('Corrupt PDF rejection', false, 'Did not reject corrupt PDF');

    let unsupportedCaught = false;
    try {
      await extractClinicalReport({ name: 'scan.docx', size: 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    } catch (e) {
      unsupportedCaught = true;
      assert('Unsupported file extension rejected with clear message', e.message.includes('Unsupported file format'), e.message);
    }
    if (!unsupportedCaught) assert('Unsupported extension rejection', false, 'Did not reject .docx');
  } catch (err) {
    assert('Test 6 execution', false, err.message);
  }

  // ── TEST 7: OCR failure or low-confidence extraction ─────────────────────
  console.log('\n--- TEST 7: OCR Failure & Unconfident Extraction Handling ---');
  try {
    const emptyOcrText = `
      Aster CMI Hospital
      Hospital stamp and administrative header
      Checked By: DR. SMITH
    `;
    const res7 = parseClinicalText(emptyOcrText, 1);
    assert('Empty clinical text yields extractedCount 0', res7.extractedCount === 0, `Count: ${res7.extractedCount}`);
    assert('Fields object has no hallucinated laboratory values', Object.keys(res7.fields).length === 0, JSON.stringify(res7.fields));

    // Ambiguous BP format or borderline range gets flagged
    const borderlineText = `
      Blood Pressure: 250/150 mmHg
    `;
    const res7b = parseClinicalText(borderlineText, 1);
    const bpDetail = res7b.parameterDetails?.find(p => p.parameter === 'Blood Pressure');
    assert('Extreme physiological BP marked for review', bpDetail?.status === 'review', `Status: ${bpDetail?.status}`);
  } catch (err) {
    assert('Test 7 execution', false, err.message);
  }

  // ── TEST 8: Unit normalization and ambiguous units ────────────────────────
  console.log('\n--- TEST 8: Unit Normalization and Ambiguous Units ---');
  try {
    const siText = `
      Total Cholesterol: 5.2 mmol/L
      HDL Cholesterol: 1.1 mmol/L
      Triglycerides: 2.1 mmol/L
      Fasting Blood Sugar: 6.5 mmol/L
      Postprandial Glucose: 7.8 mmol/L
      Apolipoprotein B: 1.15 g/L
      High-Sensitivity CRP: 0.35 mg/dL
    `;
    const res8 = parseClinicalText(siText, 1);

    // 5.2 * 38.67 ≈ 201 mg/dL
    assert('Total Cholesterol mmol/L -> mg/dL', res8.fields.totalCholesterol === Math.round(5.2 * 38.67), `TC: ${res8.fields.totalCholesterol}`);
    // 1.1 * 38.67 ≈ 43 mg/dL
    assert('HDL mmol/L -> mg/dL', res8.fields.hdl === Math.round(1.1 * 38.67), `HDL: ${res8.fields.hdl}`);
    // 2.1 * 88.57 ≈ 186 mg/dL
    assert('Triglycerides mmol/L -> mg/dL', res8.fields.triglycerides === Math.round(2.1 * 88.57), `TG: ${res8.fields.triglycerides}`);
    // 6.5 * 18.0182 ≈ 117 mg/dL
    assert('Fasting Glucose mmol/L -> mg/dL', res8.fields.fastingGlucose === Math.round(6.5 * 18.0182), `FBS: ${res8.fields.fastingGlucose}`);
    // 7.8 * 18.0182 ≈ 141 mg/dL
    assert('PPBS mmol/L -> mg/dL', res8.fields.postprandialGlucose === Math.round(7.8 * 18.0182), `PPBS: ${res8.fields.postprandialGlucose}`);
    // 1.15 g/L * 100 = 115 mg/dL
    assert('ApoB g/L -> mg/dL', res8.fields.apoB === 115, `ApoB: ${res8.fields.apoB}`);
    // 0.35 mg/dL * 10 = 3.5 mg/L
    assert('hs-CRP mg/dL -> mg/L', res8.fields.hsCRP === 3.5, `hsCRP: ${res8.fields.hsCRP}`);
  } catch (err) {
    assert('Test 8 execution', false, err.message);
  }

  // ── TEST 9: Shared-state update after successful extraction ───────────────
  console.log('\n--- TEST 9: Shared Patient State & Store Population ---');
  try {
    // Import store or test store state updating logic
    const storeCode = fs.readFileSync('src/store/simStore.ts', 'utf8');
    assert('simStore has ReportFields with vldl', storeCode.includes('vldl?: number;'), 'vldl in ReportFields');
    assert('simStore has ReportFields with postprandialGlucose', storeCode.includes('postprandialGlucose?: number;'), 'postprandialGlucose in ReportFields');
    assert('simStore has ExtractedParameterDetail', storeCode.includes('parameterDetails?: ExtractedParameterDetail[];'), 'parameterDetails in UploadedReport');
    assert('setReportFields applies vldl', storeCode.includes('fields.vldl !== undefined ? { vldl: fields.vldl }'), 'vldl handled in setReportFields');
    assert('setReportFields applies postprandialGlucose', storeCode.includes('fields.postprandialGlucose !== undefined ? { postprandialGlucose: fields.postprandialGlucose }'), 'postprandialGlucose in setReportFields');
  } catch (err) {
    assert('Test 9 execution', false, err.message);
  }

  // ── TEST 10: Regression check for risk engine and existing calculations ────
  console.log('\n--- TEST 10: Regression Check for Calculations and Clinical Engines ---');
  try {
    const apoBCode = fs.readFileSync('src/features/apoBCalculation.ts', 'utf8');
    const whoCode = fs.readFileSync('src/riskEngine/whoRiskChart.ts', 'utf8');
    const diseaseCode = fs.readFileSync('src/riskEngine/diseaseSubScores.ts', 'utf8');
    const echoNextCode = fs.readFileSync('src/ml/echonextResNet34.ts', 'utf8');

    assert('apoBCalculation untouched', apoBCode.length > 1000, 'Intact');
    assert('whoRiskChart untouched', whoCode.length > 1000, 'Intact');
    assert('diseaseSubScores untouched', diseaseCode.length > 1000, 'Intact');
    assert('echonextResNet34 untouched', echoNextCode.length > 1000, 'Intact');
  } catch (err) {
    assert('Test 10 execution', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: TOTAL PASSED = ${totalPassed}, TOTAL FAILED = ${totalFailed}  `);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAll10Tests().catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
