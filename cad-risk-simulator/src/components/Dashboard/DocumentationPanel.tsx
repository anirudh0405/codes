/**
 * Documentation Panel — In-App System Architecture Modal
 * =======================================================
 * Displays the 7-row processing pipeline diagram rendered as styled HTML/CSS
 * and SVG connectors using existing design tokens (--surface, --border, --accent).
 *
 * Details the expanded architecture:
 *   1. Patient Profile input layer (sensor-independent)
 *   2. Two-tier Metabolic-Vascular Fusion vs Cardiac/Motion Fusion
 *   3. WHO 2019 South-Asia CVD Risk Band (parallel reference output)
 *   4. Feature status (explicitly highlighting live vs planned items like ApoA1)
 */

import React from 'react';

interface DocumentationPanelProps {
  onClose: () => void;
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="panel-card flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              System Architecture & Pipeline Documentation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded transition-colors cursor-pointer outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Rendered Architecture Diagram */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Expanded 7-Row Data Processing Architecture
              </h3>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Client-Side Pipeline · Client Rendered
              </span>
            </div>

            {/* Diagram Canvas */}
            <div
              className="p-4 rounded-lg border space-y-3 text-xs"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              {/* Row 1: Patient Profile Input */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 1 — Patient Profile Input Layer (Sensor-Independent)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div
                    className="p-2.5 rounded border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-semibold text-[var(--accent)] text-[11px]">Structured Clinical Profile</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Demographics (Age, Sex, Ethnicity, BMI) · Habits (Smoking, Activity) · History (Diabetes, Family CAD, CVD) · Symptoms
                    </div>
                  </div>
                  <div
                    className="p-2.5 rounded border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-semibold text-[var(--accent)] text-[11px]">Lab Report Input Panel</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Total Cholesterol · HDL · Triglycerides · ApoB · Lp(a) · <span className="text-[var(--alert-amber)] font-medium">ApoA1 (planned)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 2: HAL */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 2 — Hardware Abstraction Layer (HAL)
                </div>
                <div
                  className="p-2.5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-2"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] text-[11px]">ISensorSource Interface</span>
                    <span className="text-[10px] text-[var(--text-secondary)] ml-2">Decoupled Sensor Seam</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    Mock Instances: ECG · PPG · Blood Pressure · Stress/EDA · Accelerometer (Motion)
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 3: Sensor Manager */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 3 — Sensor Manager
                </div>
                <div
                  className="p-2 rounded border text-center text-[11px] font-medium"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Sensor Polling, Frame Buffering, Waveform Windowing & Multi-Channel Synchronization
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 4: Feature Extraction */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 4 — Feature Extraction Engine
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div
                    className="p-2.5 rounded border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-semibold text-[var(--text-primary)] text-[11px]">ECG Branch Analysis</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Heart Rate (BPM) · ST Segment Elevation/Depression (mV) · QTc Bazett Interval (ms)
                    </div>
                  </div>
                  <div
                    className="p-2.5 rounded border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-semibold text-[var(--text-primary)] text-[11px]">PPG & Vascular Branch</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                      HRV RMSSD · PTT Timing · Vascular Indices (RI, SI, AIx) → Est. Total Cholesterol & Triglycerides
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 5: Parallel Dual Fusion Stage */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center justify-between">
                  <span>Row 5 — Multi-Sensor Dual Fusion Engine</span>
                  <span className="text-[var(--accent)] text-[9px] font-normal">Parallel Independent Fusion Paths</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Box A: Cardiac/Motion Fusion */}
                  <div
                    className="p-3 rounded border space-y-2 relative"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--text-tertiary)',
                      borderStyle: 'dashed',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[var(--text-primary)]">Box A: Cardiac / Motion Fusion</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--text-tertiary)] text-[var(--text-tertiary)]">
                        Correlation-Based
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      Cross-correlates ECG/PPG cardiac features with Accelerometer Motion data. Detects motion artifacts, dampens signal confidence during movement, and prevents false arrhythmia flags.
                    </div>
                  </div>

                  {/* Box B: Metabolic-Vascular Fusion */}
                  <div
                    className="p-3 rounded border space-y-2 relative"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--accent)',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[var(--accent)]">Box B: Metabolic-Vascular Fusion</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--accent)] text-[var(--accent)]">
                        Two-Tier Divergence
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="p-1.5 rounded border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
                        <span className="font-medium text-[var(--text-primary)]">Tier 1:</span> BP + TC(PPG) + TG(PPG) → <span className="font-mono text-[var(--accent)]">PPGVascularIndex</span>
                      </div>
                      <div className="p-1.5 rounded border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
                        <span className="font-medium text-[var(--text-primary)]">Tier 2:</span> PPGVascularIndex + ApoB (independent anchor) → divergence check → <span className="font-mono text-[var(--accent)]">compositeMetabolicScore</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 6: CAD Risk Engine & WHO Chart */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 6 — Clinical Risk Engine Layer
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div
                    className="md:col-span-2 p-3 rounded border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-bold text-[var(--accent)] text-[11px]">Internal CAD Risk Score Engine</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Computes 0–100 INTERHEART-weighted composite risk score combining HR, HRV, Stress, QTc, ST-Segment, and the fused <span className="font-mono text-[var(--text-primary)]">compositeMetabolicScore</span>.
                    </div>
                  </div>
                  <div
                    className="p-3 rounded border"
                    style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
                  >
                    <div className="font-bold text-[var(--text-primary)] text-[11px]">WHO 2019 CVD Risk Band</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
                      Parallel external population reference (South Asia non-lab chart based on Age, Sex, SBP, Smoking, BMI).
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center my-1 text-[var(--accent)] text-xs">↓</div>

              {/* Row 7: Dashboard UI */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Row 7 — Live Dashboard & Control UI
                </div>
                <div
                  className="p-3 rounded border text-[10px] text-[var(--text-secondary)] flex flex-wrap justify-between gap-2"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <span>Waveform Sweeps (ECG/PPG)</span>
                  <span>Readout Cards & Reference Ranges</span>
                  <span>Arc Risk Gauge</span>
                  <span>WHO Risk Band Card</span>
                  <span>Contributions Breakdown</span>
                  <span>Risk Trend</span>
                  <span>Documentation Panel</span>
                </div>
              </div>

            </div>
          </section>

          {/* Section 2: Detailed Architectural Explanation */}
          <section className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] border-b pb-1" style={{ borderColor: 'var(--border)' }}>
              Architecture Key Concepts & Design Rationale
            </h3>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                  1. Sensor-Independent Patient Profile Layer
                </h4>
                <p>
                  The Patient Profile input layer captures structured clinical information (demographics, lifestyle factors, medical history, active symptoms) and laboratory report parameters. Unlike continuous sensor streams, these values represent stable baseline parameters that contextualize continuous telemetry and feed directly into non-laboratory screening models.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                  2. Dual Fusion Mechanisms: Correlation vs Divergence
                </h4>
                <p className="mb-2">
                  The processing pipeline explicitly separates sensor fusion into two distinct mathematical strategies based on physical signal independence:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong className="text-[var(--text-primary)]">Cardiac / Motion Fusion (Correlation-Based):</strong> ECG/PPG electrical/optical signals and Accelerometer Motion signals originate from physically separate physical sources. High cross-correlation between movement spikes and optical noise triggers artifact flags and dampens reading confidence.
                  </li>
                  <li>
                    <strong className="text-[var(--text-primary)]">Metabolic-Vascular Fusion (Two-Tier Divergence-Based):</strong> Cuffless BP, PPG Total Cholesterol, and PPG Triglycerides all share a common root PPG optical pulse waveform. Applying correlation between them would risk amplifying systemic optical artifacts. Instead, a two-tier divergence strategy is used: Tier 1 combines optical parameters into a <span className="font-mono text-[var(--accent)]">PPGVascularIndex</span>, while Tier 2 checks divergence against ApoB — a non-sensor, laboratory-measured independent anchor.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                  3. Separate WHO 10-Year CVD Risk Band Output
                </h4>
                <p>
                  The WHO 2019 South-Asia Non-Laboratory Risk Band is derived directly from Patient Profile variables (age, biological sex, systolic BP, smoking status, and BMI). It is presented as a separate, cited population screening reference alongside the internal composite CAD Risk Score, keeping population screening benchmarks strictly unmerged from real-time biometric risk telemetry.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                  4. Implementation Status & Honesty Standards
                </h4>
                <p>
                  In accordance with project documentation standards, all modules in the architecture diagram correspond to live code within <span className="font-mono text-[var(--accent)]">src/</span>, with the exception of the <span className="text-[var(--alert-amber)] font-medium">ApoA1</span> lab report input field, which is explicitly designated as <span className="text-[var(--alert-amber)] font-medium">planned</span> for a future release pass.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
