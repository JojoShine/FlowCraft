import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const defaultIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      border: '1px dashed var(--border-default)',
      borderRadius: 12,
      padding: '32px 20px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <div style={{ color: 'var(--ink-4)', marginBottom: 4 }}>
          {icon || defaultIcon}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ink-3)',
          letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        {description && (
          <div style={{
            fontSize: 12,
            color: 'var(--ink-4)',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 240,
          }}>
            {description}
          </div>
        )}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    </div>
  );
}
