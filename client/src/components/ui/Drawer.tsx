import { ReactNode } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children, footer }: DrawerProps) {
  if (!isOpen) return null;

  const defaultFooter = (
    <>
      <button
        onClick={onClose}
        style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-raised)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
        取消
      </button>
      <button
        onClick={onClose}
        style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--ink)',
          color: 'var(--canvas)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        保存
      </button>
    </>
  );

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--overlay)',
          zIndex: 998,
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: 'var(--surface)',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          height: 56,
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-raised)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--ink-3)';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
        }}>
          {footer || defaultFooter}
        </div>
      </div>
    </>
  );
}
