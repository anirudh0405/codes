import React, { ReactNode, CSSProperties, forwardRef } from 'react';

// ==========================================
// COLOR & TOKEN HELPERS
// ==========================================

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--bklit-primary, #1B6FEB)',
  'primary-light': 'var(--bklit-primary-light, #E8F1FD)',
  'primary-dark': 'var(--bklit-primary-dark, #1255C0)',
  success: 'var(--bklit-success, #0EA85C)',
  'success-light': 'var(--bklit-success-light, #E8FAF2)',
  warning: 'var(--bklit-warning, #E8930A)',
  'warning-light': 'var(--bklit-warning-light, #FEF5E7)',
  danger: 'var(--bklit-danger, #E53E3E)',
  'danger-light': 'var(--bklit-danger-light, #FEF0F0)',
  purple: 'var(--bklit-purple, #7C3AED)',
  'purple-light': 'var(--bklit-purple-light, #F3EEFF)',
  cyan: 'var(--bklit-cyan, #0891B2)',
  'cyan-light': 'var(--bklit-cyan-light, #E0F7FA)',
  orange: 'var(--bklit-orange, #EA6C00)',
  'orange-light': 'var(--bklit-orange-light, #FFF0E4)',
  emerald: 'var(--bklit-emerald, #059669)',
  'emerald-light': 'var(--bklit-emerald-light, #E6FAF4)',
  'text-1': 'var(--bklit-text-1, #08111F)',
  'text-2': 'var(--bklit-text-2, #344256)',
  'text-3': 'var(--bklit-text-3, #7A8799)',
  'text-4': 'var(--bklit-text-4, #BBC5D2)',
  surface: 'var(--bklit-surface, #FFFFFF)',
  'surface-2': 'var(--bklit-surface-2, #F0F3F8)',
  'surface-3': 'var(--bklit-surface-3, #E6EAF2)',
  border: 'var(--bklit-border, #DDE3EE)',
  'border-soft': 'var(--bklit-border-soft, #EDF0F7)',
  default: 'var(--bklit-text-2, #344256)',
};

function resolveColor(c?: string): string | undefined {
  if (!c) return undefined;
  if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl') || c.startsWith('var(')) return c;
  return COLOR_MAP[c] || c;
}

const GAP_MAP: Record<string, string> = {
  none: '0px',
  xs: '6px',
  sm: '10px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

function resolveGap(g?: string | number): string | undefined {
  if (g === undefined) return undefined;
  if (typeof g === 'number') return `${g}px`;
  return GAP_MAP[g] || g;
}

const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  xs: 'var(--bklit-radius-xs, 6px)',
  sm: 'var(--bklit-radius-sm, 10px)',
  md: 'var(--bklit-radius, 16px)',
  lg: '18px',
  xl: '20px',
  full: 'var(--bklit-radius-full, 9999px)',
};

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  sm: 'var(--bklit-shadow-sm, 0 1px 4px rgba(8,17,31,0.06))',
  md: 'var(--bklit-shadow-md, 0 3px 14px rgba(8,17,31,0.08), 0 1px 4px rgba(8,17,31,0.04))',
  lg: 'var(--bklit-shadow-lg, 0 10px 32px rgba(8,17,31,0.11), 0 2px 8px rgba(8,17,31,0.06))',
  xl: 'var(--bklit-shadow-xl, 0 20px 48px rgba(8,17,31,0.13), 0 4px 12px rgba(8,17,31,0.07))',
};

