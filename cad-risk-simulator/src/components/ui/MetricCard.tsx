import React, { ReactNode } from 'react';
import { Card, CardHeader } from './Card';
import { Sparkline } from './Sparkline';
import { InfoTooltip } from './InfoTooltip';
import { cn } from '@/lib/utils';

interface StatusBadge {
  label: string;
  color?: string;
}

interface MetricCardProps {
  label: string;
  icon?: ReactNode;
  tooltip?: string;
  value: ReactNode;
  unit?: string;
  status?: StatusBadge;
  spark?: number[];
  reference?: ReactNode;
  caption?: ReactNode;
  className?: string;
  id?: string;
  right?: ReactNode;
  'aria-label'?: string;
}

/**
 * Standard metric card — Header · Metric · Status · Tiny sparkline · Reference.
 * Every element has a purpose; no descriptive paragraphs.
 */
export function MetricCard({
  label,
  icon,
  tooltip,
  value,
  unit,
  status,
  spark,
  reference,
  caption,
  className,
  id,
  right,
  'aria-label': ariaLabel,
}: MetricCardProps) {
  return (
    <Card id={id} className={cn('flex flex-col justify-between', className)} aria-label={ariaLabel}>
      <div>
        <CardHeader label={label} icon={icon} tooltip={tooltip} right={right} />
        <div className="flex items-baseline gap-2">
          <span className="metric-type tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {unit && (
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
              {unit}
            </span>
          )}
          {spark && spark.length > 1 && (
            <div className="sparkline-wrap ml-auto">
              <Sparkline data={spark} width={72} height={26} stroke={status?.color ?? 'var(--accent)'} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-sm)' }}>
          {status && (
            <span
              className="caption-type font-medium"
              style={{ color: status.color ?? 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {status.label}
            </span>
          )}
          {caption && (
            <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>
              {caption}
            </span>
          )}
        </div>
      </div>
      {reference && <div className="mt-auto" style={{ paddingTop: 'var(--space-sm)' }}>{reference}</div>}
    </Card>
  );
}

/** Header-aligned inline info toggle for cards that need a tooltip without a CardHeader. */
export { InfoTooltip };
