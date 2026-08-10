/**
 * RightPanelHeader — Header for the fixed right panel
 * =====================================================
 * Displays "CAD RISK SCORE" label. Content populated in Chunk 3.
 */

import React from 'react';

export function RightPanelHeader() {
  return (
    <div className="right-panel-header">
      <div className="right-panel-header-label">CAD Risk Score</div>
    </div>
  );
}
