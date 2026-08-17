import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        {label && (
          <label style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ink-2)',
            letterSpacing: '-0.01em',
          }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            height: 36,
            padding: '0 12px',
            fontSize: 13,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: 'var(--ink)',
            background: 'var(--surface)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--border-default)'}`,
            borderRadius: 8,
            outline: 'none',
            transition: 'all 150ms',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--ink-3)';
            e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'color-mix(in srgb, var(--red) 10%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border-default)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>
        )}
        {hint && !error && (
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{hint}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
