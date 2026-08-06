import React from 'react';
import { PatientProfilePanel } from './PatientProfilePanel';
import { ParameterControls } from './ParameterControls';

/**
 * Sidebar — left column.
 * Collapsible patient sections on top; sticky Current Parameters below.
 */
export function Sidebar() {
  return (
    <aside className="dashboard-sidebar flex flex-col" aria-label="Patient profile and parameters">
      <div className="flex flex-col">
        <PatientProfilePanel />
      </div>
      <div className="flex flex-col" style={{ padding: 'var(--space-sm)' }}>
        <div
          className="card-flat flex flex-col"
          style={{ position: 'sticky', top: 'var(--space-lg)', borderRadius: 'var(--radius-sm)' }}
        >
          <ParameterControls />
        </div>
      </div>
    </aside>
  );
}
