import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: 500,
    borderRadius: 6,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms',
    border: 'none',
    outline: 'none',
    opacity: isDisabled ? 0.5 : 1,
    lineHeight: 1,
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { height: 28, padding: '0 10px', fontSize: 11 },
    md: { height: 36, padding: '0 16px', fontSize: 13 },
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--ink)',
      color: 'var(--canvas)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid var(--border-default)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ink-3)',
    },
    danger: {
      background: 'var(--red)',
      color: 'var(--on-accent)',
    },
  };

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={isDisabled}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        if (variant === 'primary') e.currentTarget.style.opacity = '0.85';
        if (variant === 'secondary') {
          e.currentTarget.style.background = 'var(--surface-raised)';
          e.currentTarget.style.borderColor = 'var(--ink-3)';
        }
        if (variant === 'ghost') {
          e.currentTarget.style.background = 'var(--surface-raised)';
          e.currentTarget.style.color = 'var(--ink)';
        }
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        if (variant === 'primary') e.currentTarget.style.opacity = '1';
        if (variant === 'secondary') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }
        if (variant === 'ghost') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--ink-3)';
        }
      }}
      {...props}
    >
      {loading && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
