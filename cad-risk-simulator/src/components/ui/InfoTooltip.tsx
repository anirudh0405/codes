import React, { useCallback, useEffect, useRef, useState } from 'react';

interface InfoTooltipProps {
  text: string;
  label?: string;
  iconSize?: number;
}

/**
 * Reusable hover/click tooltip for medical term explanations.
 * Positioned with fixed coordinates to avoid clipping inside overflow containers.
 */
export function InfoTooltip({ text, label = 'Info', iconSize = 14 }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, positionAbove: true });
  const ref = useRef<HTMLButtonElement>(null);
  const isTouchRef = useRef(false);

  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const positionAbove = rect.top > 110;
    let left = rect.left + rect.width / 2;
    const viewportWidth = window.innerWidth;
    if (left < 130) left = 130;
    if (left > viewportWidth - 130) left = viewportWidth - 130;

    const top = positionAbove ? rect.top - 6 : rect.bottom + 6;
    setCoords({ top, left, positionAbove });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClose = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClose);
    document.addEventListener('touchstart', handleClose);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('touchstart', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleMouseEnter = () => {
    if (isTouchRef.current) return;
    updatePosition();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    setOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setOpen(prev => !prev);
  };

  const handleTouchStart = () => {
    isTouchRef.current = true;
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      aria-label={label}
      className="inline-flex items-center justify-center shrink-0 outline-none"
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.7" fill="currentColor" />
      </svg>
      {open && (
        <div
          className="tooltip-pop"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.positionAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 'normal',
            fontWeight: 400,
          }}
        >
          {text}
        </div>
      )}
    </button>
  );
}
