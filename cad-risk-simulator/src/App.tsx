/**
 * CAD Risk Simulator — Medical Monitor Dashboard
 * ===============================================
 * Design: calm, premium clinical monitoring UI.
 * Font: Inter only (tabular-nums for all numeric readouts).
 * Composition is delegated to DashboardLayout — this file only mounts it.
 * Preserves all logic, state, Zustand store, pipeline and calculations.
 */

import React from 'react';
import { DashboardLayout } from '@/components/Dashboard/DashboardLayout';

export default function App() {
  return <DashboardLayout />;
}
