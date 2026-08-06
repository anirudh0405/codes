import React from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'section';
  id?: string;
  'aria-label'?: string;
}

/** Base surface for all dashboard panels — 16px radius, 24px internal padding. */
export function Card({ children, className, style, as = 'section', id, 'aria-label': ariaLabel }: CardProps) {
  const Comp = as;
  return (
    <Comp
      id={id}
      aria-label={ariaLabel}
      className={cn('card', className)}
      style={style}
    >
      {children}
    </Comp>
  );
}

interface CardHeaderProps {
  label: string;
  icon?: React.ReactNode;
  tooltip?: string;
  right?: React.ReactNode;
  as?: 'h2' | 'h3' | 'div';
}

/** Standard card header: eyebrow label + optional icon/tooltip + right slot. */
export function CardHeader({ label, icon, tooltip, right, as = 'h2' }: CardHeaderProps) {
  const Comp = as;
  return (
    <div className="card-header">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <Comp className="eyebrow-label flex items-center gap-1 truncate" style={{ margin: 0 }}>
          {label}
        </Comp>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}