// ==========================================
// 1. BklitNavbar
// ==========================================
export interface BklitNavbarProps {
  height?: number | string;
  background?: string;
  border?: 'bottom' | 'none' | string;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  sticky?: boolean;
  zIndex?: number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const BklitNavbar: React.FC<BklitNavbarProps> = ({
  height = 64,
  background = 'surface',
  border = 'bottom',
  shadow = 'none',
  sticky = true,
  zIndex = 100,
  children,
  style,
  className = '',
}) => {
  const bg = resolveColor(background) || 'var(--bklit-surface, #FFFFFF)';
  const borderBottom = border === 'bottom' ? '1px solid var(--bklit-border, #DDE3EE)' : border === 'none' ? 'none' : border;
  const boxShad = SHADOW_MAP[shadow] || 'none';

  return (
    <nav
      className={`bklit-navbar ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: bg,
        borderBottom,
        boxShadow: boxShad,
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 0 : undefined,
        zIndex,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </nav>
  );
};

// ==========================================
// 2. BklitFlex
// ==========================================
export interface BklitFlexProps {
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: string | number;
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  mb?: string | number;
  mt?: string | number;
  ml?: string | number;
  mr?: string | number;
}

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const BklitFlex = forwardRef<HTMLDivElement, BklitFlexProps>(({
  align = 'stretch',
  justify = 'start',
  gap,
  flexWrap = 'nowrap',
  direction = 'row',
  children,
  style,
  className = '',
  onClick,
  mb,
  mt,
  ml,
  mr,
}, ref) => {
  return (
    <div
      ref={ref}
      className={`bklit-flex ${className}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: ALIGN_MAP[align] || align,
        justifyContent: JUSTIFY_MAP[justify] || justify,
        gap: resolveGap(gap),
        flexWrap,
        marginBottom: mb ? resolveGap(mb) : undefined,
        marginTop: mt ? resolveGap(mt) : undefined,
        marginLeft: ml ? resolveGap(ml) : undefined,
        marginRight: mr ? resolveGap(mr) : undefined,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
});
BklitFlex.displayName = 'BklitFlex';

// ==========================================
// 3. BklitStack
// ==========================================
export interface BklitStackProps {
  gap?: string | number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  mt?: string | number;
  mb?: string | number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const BklitStack: React.FC<BklitStackProps> = ({
  gap = 'sm',
  align = 'stretch',
  justify = 'start',
  children,
  style,
  className = '',
  mt,
  mb,
  onClick,
}) => {
  return (
    <div
      className={`bklit-stack ${className}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: ALIGN_MAP[align] || align,
        justifyContent: JUSTIFY_MAP[justify] || justify,
        gap: resolveGap(gap),
        marginTop: mt ? resolveGap(mt) : undefined,
        marginBottom: mb ? resolveGap(mb) : undefined,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ==========================================
// 4. BklitText
// ==========================================
export interface BklitTextProps {
  size?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  color?: string;
  uppercase?: boolean;
  letterSpacing?: string;
  lineHeight?: string | number;
  align?: 'left' | 'center' | 'right';
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'label';
  mb?: string | number;
  mt?: string | number;
  ml?: string | number;
  mr?: string | number;
  // Shorthand props
  xs?: boolean;
  sm?: boolean;
  base?: boolean;
  lg?: boolean;
  xl?: boolean;
  semibold?: boolean;
  bold?: boolean;
}

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '11px',
  sm: '13px',
  base: '14px',
  md: '15px',
  lg: '17px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '38px',
};

const FONT_WEIGHT_MAP: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

export const BklitText: React.FC<BklitTextProps> = ({
  size = 'base',
  weight = 'normal',
  color = 'text-1',
  uppercase = false,
  letterSpacing,
  lineHeight,
  align,
  children,
  style,
  className = '',
  as = 'span',
  mb,
  mt,
  ml,
  mr,
  xs,
  sm,
  base,
  lg,
  xl,
  semibold,
  bold,
}) => {
  const Component = as;

  let computedSize = size;
  if (xs) computedSize = 'xs';
  else if (sm) computedSize = 'sm';
  else if (base) computedSize = 'base';
  else if (lg) computedSize = 'lg';
  else if (xl) computedSize = 'xl';

  let computedWeight = weight;
  if (semibold) computedWeight = 'semibold';
  else if (bold) computedWeight = 'bold';

  const resolvedCol = resolveColor(color);

  return (
    <Component
      className={`bklit-text ${className}`}
      style={{
        fontSize: FONT_SIZE_MAP[computedSize] || computedSize,
        fontWeight: FONT_WEIGHT_MAP[computedWeight] || (typeof computedWeight === 'number' ? computedWeight : 400),
        color: resolvedCol,
        textTransform: uppercase ? 'uppercase' : undefined,
        letterSpacing: letterSpacing === 'wider' ? '0.05em' : letterSpacing,
        lineHeight: lineHeight === 'relaxed' ? 1.6 : lineHeight === 'tight' ? 1.2 : lineHeight,
        textAlign: align,
        marginBottom: mb ? resolveGap(mb) : undefined,
        marginTop: mt ? resolveGap(mt) : undefined,
        marginLeft: ml ? resolveGap(ml) : undefined,
        marginRight: mr ? resolveGap(mr) : undefined,
        ...style,
      }}
    >
      {children}
    </Component>
  );
};

// ==========================================
// 5. BklitButton
// ==========================================
export interface BklitButtonProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost' | 'soft';
  color?: 'primary' | 'default' | 'success' | 'warning' | 'danger';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  shadow?: 'none' | 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
  className?: string;
}

export const BklitButton: React.FC<BklitButtonProps> = ({
  size = 'md',
  variant = 'solid',
  color = 'primary',
  leftIcon,
  rightIcon,
  shadow = 'none',
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  style,
  className = '',
}) => {
  const sizePaddings: Record<string, { padding: string; fontSize: string; height: string }> = {
    xs: { padding: '4px 10px', fontSize: '11px', height: '26px' },
    sm: { padding: '7px 14px', fontSize: '12px', height: '34px' },
    md: { padding: '9px 18px', fontSize: '14px', height: '40px' },
    lg: { padding: '12px 24px', fontSize: '15px', height: '46px' },
  };

  const currentSize = sizePaddings[size] || sizePaddings.md;

  let bg = 'var(--bklit-primary, #1B6FEB)';
  let textColor = '#FFFFFF';
  let border = 'none';

  if (variant === 'solid') {
    bg = resolveColor(color) || 'var(--bklit-primary, #1B6FEB)';
    textColor = '#FFFFFF';
  } else if (variant === 'outline') {
    bg = 'transparent';
    border = `1px solid var(--bklit-border, #DDE3EE)`;
    textColor = 'var(--bklit-text-2, #344256)';
    if (color === 'primary') {
      textColor = 'var(--bklit-primary, #1B6FEB)';
      border = `1px solid var(--bklit-primary, #1B6FEB)`;
    }
  } else if (variant === 'soft') {
    bg = `var(--bklit-${color}-light, #E8F1FD)`;
    textColor = `var(--bklit-${color}, #1B6FEB)`;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    border = 'none';
    textColor = 'var(--bklit-text-2, #344256)';
  }

  return (
    <button
      type="button"
      className={`bklit-button bklit-btn-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: currentSize.padding,
        height: currentSize.height,
        fontSize: currentSize.fontSize,
        fontWeight: 600,
        borderRadius: 'var(--bklit-radius-sm, 10px)',
        backgroundColor: bg,
        color: textColor,
        border,
        boxShadow: SHADOW_MAP[shadow] || 'none',
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 160ms ease',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        outline: 'none',
        ...style,
      }}
    >
      {leftIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>}
      {children}
      {rightIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rightIcon}</span>}
    </button>
  );
};

// ==========================================
// 6. BklitBadge
// ==========================================
export interface BklitBadgeProps {
  color?: string;
  variant?: 'solid' | 'outline' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftDot?: boolean;
  leftIcon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const BklitBadge: React.FC<BklitBadgeProps> = ({
  color = 'default',
  variant = 'soft',
  size = 'sm',
  leftDot = false,
  leftIcon,
  children,
  style,
  className = '',
}) => {
  const sizeMap: Record<string, { padding: string; fontSize: string; dotSize: number }> = {
    xs: { padding: '2px 8px', fontSize: '10px', dotSize: 5 },
    sm: { padding: '4px 10px', fontSize: '11px', dotSize: 6 },
    md: { padding: '6px 14px', fontSize: '12px', dotSize: 7 },
    lg: { padding: '8px 18px', fontSize: '13px', dotSize: 8 },
  };

  const sz = sizeMap[size] || sizeMap.sm;
  const baseColor = resolveColor(color) || 'var(--bklit-primary, #1B6FEB)';

  let bg = '#F0F3F8';
  let textColor = 'var(--bklit-text-2, #344256)';
  let border = 'none';

  if (variant === 'soft') {
    bg = resolveColor(`${color}-light`) || 'var(--bklit-primary-light, #E8F1FD)';
    textColor = baseColor;
    if (color === 'default') {
      bg = 'var(--bklit-surface-2, #F0F3F8)';
      textColor = 'var(--bklit-text-2, #344256)';
    }
  } else if (variant === 'outline') {
    bg = 'transparent';
    border = `1px solid var(--bklit-border, #DDE3EE)`;
    textColor = 'var(--bklit-text-2, #344256)';
    if (color !== 'default') {
      border = `1px solid ${baseColor}`;
      textColor = baseColor;
    }
  } else if (variant === 'solid') {
    bg = baseColor;
    textColor = '#FFFFFF';
  }

  return (
    <span
      className={`bklit-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: sz.padding,
        fontSize: sz.fontSize,
        fontWeight: 600,
        borderRadius: 'var(--bklit-radius-full, 9999px)',
        backgroundColor: bg,
        color: textColor,
        border,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {leftDot && (
        <span
          style={{
            width: sz.dotSize,
            height: sz.dotSize,
            borderRadius: '50%',
            backgroundColor: textColor,
            display: 'inline-block',
          }}
        />
      )}
      {leftIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>}
      {children}
    </span>
  );
};

// ==========================================
// 7. BklitCard
// ==========================================
export interface BklitCardProps {
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  radius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  mb?: string | number;
  mt?: string | number;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const BklitCard: React.FC<BklitCardProps> = ({
  shadow = 'md',
  radius = 'xl',
  padding = 'md',
  hoverable = false,
  children,
  style,
  className = '',
  mb,
  mt,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const padMap: Record<string, string> = {
    none: '0px',
    sm: '16px',
    md: '22px',
    lg: '28px',
  };

  return (
    <div
      className={`bklit-card ${hoverable ? 'bklit-card-hoverable' : ''} ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bklit-surface, #FFFFFF)',
        border: '1px solid var(--bklit-border, #DDE3EE)',
        borderRadius: RADIUS_MAP[radius] || '16px',
        boxShadow: SHADOW_MAP[shadow] || SHADOW_MAP.md,
        padding: padMap[padding] || '20px',
        marginBottom: mb ? resolveGap(mb) : undefined,
        marginTop: mt ? resolveGap(mt) : undefined,
        boxSizing: 'border-box',
        position: 'relative',
        transition: 'all 200ms ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ==========================================
// 8. BklitGrid
// ==========================================
export interface BklitGridProps {
  columns?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  columnSizes?: string;
  gap?: string | number;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  mb?: string | number;
  mt?: string | number;
}

export const BklitGrid: React.FC<BklitGridProps> = ({
  columns = 1,
  columnSizes,
  gap = 'md',
  children,
  style,
  className = '',
  mb,
  mt,
}) => {
  let templateCols = '1fr';

  if (columnSizes) {
    templateCols = columnSizes;
  } else if (typeof columns === 'number') {
    templateCols = `repeat(${columns}, minmax(0, 1fr))`;
  } else if (typeof columns === 'object') {
    // We can use a CSS custom property or media-query friendly class/style
    templateCols = `repeat(${columns.base || 1}, minmax(0, 1fr))`;
  }

  return (
    <div
      className={`bklit-grid ${className}`}
      data-columns={typeof columns === 'object' ? JSON.stringify(columns) : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: templateCols,
        gap: resolveGap(gap),
        marginBottom: mb ? resolveGap(mb) : undefined,
        marginTop: mt ? resolveGap(mt) : undefined,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ==========================================
// 9. BklitDivider
// ==========================================
export interface BklitDividerProps {
  orientation?: 'horizontal' | 'vertical';
  height?: number | string;
  color?: string;
  mt?: string | number;
  mb?: string | number;
  style?: CSSProperties;
  className?: string;
}

export const BklitDivider: React.FC<BklitDividerProps> = ({
  orientation = 'horizontal',
  height,
  color = 'border',
  mt,
  mb,
  style,
  className = '',
}) => {
  const borderColor = resolveColor(color) || 'var(--bklit-border, #DDE3EE)';

  if (orientation === 'vertical') {
    return (
      <div
        className={`bklit-divider-vertical ${className}`}
        style={{
          width: '1px',
          height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : '100%',
          backgroundColor: borderColor,
          flexShrink: 0,
          margin: '0 8px',
          ...style,
        }}
      />
    );
  }

  return (
    <hr
      className={`bklit-divider-horizontal ${className}`}
      style={{
        border: 'none',
        height: '1px',
        backgroundColor: borderColor,
        margin: '0',
        marginTop: mt ? resolveGap(mt) : undefined,
        marginBottom: mb ? resolveGap(mb) : undefined,
        width: '100%',
        ...style,
      }}
    />
  );
};

// ==========================================
// 10. BklitProgress
// ==========================================
export interface BklitProgressProps {
  value?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number | string;
  radius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'full';
  color?: string;
  trackColor?: string;
  animate?: boolean;
  animationDelay?: number | string;
  style?: CSSProperties;
  className?: string;
}

export const BklitProgress: React.FC<BklitProgressProps> = ({
  value = 0,
  max = 100,
  size = 'sm',
  radius = 'full',
  color = 'primary',
  trackColor = 'surface-2',
  animate = true,
  animationDelay = 0,
  style,
  className = '',
}) => {
  const heightMap: Record<string, string> = {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
  };
  const h = typeof size === 'number' ? `${size}px` : heightMap[size] || size;
  const clampedVal = Math.min(Math.max(value, 0), max);
  const percent = (clampedVal / max) * 100;
  const barColor = resolveColor(color) || 'var(--bklit-primary, #1B6FEB)';
  const trackBg = resolveColor(trackColor) || 'var(--bklit-surface-2, #F0F3F8)';
  const rad = RADIUS_MAP[radius] || '9999px';
  const delayMs = typeof animationDelay === 'number' ? `${animationDelay}ms` : animationDelay;

  return (
    <div
      className={`bklit-progress-track ${className}`}
      style={{
        width: '100%',
        height: h,
        backgroundColor: trackBg,
        borderRadius: rad,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        className="bklit-progress-bar"
        style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: barColor,
          borderRadius: rad,
          transition: animate ? `width 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}` : 'none',
        }}
      />
    </div>
  );
};

// ==========================================
// 11. BklitStat
// ==========================================
export interface BklitStatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  subtext?: string;
  color?: string;
  style?: CSSProperties;
}

export const BklitStat: React.FC<BklitStatProps> = ({
  label,
  value,
  unit,
  subtext,
  color = 'text-1',
  style,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...style }}>
      <BklitText size="xs" uppercase weight="semibold" color="text-3">
        {label}
      </BklitText>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <BklitText size="2xl" weight="extrabold" color={color}>
          {value}
        </BklitText>
        {unit && (
          <BklitText size="xs" color="text-3">
            {unit}
          </BklitText>
        )}
      </div>
      {subtext && (
        <BklitText size="xs" color="text-3">
          {subtext}
        </BklitText>
      )}
    </div>
  );
};

// ==========================================
// 12. BklitAvatar
// ==========================================
export interface BklitAvatarProps {
  initials?: string;
  name?: string;
  size?: number;
  background?: string;
  style?: CSSProperties;
}

export const BklitAvatar: React.FC<BklitAvatarProps> = ({
  initials,
  name,
  size = 48,
  background,
  style,
}) => {
  const display = initials || (name ? name.slice(0, 1).toUpperCase() : 'P');
  const bg = background || 'linear-gradient(135deg, #1B6FEB 0%, #7C3AED 100%)';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: size * 0.4,
        flexShrink: 0,
        ...style,
      }}
    >
      {display}
    </div>
  );
};

// ==========================================
// 13. BklitTooltip
// ==========================================
export interface BklitTooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const BklitTooltip: React.FC<BklitTooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            backgroundColor: '#08111F',
            color: '#FFFFFF',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
