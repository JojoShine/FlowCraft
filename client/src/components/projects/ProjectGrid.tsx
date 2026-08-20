import { useProjectContext } from '../../contexts/ProjectContext';

interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'discovery' | 'research' | 'design' | 'prototype' | 'development' | 'testing' | 'completed';
  startDate: string;
  endDate: string;
  owner: string;
}

interface ProjectGridProps {
  projects: Project[];
}

const statusLabels: Record<string, string> = {
  discovery: '项目线索',
  research: '调研梳理',
  design: '方案设计',
  prototype: '原型设计',
  development: '开发实施',
  testing: '测试交付',
  completed: '复盘归档',
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  const { selectProject } = useProjectContext();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
    }}>
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => selectProject(project.id)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Header with avatar and title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: 'var(--surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-2)',
              flexShrink: 0,
            }}>
              {project.name.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {project.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{project.type}</div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p style={{
              fontSize: 12,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              margin: '0 0 10px 0',
            }}>
              {project.description}
            </p>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'var(--ink-3)',
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          }}>
            <span>{statusLabels[project.status]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
