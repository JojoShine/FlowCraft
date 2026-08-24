import { useState, useRef, useEffect } from 'react';
import { ImagePreview } from '../ui/ImagePreview';

interface Artifact {
  id: string;
  name: string;
  type: 'file' | 'folder' | string;
  updatedAt: string;
  owner: string;
  taskName?: string;
  filePath?: string | null;
  size?: string | number | undefined;
}

interface ArtifactGridProps {
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
  onDelete?: (artifact: Artifact) => void;
  onBindTask?: (artifact: Artifact) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  ),
};

const typeLabels: Record<string, string> = {
  file: '文件',
  folder: '文件夹',
};

function CardMenu({ onDelete, onBindTask }: { onDelete: () => void; onBindTask: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          width: 24, height: 24, borderRadius: 5, border: 'none',
          background: open ? 'var(--surface-raised)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-3)', transition: 'all 150ms', padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!open) { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--ink)'; }
        }}
        onMouseLeave={(e) => {
          if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border-default)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          minWidth: 120, overflow: 'hidden',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onBindTask(); setOpen(false); }}
            style={{
              width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'background 100ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--canvas)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            绑定任务
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
            style={{
              width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 12, color: 'var(--red)', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'background 100ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--red) 8%, transparent)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            删除
          </button>
        </div>
      )}
    </div>
  );
}

export function ArtifactGrid({ artifacts, onArtifactClick, onDelete, onBindTask }: ArtifactGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
    }}>
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 200ms',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => onArtifactClick?.(artifact)}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
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
                {typeIcons[artifact.type] || typeIcons.file}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>
                {artifact.name}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-2)',
                }}>
                  {typeLabels[artifact.type] || artifact.type}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
              <span style={{
                fontSize: 10,
                color: 'var(--ink-4)',
                fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
              }}>
                {artifact.updatedAt}
              </span>
              {(onDelete || onBindTask) && (
                <CardMenu
                  onDelete={() => onDelete?.(artifact)}
                  onBindTask={() => onBindTask?.(artifact)}
                />
              )}
            </div>
          </div>

          {/* Image preview */}
          {artifact.filePath && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <ImagePreview
                artifactId={artifact.id}
                alt={artifact.name}
                width="100%"
                height={120}
              />
            </div>
          )}

          {/* Associated task */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: artifact.taskName ? 'var(--ink-3)' : '#C4C4C8',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, flexShrink: 0, opacity: 0.5 }}>
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artifact.taskName || '无关联任务'}
            </span>
          </div>

          {/* Action button */}
          <button
            onClick={(e) => { e.stopPropagation(); onArtifactClick?.(artifact); }}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px 0',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: 'var(--ink)',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ink)';
              e.currentTarget.style.color = 'var(--canvas)';
              e.currentTarget.style.borderColor = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-raised)';
              e.currentTarget.style.color = 'var(--ink)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            查看
          </button>
        </div>
      ))}
    </div>
  );
}
