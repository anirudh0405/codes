/**
 * HistoryPage — Last Visited Activity
 * ===================================
 * Displays recent navigation history for the app, including the most recent visits.
 */

import React, { useEffect, useState } from 'react';

interface VisitEntry {
  page: string;
  section: string;
  time: string;
}

const STORAGE_KEY = 'cad-monitor-visit-history';

function formatVisitTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function HistoryPage() {
  const [entries, setEntries] = useState<VisitEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, []);

  const uniqueEntries = entries.filter(
    (entry, index, arr) => arr.findIndex((item) => item.time === entry.time) === index,
  );
  const latest = uniqueEntries[0];

  return (
    <div className="history-page">
      <div className="history-header">
        <h1 className="history-title">HISTORY</h1>
        <p className="history-subtitle">
          The most recent pages visited in this app.
        </p>
      </div>

      <div className="history-card">
        {latest ? (
          <>
            <div className="history-most-recent">
              <span className="history-label">Last visit</span>
              <span className="history-time">{formatVisitTime(latest.time)}</span>
            </div>

            <div className="history-list">
              {uniqueEntries.map((entry, index) => (
                <div key={`${entry.page}-${entry.time}-${index}`} className="history-item">
                  <div className="history-dot" />
                  <span className="history-item-time">{formatVisitTime(entry.time)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="history-empty">
            No visit history yet. Use the app to start recording activity.
          </div>
        )}
      </div>
    </div>
  );
}
