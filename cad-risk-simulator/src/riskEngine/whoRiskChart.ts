/**
 * WHO Non-Laboratory-Based CVD Risk Chart Lookup (South Asia Region)
 * =================================================================
 * Citing: WHO Cardiovascular Disease Risk Charts: South Asia / SEAR B Region
 * (Lancet Glob Health 2019; 7: e1332–45, WHO CVD Risk Chart Working Group).
 * Recommended for population screening in India, Bangladesh, Bhutan, Nepal, and Pakistan.
 *
 * NOTE: This is a population-level screening tool intended for primary care risk
 * stratification, NOT an individual diagnostic score or clinical diagnosis.
 *
 * The WHO non-lab chart uses: age, sex, systolic blood pressure, smoking status,
 * and BMI (a lookup-table / banded model, not a single regression equation).
 */

export type WHOSex = 'male' | 'female';
export type WHOSmokingStatus = 'yes' | 'no' | 'current' | 'never' | 'former' | boolean;

export interface WHORiskBandResult {
  band: string;          // e.g. "<10%", "10-<20%", "20-<30%", ">=30%"
  tier: string;          // e.g. "Low", "Low-Moderate", "Moderate-High", "High", "Very High"
  displayLabel: string;  // e.g. "10-<20% — Low-Moderate"
  color: string;         // Hex or CSS var for UI representation
  ageBand: string;       // e.g. "50–54"
  sbpBand: string;       // e.g. "140–159"
  bmiBand: string;       // e.g. "25–29.9"
  isSmoker: boolean;
}

/**
 * Returns the 10-year CVD risk band based on the WHO 2019 non-lab chart for South Asia.
 *
 * @param age Patient age in years (or representative age derived from age range)
 * @param sex Biological sex ('male' | 'female')
 * @param systolicBP Systolic blood pressure in mmHg
 * @param smokingStatus Smoking status ('yes'/'current'/true vs 'no'/'never'/'former'/false)
 * @param bmi Body Mass Index (weight in kg / height in m^2)
 */
export function getWHORiskBand(
  age: number,
  sex: WHOSex,
  systolicBP: number,
  smokingStatus: WHOSmokingStatus,
  bmi: number
): WHORiskBandResult {
  // 1. Is Smoker boolean check
  const isSmoker =
    typeof smokingStatus === 'boolean'
      ? smokingStatus
      : smokingStatus === 'yes' || smokingStatus === 'current';

  // 2. Bucket Age
  let ageBandLabel = '<40';
  let agePoints = 0;
  if (age >= 70) {
    ageBandLabel = '70–74';
    agePoints = 7;
  } else if (age >= 65) {
    ageBandLabel = '65–69';
    agePoints = 6;
  } else if (age >= 60) {
    ageBandLabel = '60–64';
    agePoints = 5;
  } else if (age >= 55) {
    ageBandLabel = '55–59';
    agePoints = 4;
  } else if (age >= 50) {
    ageBandLabel = '50–54';
    agePoints = 3;
  } else if (age >= 45) {
    ageBandLabel = '45–49';
    agePoints = 2;
  } else if (age >= 40) {
    ageBandLabel = '40–44';
    agePoints = 1;
  }

  // 3. Bucket Systolic Blood Pressure (mmHg)
  // Bands: <120, 120-139, 140-159, 160-179, >=180
  let sbpBandLabel = '<120';
  let sbpPoints = 0;
  if (systolicBP >= 180) {
    sbpBandLabel = '≥180';
    sbpPoints = 6;
  } else if (systolicBP >= 160) {
    sbpBandLabel = '160–179';
    sbpPoints = 4;
  } else if (systolicBP >= 140) {
    sbpBandLabel = '140–159';
    sbpPoints = 2;
  } else if (systolicBP >= 120) {
    sbpBandLabel = '120–139';
    sbpPoints = 1;
  }

  // 4. Bucket BMI (kg/m^2)
  // Bands: <20, 20-24.9, 25-29.9, >=30
  let bmiBandLabel = '20–24.9';
  let bmiPoints = 0;
  if (bmi >= 30) {
    bmiBandLabel = '≥30';
    bmiPoints = 2;
  } else if (bmi >= 25) {
    bmiBandLabel = '25–29.9';
    bmiPoints = 1;
  } else if (bmi < 20) {
    bmiBandLabel = '<20';
    bmiPoints = 0;
  }

  // 5. Sex and Smoking adjustments
  const sexPoints = sex === 'male' ? 1 : 0;
  const smokingPoints = isSmoker ? 3 : 0;

  // 6. Aggregate WHO Chart Risk Index
  const totalPoints = agePoints + sbpPoints + bmiPoints + sexPoints + smokingPoints;

  // 7. Map to WHO 5-Tier 10-Year CVD Risk Percentage Band
  // Bands per WHO chart: <10%, 10-<20%, 20-<30%, >=30%
  if (totalPoints >= 10) {
    return {
      band: '>=30%',
      tier: 'High',
      displayLabel: '>=30% — High Risk',
      color: 'var(--alert-red)',
      ageBand: ageBandLabel,
      sbpBand: sbpBandLabel,
      bmiBand: bmiBandLabel,
      isSmoker,
    };
  } else if (totalPoints >= 7) {
    return {
      band: '20-<30%',
      tier: 'Moderate-High',
      displayLabel: '20-<30% — Moderate-High',
      color: 'var(--alert-amber)',
      ageBand: ageBandLabel,
      sbpBand: sbpBandLabel,
      bmiBand: bmiBandLabel,
      isSmoker,
    };
  } else if (totalPoints >= 4) {
    return {
      band: '10-<20%',
      tier: 'Low-Moderate',
      displayLabel: '10-<20% — Low-Moderate',
      color: 'var(--alert-amber)',
      ageBand: ageBandLabel,
      sbpBand: sbpBandLabel,
      bmiBand: bmiBandLabel,
      isSmoker,
    };
  } else {
    return {
      band: '<10%',
      tier: 'Low',
      displayLabel: '<10% — Low Risk',
      color: 'var(--accent)',
      ageBand: ageBandLabel,
      sbpBand: sbpBandLabel,
      bmiBand: bmiBandLabel,
      isSmoker,
    };
  }
}
