import React, { useState } from 'react';
import { usePipeline } from '@/hooks/usePipeline';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { SummaryPanel } from './SummaryPanel';
import { RiskTrendFooter } from './RiskTrendFooter';
import { LabReportSummary } from './LabReportSummary';

/**
 * DashboardLayout — assembles the full clinical dashboard.
 * Reads exclusively from the Zustand store. Owns the Lab Report modal state.
 */
export function DashboardLayout() {
  usePipeline();
  const [labReportOpen, setLabReportOpen] = useState(false);

  return (
    <div className="dashboard-root" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Header onLabReport={() => setLabReportOpen(true)} />
      {labReportOpen && <LabReportSummary onClose={() => setLabReportOpen(false)} />}

      <Sidebar />
      <MainContent />
      <SummaryPanel />

      <RiskTrendFooter />
    </div>
  );
}
