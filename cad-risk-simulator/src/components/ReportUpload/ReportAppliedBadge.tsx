/**
 * ReportAppliedBadge — Shows active report status + clear link
 * =============================================================
 * Displays "Report applied · [filename]" badge with a "Clear report" link.
 *
 * UI only — reads/writes store state.
 */

import React from 'react';
import { useSimStore } from '../../store/simStore';
import { useShallow } from 'zustand/react/shallow';

export function ReportAppliedBadge() {
  const { uploadedReport, clearReport } = useSimStore(
    useShallow(s => ({
      uploadedReport: s.uploadedReport,
      clearReport: s.clearReport,
    }))
  );

  if (!uploadedReport) return null;

  return (
    <div className="report-applied-badge">
      <span className="report-applied-text">
        ✓ Report applied · {uploadedReport.fileName}
        {uploadedReport.extractedCount ? ` (${uploadedReport.extractedCount} values auto-read)` : ''}
      </span>
      <button
        type="button"
        className="report-clear-link"
        onClick={clearReport}
      >
        Clear report
      </button>
    </div>
  );
}
