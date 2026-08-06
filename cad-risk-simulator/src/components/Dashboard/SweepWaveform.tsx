/**
 * SweepWaveform — Canvas-based ECG/PPG monitor sweep effect
 * ============================================================
 * Mimics real bedside monitor behavior: new samples are drawn
 * left-to-right; when the write-head reaches the right edge it
 * wraps to the left. A thin vertical cursor line precedes the
 * write-head, and the region just ahead of it is cleared so
 * old data doesn't interfere with the new trace.
 *
 * No React re-renders on every frame — the canvas is imperative.
 * The store is subscribed to via a Zustand subscription (not a
 * hook) so only the canvas draw callback fires on each tick.
 */

import { useEffect, useRef } from 'react';
import { useSimStore, WaveformPoint } from '../../store/simStore';

interface SweepWaveformProps {
  bufferKey: 'ecgBuffer' | 'ppgBuffer';
  color?: string;
  yMin?: number;
  yMax?: number;
}

const CURSOR_WIDTH = 16;   // px — erasure zone ahead of write head
const DOWNSAMPLE   = 2;    // use every Nth point for performance

function drawCanvas(
  canvas: HTMLCanvasElement,
  buffer: WaveformPoint[],
  color: string,
  yMin: number,
  yMax: number,
  reducedMotion: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  if (buffer.length < 2) return;

  const pts = buffer.filter((_, i) => i % DOWNSAMPLE === 0);
  const n   = pts.length;

  // Map sample index → x pixel (full canvas width)
  const xOf = (i: number) => (i / n) * W;
  // Map y value → y pixel
  const yOf = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v));
    return H - ((clamped - yMin) / (yMax - yMin)) * H;
  };

  if (reducedMotion) {
    // Static full redraw — no sweep effect
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.4;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = xOf(i);
      const y = yOf(p.v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    return;
  }

  // ── Real-monitor sweep effect ─────────────────────────────────
  // The "write head" is at the rightmost current sample.
  // We do a FULL canvas clear then redraw only the trace (no ghost).
  // A thin erasure gap at the write head simulates the phosphor clear.

  ctx.clearRect(0, 0, W, H);

  const headX   = xOf(n - 1);
  const gapX    = Math.min(headX + 2, W);
  const gapW    = CURSOR_WIDTH;

  // Dim sweep cursor line
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(gapX, 0);
  ctx.lineTo(gapX, H);
  ctx.stroke();

  // Draw the trace, skipping the gap region
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.4;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.beginPath();

  let penDown = false;
  pts.forEach((p, i) => {
    const x = xOf(i);
    const y = yOf(p.v);

    // Skip the cursor erasure zone
    if (x >= gapX && x <= gapX + gapW) {
      penDown = false;
      return;
    }

    if (!penDown) { ctx.moveTo(x, y); penDown = true; }
    else          { ctx.lineTo(x, y); }
  });

  ctx.stroke();
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SweepWaveform({ bufferKey, color = 'var(--trace)', yMin = -0.5, yMax = 1.5 }: SweepWaveformProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve CSS variable to actual hex/rgb for canvas use
  const resolvedColor = useRef<string>('#34D399');

  useEffect(() => {
    const el = document.documentElement;
    const style = getComputedStyle(el);
    // Map known CSS vars to their values
    if (color === 'var(--trace)') resolvedColor.current = style.getPropertyValue('--trace').trim() || '#34D399';
    else if (color === 'var(--ppg)') resolvedColor.current = '#34D399';
    else resolvedColor.current = color;
  }, [color]);

  // Resize observer — keep canvas pixel dimensions in sync
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = window.devicePixelRatio || 1;

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width < 1 || height < 1) continue;
        canvas.width  = Math.round(width  * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width  = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Subscribe to store — redraw on every buffer update
  useEffect(() => {
    const unsub = useSimStore.subscribe(state => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const buffer  = state[bufferKey] as WaveformPoint[];
      const W_px    = canvas.width  / window.devicePixelRatio;
      const H_px    = canvas.height / window.devicePixelRatio;
      if (W_px < 1 || H_px < 1) return;

      drawCanvas(
        canvas,
        buffer,
        resolvedColor.current,
        yMin,
        yMax,
        prefersReducedMotion,
      );
    });

    return unsub;
  }, [bufferKey, yMin, yMax]);

  return (
    <div ref={containerRef} className="waveform-canvas-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
}
