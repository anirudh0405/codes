import React from 'react';

export function DisclaimerFooter() {
  return (
    <footer className="overview-footer" id="patient-app-footer">
      <div className="overview-footer-inner">
        <p className="overview-footer-notice-text">
          <strong className="overview-footer-strong">Research / Simulation Prototype Notice:</strong>{' '}
          This interface is a research and simulation prototype based on physiological and lipid modeling. It is not intended to provide medical diagnosis, clinical treatment directives, or replace the clinical judgment of a qualified healthcare professional.
        </p>
      </div>
    </footer>
  );
}
