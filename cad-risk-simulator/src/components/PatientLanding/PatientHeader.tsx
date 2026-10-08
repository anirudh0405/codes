import React, { useState } from 'react';
import { UploadCloud, ArrowRight } from 'lucide-react';

interface PatientHeaderProps {
  onOpenUpload: () => void;
  onOpenDashboard: () => void;
}

export function PatientHeader({ onOpenUpload, onOpenDashboard }: PatientHeaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="overview-topbar">
      {/* Left section: Logo + divider + Title + Subtitle */}
      <div className="overview-topbar-left">
        {!imgError ? (
          <img
            src="/arohan-logo.png"
            alt="Arohan"
            style={{ height: '28px', width: 'auto' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ height: '28px', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '15px', color: 'var(--brand)' }}>
            Arohan
          </div>
        )}

        <div className="overview-topbar-divider" />

        <div className="overview-topbar-titles">
          <div className="overview-topbar-title">
            Cardiovascular Health Overview
          </div>
          <div className="overview-topbar-subtitle">
            Research / Simulation Prototype
          </div>
        </div>
      </div>

      {/* Center: empty on desktop */}
      <div style={{ flex: 1 }} />

      {/* Right section: Upload Report + Open Dashboard */}
      <div className="overview-topbar-actions">
        <button
          type="button"
          onClick={onOpenUpload}
          className="overview-btn-ghost"
          id="btn-patient-upload-report"
        >
          <UploadCloud style={{ width: 15, height: 15 }} />
          <span>Upload Report</span>
        </button>

        <button
          type="button"
          onClick={onOpenDashboard}
          className="overview-btn-filled"
          id="btn-open-dashboard"
        >
          <span>Open Dashboard</span>
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </header>
  );
}
