/**
 * WaveformCards — ECG Lead II & PPG optical live traces.
 * Canvas-based scrolling waveform (extracted from App.tsx).
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { useSimStore } from '@/store/simStore';
import { Card } from '@/components/ui/Card';

interface WPt { t: number; v: number; }

function WaveformChart({ bufferKey, color = 'var(--accent)', yMin = -0.5, yMax = 1.5 }: {
  bufferKey: 'ecgBuffer' | 'ppgBuffer'; color?: string; yMin?: number; yMax?: number;
}) {
  const buffer = useSimStore(s => s[bufferKey] as WPt[]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || buffer.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W === 0 || H === 0) return;

    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, W, H);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gy = H / 4; gy < H; gy += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    for (let gx = W / 10; gx < W; gx += W / 10) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }

    const range = yMax - yMin;
    const toY = (v: number) => H - ((v - yMin) / range) * H;
    const minT = buffer[0].t;
    const maxT = buffer[buffer.length - 1].t;
    const span = maxT - minT || 1;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    buffer.forEach((p, i) => {
      const x = ((p.t - minT) / span) * W;
      const y = toY(p.v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [buffer, color, yMin, yMax]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

export function ECGWaveform() {
  return (
    <Card className="flex flex-col" style={{ minHeight: 140 }}>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Activity size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>ECG — Lead II</span>
        </div>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>25 mm/s · 10 mm/mV</span>
      </div>
      <div className="flex-1 relative" style={{ minHeight: 96 }}>
        <WaveformChart bufferKey="ecgBuffer" color="var(--accent)" yMin={-0.5} yMax={1.5} />
      </div>
    </Card>
  );
}

export function PPGWaveform() {
  return (
    <Card className="flex flex-col" style={{ minHeight: 140 }}>
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
          <span className="eyebrow-label" style={{ color: 'var(--text-primary)' }}>PPG — Optical</span>
        </div>
        <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>100 Hz</span>
      </div>
      <div className="flex-1 relative" style={{ minHeight: 96 }}>
        <WaveformChart bufferKey="ppgBuffer" color="var(--accent)" yMin={0} yMax={1.2} />
      </div>
    </Card>
  );
}
