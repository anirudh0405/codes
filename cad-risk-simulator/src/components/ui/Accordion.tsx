import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

/**
 * Collapsible section for the sidebar. Keyboard accessible with ARIA wiring.
 */
export function Accordion({ title, icon, defaultOpen = false, badge, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = React.useId();

  return (
    <div className="accordion">
      <button
        type="button"
        className="accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
      >
        <span className="accordion__label">
          {icon && <span className="flex items-center shrink-0" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>}
          <span className="truncate">{title}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {badge && <span className="caption-type" style={{ color: 'var(--text-tertiary)' }}>{badge}</span>}
          <ChevronDown size={14} className={`accordion__chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div id={panelId} className="accordion__panel" role="region">
          {children}
        </div>
      )}
    </div>
  );
}
