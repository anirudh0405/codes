const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTS(relativeFilePath) {
  const fullPath = path.resolve(__dirname, '..', relativeFilePath);
  let resolvedPath = fullPath;
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    resolvedPath = path.join(fullPath, 'index.ts');
  } else if (!fs.existsSync(fullPath) && fs.existsSync(fullPath + '.ts')) {
    resolvedPath = fullPath + '.ts';
  }
  const source = fs.readFileSync(resolvedPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const m = { exports: {} };
  const customRequire = (importPath) => {
    if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/')) {
      let cleaned = importPath.replace(/^@\//, 'src/');
      let targetPath = path.resolve(path.dirname(resolvedPath), cleaned);
      return loadTS(path.relative(path.resolve(__dirname, '..'), targetPath));
    }
    return require(importPath);
  };

  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', compiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(resolvedPath), resolvedPath);
  return m.exports;
}

const { mergeExtractedReports, detectReportConflicts } = loadTS('src/services/multiReportMerger.ts');

console.log('Testing Multi-Report Merger Service...');

// Case 1: Complementary non-overlapping reports
const rep1 = {
  fileName: 'metropolis_lipids.pdf',
  reportDate: '10-May-2024',
  facilityName: 'Metropolis Healthcare',
  result: {
    fields: { totalCholesterol: 220, hdl: 42, triglycerides: 180 },
    extractedCount: 3,
    rawText: '',
    parameterDetails: [
      { parameter: 'Total Cholesterol', fieldKey: 'totalCholesterol', value: 220, unit: 'mg/dL', sourcePage: 1, status: 'accepted' },
      { parameter: 'HDL Cholesterol', fieldKey: 'hdl', value: 42, unit: 'mg/dL', sourcePage: 1, status: 'accepted' },
      { parameter: 'Triglycerides', fieldKey: 'triglycerides', value: 180, unit: 'mg/dL', sourcePage: 1, status: 'accepted' },
    ],
  },
};

const rep2 = {
  fileName: 'apollo_vitals_glycemic.pdf',
  reportDate: '15-May-2024',
  facilityName: 'Apollo Hospitals',
  result: {
    fields: { systolic: 138, diastolic: 88, fastingGlucose: 104, hba1c: 5.9 },
    extractedCount: 4,
    rawText: '',
    parameterDetails: [
      { parameter: 'Systolic Blood Pressure', fieldKey: 'systolic', value: 138, unit: 'mmHg', sourcePage: 1, status: 'accepted' },
      { parameter: 'Diastolic Blood Pressure', fieldKey: 'diastolic', value: 88, unit: 'mmHg', sourcePage: 1, status: 'accepted' },
      { parameter: 'Fasting Blood Glucose', fieldKey: 'fastingGlucose', value: 104, unit: 'mg/dL', sourcePage: 1, status: 'accepted' },
      { parameter: 'HbA1c', fieldKey: 'hba1c', value: 5.9, unit: '%', sourcePage: 1, status: 'accepted' },
    ],
  },
};

const rep3 = {
  fileName: 'max_cardiac_ct.pdf',
  reportDate: '20-May-2024',
  facilityName: 'Max Super Speciality Hospital',
  result: {
    fields: { cac: 145, fai: -68, stenosisSeverity: '50-70%' },
    extractedCount: 3,
    rawText: '',
    parameterDetails: [
      { parameter: 'CAC Score', fieldKey: 'cac', value: 145, unit: 'Agatston', sourcePage: 2, status: 'accepted' },
      { parameter: 'FAI Index', fieldKey: 'fai', value: -68, unit: 'HU', sourcePage: 2, status: 'accepted' },
      { parameter: 'Maximal Stenosis', fieldKey: 'stenosisSeverity', value: '50-70%', unit: '', sourcePage: 2, status: 'accepted' },
    ],
  },
};

// Test merging 3 complementary reports
const mergedComplementary = mergeExtractedReports([rep1, rep2, rep3]);
console.log('Test 1 (Complementary): totalExtractedCount =', mergedComplementary.totalExtractedCount);
console.log('Conflicts:', mergedComplementary.conflicts.length);
if (mergedComplementary.totalExtractedCount !== 10) throw new Error('Expected 10 total extracted fields');
if (mergedComplementary.conflicts.length !== 0) throw new Error('Expected 0 conflicts');
if (mergedComplementary.mergedFields.totalCholesterol !== 220) throw new Error('Lipid failed');
if (mergedComplementary.mergedFields.systolic !== 138) throw new Error('Vitals failed');
if (mergedComplementary.mergedFields.cac !== 145) throw new Error('CAC failed');
console.log('PASS: Complementary merging successful!');

// Case 2: Identical values in 2 reports (no conflict)
const rep1Dupe = {
  fileName: 'lab_repeat.pdf',
  reportDate: '12-May-2024',
  facilityName: 'Metropolis Branch',
  result: {
    fields: { totalCholesterol: 220, hdl: 42 },
    extractedCount: 2,
    rawText: '',
    parameterDetails: [],
  },
};
const mergedIdentical = mergeExtractedReports([rep1, rep1Dupe]);
console.log('Test 2 (Identical values): conflicts =', mergedIdentical.conflicts.length);
if (mergedIdentical.conflicts.length !== 0) throw new Error('Identical values should not create conflict');
if (mergedIdentical.mergedFields.totalCholesterol !== 220) throw new Error('Expected 220');
console.log('PASS: Identical duplicate values merged cleanly without conflict!');

// Case 3: Conflicting values (HDL 42 vs HDL 35)
const repConflicting = {
  fileName: 'quest_differing_lipids.pdf',
  reportDate: '01-Jun-2024',
  facilityName: 'Quest Diagnostics',
  result: {
    fields: { totalCholesterol: 220, hdl: 35 }, // HDL is 35 vs 42
    extractedCount: 2,
    rawText: '',
    parameterDetails: [
      { parameter: 'HDL Cholesterol', fieldKey: 'hdl', value: 35, unit: 'mg/dL', sourcePage: 1, status: 'accepted' },
    ],
  },
};

const conflictsDetected = detectReportConflicts([rep1, repConflicting]);
console.log('Test 3 (Conflict detection): conflicts count =', conflictsDetected.length);
if (conflictsDetected.length !== 1) throw new Error('Expected 1 conflict');
if (conflictsDetected[0].fieldKey !== 'hdl') throw new Error('Expected conflict on hdl');
console.log('Conflict parameter:', conflictsDetected[0].parameter);
console.log('Conflict sources:', conflictsDetected[0].sources);

// Unresolved merge should NOT guess or average
const mergedUnresolved = mergeExtractedReports([rep1, repConflicting]);
if (mergedUnresolved.mergedFields.hdl !== undefined) throw new Error('Unresolved conflict should NOT be arbitrarily assigned');
if (!mergedUnresolved.hasUnresolvedConflicts) throw new Error('Should flag hasUnresolvedConflicts');
console.log('PASS: Conflicting values flagged without silent overwrite or arbitrary guessing!');

// Resolved merge (user chooses Quest Diagnostics at index 1: HDL 35)
const mergedResolved = mergeExtractedReports([rep1, repConflicting], { hdl: 1 });
if (mergedResolved.mergedFields.hdl !== 35) throw new Error('Resolved HDL should be 35');
console.log('PASS: User resolution applied accurately!');

console.log('\nALL MERGER TESTS PASSED SUCCESSFULLY!');

