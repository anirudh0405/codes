import { parseClinicalText } from '../src/services/clinicalExtractor.ts';
import { useSimStore } from '../src/store/simStore.ts';
import { scoreFromSnapshot } from '../src/riskEngine/index.ts';

async function testBidirectionalSync() {
  console.log('=== Running Phase 7 Bidirectional Synchronization Tests ===\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name} ${extraInfo}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${extraInfo}`);
      failed++;
    }
  }

  // 1. Initial State Baseline
  const store = useSimStore.getState();
  assert('Initial scenario is Healthy', store.activeProfile?.category === 'healthy');
  assert('Initial baseline HR is 68', store.params.heartRate === 68);
  assert('Initial baseline SBP is 115', store.params.systolic === 115);

  // ── TEST A: Upload report from Landing Page ────────────────────────────────
  console.log('\n--- Test A: Upload from Landing Page & Verify Dashboard Values ---');
  const reportA = `
    METROPOLITAN CARDIOLOGY & LAB SERVICES
    Patient Name: Rajesh K. Sharma    Patient ID: CAD-2026-9482
    Age: 64 Years                     Gender: Male
    Blood Pressure: 152/96 mmHg
    Heart Rate: 82 bpm
    Total Cholesterol: 268 mg/dL
    HDL Cholesterol: 32 mg/dL
    LDL Cholesterol: 188 mg/dL
    Triglycerides: 220 mg/dL
    Apolipoprotein B (ApoB): 156 mg/dL
    Coronary Artery Calcium (CAC): 620 Agatston
    Fat Attenuation Index (FAI): -92 HU
  `;
  const extractedA = parseClinicalText(reportA);
  store.setReportFields(extractedA.fields);
  store.setUploadedReport({
    fileName: 'ReportA.pdf',
    timestamp: '10:00',
    fileUrl: 'blob:test',
    fileType: 'pdf',
    status: 'applied',
    extractedFields: extractedA.fields,
    extractedCount: extractedA.extractedCount,
    patientName: extractedA.patientName,
  });

  const stateAfterA = useSimStore.getState();
  assert('Landing page activeProfile has category cad', stateAfterA.activeProfile?.category === 'cad');
  assert('Landing page / shared HR is 82', stateAfterA.params.heartRate === 82);
  assert('Landing page / shared SBP is 152', stateAfterA.params.systolic === 152);
  assert('Landing page / shared DBP is 96', stateAfterA.params.diastolic === 96);
  assert('Dashboard / shared CAC is 620', stateAfterA.cac === 620);
  assert('Dashboard / shared FAI is -92', stateAfterA.fai === -92);
  assert('Dashboard / shared Total Cholesterol is 268', stateAfterA.labInputs.totalCholesterol === 268);
  assert('Dashboard / shared Triglycerides is 220', stateAfterA.labInputs.triglycerides === 220);
  assert('Dashboard / shared LDL is 188', stateAfterA.apoBPanel.ldl === 188);
  assert('Dashboard / shared ApoB is 156', stateAfterA.apoBPanel.apoB === 156);

  // ── TEST B: Upload different report from Dashboard ─────────────────────────
  console.log('\n--- Test B: Upload Different Report from Dashboard & Verify Landing Page ---');
  const reportB = `
    CITY GENERAL HOSPITAL
    Patient Name: Anita Roy           Patient ID: CAD-2026-1102
    Age: 58 Years                     Gender: Female
    Blood Pressure: 140/88 mmHg
    Heart Rate: 76 bpm
    Total Cholesterol: 240 mg/dL
    HDL Cholesterol: 42 mg/dL
    LDL Cholesterol: 160 mg/dL
    Triglycerides: 190 mg/dL
    Coronary Artery Calcium (CAC): 350 Agatston
    Fat Attenuation Index (FAI): -78 HU
  `;
  const extractedB = parseClinicalText(reportB);
  stateAfterA.setReportFields(extractedB.fields);
  stateAfterA.setUploadedReport({
    fileName: 'ReportB.pdf',
    timestamp: '11:00',
    fileUrl: 'blob:test2',
    fileType: 'pdf',
    status: 'applied',
    extractedFields: extractedB.fields,
    extractedCount: extractedB.extractedCount,
    patientName: extractedB.patientName,
  });

  const stateAfterB = useSimStore.getState();
  assert('Landing page reflects new HR 76', stateAfterB.params.heartRate === 76);
  assert('Landing page reflects new SBP 140', stateAfterB.params.systolic === 140);
  assert('Landing page reflects new DBP 88', stateAfterB.params.diastolic === 88);
  assert('Shared CAC updated to 350', stateAfterB.cac === 350);
  assert('Shared FAI updated to -78', stateAfterB.fai === -78);
  assert('Shared Total Cholesterol updated to 240', stateAfterB.labInputs.totalCholesterol === 240);
  assert('Shared Triglycerides updated to 190', stateAfterB.labInputs.triglycerides === 190);

  // ── TEST C: Dashboard Control Changes Parameter ───────────────────────────
  console.log('\n--- Test C: Dashboard Slider/Control Changes Parameter ---');
  // Simulate user dragging Heart Rate slider on Dashboard to 90 bpm and SBP to 160
  stateAfterB.setParams({ heartRate: 90, systolic: 160 });
  const stateAfterC = useSimStore.getState();
  assert('Updated HR via dashboard control is 90', stateAfterC.params.heartRate === 90);
  assert('Updated SBP via dashboard control is 160', stateAfterC.params.systolic === 160);
  assert('Landing page activeProfile retains non-healthy category (cad)', stateAfterC.activeProfile?.category === 'cad');
  assert('Landing page reads updated 90 bpm and 160 mmHg', stateAfterC.params.heartRate === 90 && stateAfterC.params.systolic === 160);

  // ── TEST D: Partial Report Updates & Missing Fields Retain Prior Values ───
  console.log('\n--- Test D: Partial Report Retains Unmodified Fields ---');
  const partialReport = `
    LAB FAST TEST
    Blood Pressure: 135/85 mmHg
    Total Cholesterol: 215 mg/dL
  `;
  const extractedPartial = parseClinicalText(partialReport);
  stateAfterC.setReportFields(extractedPartial.fields);
  const stateAfterD = useSimStore.getState();

  assert('Partial SBP updated to 135', stateAfterD.params.systolic === 135);
  assert('Partial DBP updated to 85', stateAfterD.params.diastolic === 85);
  assert('Partial Total Cholesterol updated to 215', stateAfterD.labInputs.totalCholesterol === 215);
  assert('Unmodified HR preserved at 90 (not reset or zeroed)', stateAfterD.params.heartRate === 90);
  assert('Unmodified CAC preserved at 350 (not reset or zeroed)', stateAfterD.cac === 350);
  assert('Unmodified FAI preserved at -78 (not reset or zeroed)', stateAfterD.fai === -78);
  assert('Unmodified Triglycerides preserved at 190', stateAfterD.labInputs.triglycerides === 190);

  // ── TEST E: Persistence Across Page Navigation ────────────────────────────
  console.log('\n--- Test E: Persistence Across Page Navigation ---');
  // Zustand store is a persistent singleton in memory; simulate component re-reading state
  const reReadState = useSimStore.getState();
  assert('State re-read maintains SBP 135', reReadState.params.systolic === 135);
  assert('State re-read maintains HR 90', reReadState.params.heartRate === 90);
  assert('State re-read maintains CAC 350', reReadState.cac === 350);
  assert('State re-read maintains FAI -78', reReadState.fai === -78);

  // ── TEST F: Risk Engine Receives Updates Through Original Pathway ──────────
  console.log('\n--- Test F: Risk Engine Pathway Integrity ---');
  const snapshot = {
    heartRateIndex: 50,
    bpIndex: 60,
    stressIndex: 30,
    hrvIndex: 40,
    qtIndex: 20,
    stIndex: 10,
    cholesterolIndex: 65,
    triglycerideIndex: 55,
    heartRate: reReadState.params.heartRate,
    systolic: reReadState.params.systolic,
    diastolic: reReadState.params.diastolic,
    hrv: 45,
    stressScore: 30,
    qtcBazett: 410,
    stSegment: 0,
    pulseTransitTime: 230,
    totalCholesterol: reReadState.labInputs.totalCholesterol,
    triglycerides: reReadState.labInputs.triglycerides,
    lipidConfidence: 1.0,
    motionArtifactFlag: false,
    confidence: 1.0,
    timestamp: Date.now(),
  };

  const riskResult = scoreFromSnapshot(snapshot, reReadState.patientProfile);
  assert('Risk score computed cleanly (>0 and <=100)', riskResult.score > 0 && riskResult.score <= 100, `(Score: ${riskResult.score})`);
  assert('Risk band assigned', ['Low', 'Moderate', 'High'].includes(riskResult.band));

  console.log(`\n===========================================`);
  console.log(`PHASE 7 TOTAL PASSED: ${passed}`);
  console.log(`PHASE 7 TOTAL FAILED: ${failed}`);
  console.log(`===========================================`);

  if (failed > 0) process.exit(1);
}

testBidirectionalSync().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
