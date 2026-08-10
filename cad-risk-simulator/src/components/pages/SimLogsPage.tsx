/**
 * SimLogsPage — Simulation Log Feed
 * ===================================
 * Simple monospace log feed, newest entry at top.
 * Color-coded by type: INFO, ARTIFACT, ALERT, SYSTEM.
 * CLEAR LOGS button top-right.
 *
 * UI PASS ONLY — no logic changes, generates presentational logs from store.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSimStore } from '../../store/simStore';

// ── Log entry types ──────────────────────────────────────────────────────────

type LogType = 'INFO' | 'ARTIFACT' | 'ALERT' | 'SYSTEM';

interface LogEntry {
  id: number;
  time: string;
  type: LogType;
  message: string;
}

function getLogColor(type: LogType): string {
  switch (type) {
    case 'INFO': return 'var(--text-secondary)';
    case 'ARTIFACT': return 'var(--risk-moderate)';
    case 'ALERT': return 'var(--risk-high)';
    case 'SYSTEM': return 'var(--text-tertiary)';
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Log generation from store data ───────────────────────────────────────────

let logIdCounter = 0;

function generateLogsFromState(
  snapshot: any,
  riskResult: any,
  prevScore: number | null,
): LogEntry[] {
  const entries: LogEntry[] = [];
  const now = new Date();
  const time = formatTime(now);

  if (!snapshot || !riskResult) return entries;

  // Always log a pipeline cycle
  entries.push({
    id: ++logIdCounter,
    time,
    type: 'SYSTEM',
    message: `Pipeline cycle complete · score=${riskResult.score} band=${riskResult.band}`,
  });

  // Log sensor fusion confidence
  entries.push({
    id: ++logIdCounter,
    time,
    type: 'INFO',
    message: `Sensor confidence ${(snapshot.confidence * 100).toFixed(0)}% · HR=${snapshot.heartRate}bpm · HRV=${snapshot.hrv}ms`,
  });

  // Motion artifact detection
  if (snapshot.motionArtifactFlag) {
    entries.push({
      id: ++logIdCounter,
      time,
      type: 'ARTIFACT',
      message: `Motion artifact detected — stress=${Math.round(snapshot.stressScore)} HRV=${snapshot.hrv}ms · lipid estimates dampened`,
    });
  }

  // Risk band transitions
  if (prevScore !== null) {
    const scoreDelta = riskResult.score - prevScore;
    if (Math.abs(scoreDelta) >= 5) {
      entries.push({
        id: ++logIdCounter,
        time,
        type: scoreDelta > 0 ? 'ALERT' : 'INFO',
        message: `Risk score ${scoreDelta > 0 ? '▲' : '▼'} ${Math.abs(scoreDelta)} pts → ${riskResult.score} (${riskResult.band})`,
      });
    }
  }

  // High risk alerts
  if (riskResult.score >= 65) {
    entries.push({
      id: ++logIdCounter,
      time,
      type: 'ALERT',
      message: `HIGH RISK threshold exceeded · composite score ${riskResult.score}/100`,
    });
  }

  // ST segment deviation
  if (Math.abs(snapshot.stSegment) > 0.1) {
    entries.push({
      id: ++logIdCounter,
      time,
      type: 'ALERT',
      message: `ST-segment deviation ${snapshot.stSegment.toFixed(2)} mV — ischemia indicator`,
    });
  }

  // QTc prolongation
  if (snapshot.qtcBazett > 450) {
    entries.push({
      id: ++logIdCounter,
      time,
      type: 'ARTIFACT',
      message: `QTc prolonged: ${snapshot.qtcBazett} ms (>450ms threshold)`,
    });
  }

  return entries;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SimLogsPage() {
  const snapshot = useSimStore(s => s.snapshot);
  const riskResult = useSimStore(s => s.riskResult);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevScoreRef = useRef<number | null>(null);

  // Generate logs when store updates
  useEffect(() => {
    if (!snapshot || !riskResult) return;

    const newEntries = generateLogsFromState(
      snapshot,
      riskResult,
      prevScoreRef.current,
    );
    prevScoreRef.current = riskResult.score;

    if (newEntries.length > 0) {
      setLogs(prev => [...newEntries, ...prev].slice(0, 200));
    }
  }, [snapshot, riskResult]);

  const handleClear = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <div className="sl-page">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="sl-page-header">
        <div className="sl-header-left">
          <h1 className="sl-page-title">SIMULATION LOGS</h1>
        </div>
        <button
          type="button"
          className="sl-clear-btn"
          onClick={handleClear}
        >
          CLEAR LOGS
        </button>
      </div>

      {/* ── Log Feed ─────────────────────────────────────────────── */}
      <div className="sl-feed panel-card">
        {logs.length === 0 ? (
          <div className="sl-empty">
            No log entries — waiting for pipeline data…
          </div>
        ) : (
          logs.map((entry, i) => (
            <div
              key={entry.id}
              className={`sl-entry ${i % 2 === 0 ? 'sl-entry-even' : 'sl-entry-odd'}`}
            >
              <span className="sl-entry-time">[{entry.time}]</span>
              <span
                className="sl-entry-type"
                style={{ color: getLogColor(entry.type) }}
              >
                {entry.type}
              </span>
              <span className="sl-entry-sep">·</span>
              <span
                className="sl-entry-msg"
                style={{ color: getLogColor(entry.type) }}
              >
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
