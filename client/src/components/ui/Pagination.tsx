interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  totalLabel?: string;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, totalLabel, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    height: 28, minWidth: 28, borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'transparent', fontSize: 12,
    color: 'var(--ink-2)', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 150ms',
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.3, cursor: 'default',
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
      marginTop: 14,
    }}>
      {total != null && (
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          共 {total}{totalLabel ? ` ${totalLabel}` : ' 条'}，第 {page}/{totalPages} 页
        </span>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{ ...btnBase, ...(page <= 1 ? disabledStyle : {}) }}
          onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.background = 'var(--surface-raised)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: 'var(--ink-4)', padding: '0 2px' }}>...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                ...btnBase,
                fontWeight: 500,
                border: p === page ? '1px solid var(--ink)' : '1px solid var(--border-subtle)',
                background: p === page ? 'var(--ink)' : 'transparent',
                color: p === page ? 'var(--canvas)' : 'var(--ink-2)',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{ ...btnBase, ...(page >= totalPages ? disabledStyle : {}) }}
          onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.background = 'var(--surface-raised)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
