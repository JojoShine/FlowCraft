import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState({ open: false, options: { title: '' }, resolve: null });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <ConfirmDialog
          options={state.options}
          onConfirm={() => handleClose(true)}
          onCancel={() => handleClose(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const variant = options.variant || 'default';
  const isDanger = variant === 'danger';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--overlay)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          padding: '20px 24px',
          maxWidth: 380,
          width: '90%',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
          animation: 'scaleIn 150ms ease-out',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isDanger ? 'color-mix(in srgb, var(--red) 12%, transparent)' : 'var(--surface-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          {isDanger ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: options.description ? 6 : 0,
          lineHeight: 1.3,
        }}>
          {options.title}
        </div>

        {/* Description */}
        {options.description && (
          <div style={{
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}>
            {options.description}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 20,
        }}>
          <button
            onClick={onCancel}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 150ms',
              fontFamily: "'Geist', sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-raised)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {options.cancelText || '取消'}
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: isDanger ? 'var(--red)' : 'var(--ink)',
              color: isDanger ? 'var(--on-accent)' : 'var(--canvas)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'opacity 150ms',
              fontFamily: "'Geist', sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {options.confirmText || (isDanger ? '确认删除' : '确认')}
          </button>
        </div>
      </div>
    </div>
  );
}
