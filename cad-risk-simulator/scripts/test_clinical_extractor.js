import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import clinicalExtractor via tsx or dynamic compile or test directly
async function runTests() {
  console.log('=== Running Clinical Extractor Test Suite ===\n');

  // Let's test parseClinicalText logic directly by importing the transpiled or compiled module
  // Or we can use pdfjs-dist and dynamic import
  const { parseClinicalText } = await import('../src/services/clinicalExtractor.ts');

  let passed = 0;
  let failed = 0;

  function assertEqual(testName, actual, expected) {
    const isDeep = typeof actual === 'object' && actual !== null;
    const match = isDeep
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;

    if (match) {
      console.log(`  ✓ PASS: ${testName} (Got: ${JSON.stringify(actual)})`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
      failed++;
    }
  }

  // ── TEST 1: Full High-Risk CAD Fixture Extraction ─────────────────────────
  console.log('--- Test 1: Full High-Risk CAD Fixture Extraction ---');
  const fixturePath = path.resolve(__dirname, '../public/fixtures/High_Risk_CAD_Clinical_Report.txt');
  const fixtureText = fs.readFileSync(fixturePath, 'utf-8');
  const res = parseClinicalText(fixtureText);

  assertEqual('Patient Name', res.patientName, 'Rajesh K. Sharma');
  assertEqual('Patient ID', res.patientId, 'CAD-2026-9482');
  assertEqual('Age', res.fields.age, 64);
  assertEqual('Sex', res.fields.sex, 'male');
  assertEqual('Systolic BP', res.fields.systolic, 152);
  assertEqual('Diastolic BP', res.fields.diastolic, 96);
  assertEqual('Heart Rate', res.fields.heartRate, 82);
  assertEqual('BMI', res.fields.bmi, 28.6);
  assertEqual('Total Cholesterol', res.fields.totalCholesterol, 268);
  assertEqual('HDL Cholesterol', res.fields.hdl, 32);
  assertEqual('LDL Cholesterol', res.fields.ldl, 188);
  assertEqual('Triglycerides', res.fields.triglycerides, 220);
  assertEqual('ApoB', res.fields.apoB, 156);
  assertEqual('ApoB/ApoA1 Ratio', res.fields.apoBApoa1Ratio, 1.20);
  assertEqual('Lp(a)', res.fields.lpa, 112);
  assertEqual('hs-CRP', res.fields.hsCRP, 5.6);
  assertEqual('HbA1c', res.fields.hba1c, 6.4);
  assertEqual('Fasting Glucose', res.fields.fastingGlucose, 132);
  assertEqual('CAC Score', res.fields.cac, 620);
  assertEqual('FAI', res.fields.fai, -92);
  assertEqual('Plaque Type', res.fields.plaqueType, 'mixed');
  assertEqual('Plaque Location includes LAD', res.fields.plaqueLocation?.includes('LAD'), true);
  assertEqual('Plaque Location includes RCA', res.fields.plaqueLocation?.includes('RCA'), true);
  assertEqual('Plaque Location includes LCX', res.fields.plaqueLocation?.includes('LCX'), true);
  assertEqual('Stenosis Severity', res.fields.stenosisSeverity, '>70%');

  // ── TEST 2: Reference Range Avoidance ─────────────────────────────────────
  console.log('\n--- Test 2: Reference Range Isolation ---');
  const refRangeText = `
    Total Cholesterol: 210 mg/dL (Reference Range: < 200 mg/dL, Desirable < 150)
    Triglycerides: 175 mg/dL [Biological Ref Interval: < 150 mg/dL]
    HbA1c: 5.9 % (Standard: 4.0 - 5.6 %)
  `;
  const refRes = parseClinicalText(refRangeText);
  assertEqual('Total Cholesterol avoids reference < 200', refRes.fields.totalCholesterol, 210);
  assertEqual('Triglycerides avoids reference < 150', refRes.fields.triglycerides, 175);
  assertEqual('HbA1c avoids standard 4.0 - 5.6', refRes.fields.hba1c, 5.9);

  // ── TEST 3: Deterministic Unit Conversion ─────────────────────────────────
  console.log('\n--- Test 3: Deterministic Unit Conversion ---');
  const siUnitsText = `
    Total Cholesterol: 5.2 mmol/L
    HDL Cholesterol: 1.1 mmol/L
    Triglycerides: 2.1 mmol/L
    Fasting Blood Glucose: 6.5 mmol/L
    Apolipoprotein B: 1.15 g/L
    hs-CRP: 0.35 mg/dL
  `;
  const siRes = parseClinicalText(siUnitsText);
  // 5.2 * 38.67 ≈ 201
  assertEqual('Total Cholesterol mmol/L -> mg/dL', siRes.fields.totalCholesterol, Math.round(5.2 * 38.67));
  // 1.1 * 38.67 ≈ 43
  assertEqual('HDL Cholesterol mmol/L -> mg/dL', siRes.fields.hdl, Math.round(1.1 * 38.67));
  // 2.1 * 88.57 ≈ 186
  assertEqual('Triglycerides mmol/L -> mg/dL', siRes.fields.triglycerides, Math.round(2.1 * 88.57));
  // 6.5 * 18.0182 ≈ 117
  assertEqual('Glucose mmol/L -> mg/dL', siRes.fields.fastingGlucose, Math.round(6.5 * 18.0182));
  // 1.15 g/L * 100 = 115 mg/dL
  assertEqual('ApoB g/L -> mg/dL', siRes.fields.apoB, 115);
  // 0.35 mg/dL * 10 = 3.5 mg/L
  assertEqual('hs-CRP mg/dL -> mg/L', siRes.fields.hsCRP, 3.5);

  // ── TEST 4: Safe Partial Updates (Missing Values Never Fabricated) ─────────
  console.log('\n--- Test 4: Safe Partial Updates & Missing Fields ---');
  const partialText = `
    METROPOLITAN LABS
    Patient: John Doe
    Systolic Blood Pressure: 130 mmHg
    Diastolic Blood Pressure: 84 mmHg
    Total Cholesterol: 195 mg/dL
  `;
  const partialRes = parseClinicalText(partialText);
  assertEqual('Partial Systolic', partialRes.fields.systolic, 130);
  assertEqual('Partial Diastolic', partialRes.fields.diastolic, 84);
  assertEqual('Partial Total Cholesterol', partialRes.fields.totalCholesterol, 195);
  assertEqual('Missing HDL is undefined (never 0)', partialRes.fields.hdl, undefined);
  assertEqual('Missing CAC is undefined (never 0)', partialRes.fields.cac, undefined);
  assertEqual('Missing FAI is undefined (never 0)', partialRes.fields.fai, undefined);
  assertEqual('Missing Triglycerides is undefined', partialRes.fields.triglycerides, undefined);
  assertEqual('Missing hs-CRP is undefined', partialRes.fields.hsCRP, undefined);

  // ── TEST 5: PDF File Parsing via pdfjs-dist ───────────────────────────────
  console.log('\n--- Test 5: Binary PDF Extraction via pdfjs-dist ---');
  const pdfPath = path.resolve(__dirname, '../public/fixtures/High_Risk_CAD_Clinical_Report.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const { extractFromPdf } = await import('../src/services/clinicalExtractor.ts');
  const pdfRes = await extractFromPdf(pdfBytes);

  assertEqual('PDF Patient Name', pdfRes.patientName, 'Rajesh K. Sharma');
  assertEqual('PDF Systolic BP', pdfRes.fields.systolic, 152);
  assertEqual('PDF Diastolic BP', pdfRes.fields.diastolic, 96);
  assertEqual('PDF Total Cholesterol', pdfRes.fields.totalCholesterol, 268);
  assertEqual('PDF HDL', pdfRes.fields.hdl, 32);
  assertEqual('PDF LDL', pdfRes.fields.ldl, 188);
  assertEqual('PDF Triglycerides', pdfRes.fields.triglycerides, 220);
  assertEqual('PDF ApoB', pdfRes.fields.apoB, 156);
  assertEqual('PDF CAC', pdfRes.fields.cac, 620);
  assertEqual('PDF FAI', pdfRes.fields.fai, -92);
  assertEqual('PDF Stenosis', pdfRes.fields.stenosisSeverity, '>70%');

  console.log(`\n===========================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`===========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
