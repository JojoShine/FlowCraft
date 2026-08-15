interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'prototype' | 'diagram' | 'spec';
  status: 'draft' | 'review' | 'approved';
  updatedAt: string;
  owner: string;
  size?: string;
}

interface ArtifactListProps {
  artifacts: Artifact[];
}

const typeIcons: Record<string, React.ReactNode> = {
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  prototype: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8"/>
      <path d="M12 17v4"/>
      <polygon points="10 8 10 12 14 10 10 8" fill="currentColor" stroke="none"/>
    </svg>
  ),
  diagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  spec: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  ),
};

const typeLabels: Record<string, string> = {
  document: '文档',
  prototype: '原型',
  diagram: '流程图',
  spec: '规范',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  review: '审查中',
  approved: '已确认',
};

export function ArtifactList({ artifacts }: ArtifactListProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
      overflow: 'hidden',
    }}>
      {artifacts.map((artifact, index) => (
        <div
          key={artifact.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderBottom: index === artifacts.length - 1 ? 'none' : '1px solid var(--border-subtle)',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--canvas)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Icon */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ width: 16, height: 16, color: 'var(--ink-2)' }}>
              {typeIcons[artifact.type]}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {artifact.name}
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              marginTop: 1,
              display: 'flex',
              gap: 8,
            }}>
              <span>{typeLabels[artifact.type]}</span>
              <span>·</span>
              <span>{artifact.updatedAt}</span>
            </div>
          </div>

          {/* Status */}
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-3)',
            flexShrink: 0,
          }}>
            {statusLabels[artifact.status]}
          </span>
        </div>
      ))}
    </div>
  );
}
