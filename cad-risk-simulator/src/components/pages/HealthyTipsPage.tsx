/**
 * HealthyTipsPage — Heart-healthy nutrition and movement guidance
 * =================================================================
 * Compact educational page for dietary habits and physical activity.
 */

import React from 'react';

const foodTips = [
  'Eat more leafy greens, beans, lentils, berries, oats, and whole grains to support vascular health.',
  'Choose oily fish such as salmon, mackerel, sardines, or trout for omega-3 fatty acids that support heart rhythm and circulation.',
  'Use unsaturated fats like olive oil, nuts, seeds, and avocado instead of fried or trans-fat-heavy foods.',
  'Limit excess salt, refined sugar, processed meat, sugary drinks, and packaged snacks that worsen blood pressure and inflammation.',
  'Prefer home-cooked meals with colorful vegetables, legumes, and lean proteins such as tofu, chicken, or cottage cheese.',
  'Maintain hydration and keep portions balanced to support healthy weight and metabolic markers.',
];

const exerciseTips = [
  'Brisk walking for 30 minutes most days of the week to improve endurance and lower blood pressure.',
  'Cycling or light jogging to build aerobic capacity without excessive strain on the joints.',
  'Strength training 2–3 times weekly using bodyweight exercises or resistance bands to improve insulin sensitivity and muscle health.',
  'Yoga flow sequences such as Surya Namaskar, Cat-Cow, and standing poses to improve circulation and reduce stress.',
  'Mobility work and stretching after exercise to support relaxed arteries, posture, and recovery.',
];

const pranayamaList = [
  'Anulom Vilom (Alternate Nostril Breathing)',
  'Bhramari (Bee Breath)',
  'Kapalabhati (Skull-Shining Breath)',
  'Nadi Shodhana (Channel Cleansing Breath)',
  'Dirga Pranayama (Three-Part Breath)',
];

const yogaAsanas = [
  'Mountain Pose (Tadasana)',
  'Chair Pose (Utkatasana)',
  'Cobra Pose (Bhujangasana)',
  'Bridge Pose (Setu Bandhasana)',
  'Tree Pose (Vrksasana)',
  'Seated Forward Fold (Paschimottanasana)',
  'Warrior I and II (Virabhadrasana I/II)',
  'Child’s Pose (Balasana)',
];

export function HealthyTipsPage() {
  return (
    <div className="ht-page">
      <div className="ht-header">
        <h1 className="ht-title">HEALTHY TIPS</h1>
        <p className="ht-subtitle">Daily habits that support a stronger heart and calmer vascular system.</p>
      </div>

      <div className="ht-grid">
        <section className="ht-card">
          <div className="ht-card-header">
            <span className="ht-card-title">FOOD</span>
            <span className="ht-card-badge">Heart-friendly</span>
          </div>
          <ul className="ht-list">
            {foodTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="ht-card">
          <div className="ht-card-header">
            <span className="ht-card-title">PHYSICAL ACTIVITY</span>
            <span className="ht-card-badge">Regular rhythm</span>
          </div>
          <ul className="ht-list">
            {exerciseTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="ht-card ht-card-wide">
          <div className="ht-card-header">
            <span className="ht-card-title">YOGA & PRANAYAMA</span>
            <span className="ht-card-badge">Calm & steady</span>
          </div>

          <div className="ht-columns">
            <div>
              <h3 className="ht-subsection-title">Recommended yoga asanas</h3>
              <ul className="ht-list compact">
                {yogaAsanas.map((asana) => (
                  <li key={asana}>{asana}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="ht-subsection-title">Pranayama</h3>
              <ul className="ht-list compact">
                {pranayamaList.map((breath) => (
                  <li key={breath}>{breath}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
