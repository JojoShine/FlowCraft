import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputBaseProps {
  label?: string;
  error?: string;
  hint?: string;
}

type InputProps = InputBaseProps & (
  | (InputHTMLAttributes<HTMLInputElement> & { as?: 'input' })
  | (InputBaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' })
);

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ label, error, hint, as: Tag = 'input', style, ...props }, ref) => {
    const isTextarea = Tag === 'textarea';
    const baseStyle: React.CSSProperties = {
      boxSizing: 'border-box',
      width: '100%',
      height: isTextarea ? undefined : 36,
      padding: isTextarea ? '8px 12px' : '0 12px',
      fontSize: 13,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: 'var(--ink)',
      background: 'var(--surface)',
      border: `1px solid ${error ? 'var(--red)' : 'var(--border-default)'}`,
      borderRadius: 8,
      outline: 'none',
      transition: 'all 150ms',
      ...(isTextarea ? { resize: 'vertical', lineHeight: 1.5 } : {}),
      ...style,
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--ink-3)';
      e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'color-mix(in srgb, var(--red) 10%, transparent)' : 'color-mix(in srgb, var(--ink) 8%, transparent)'}`;
      if ('onFocus' in props && typeof props.onFocus === 'function') {
        (props.onFocus as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>)(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border-default)';
      e.currentTarget.style.boxShadow = 'none';
      if ('onBlur' in props && typeof props.onBlur === 'function') {
        (props.onBlur as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>)(e);
      }
    };

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
        {isTextarea ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            style={baseStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            style={baseStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
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
