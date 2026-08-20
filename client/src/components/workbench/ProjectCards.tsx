import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  phase: string;
  avatar: string;
  startDate: string;
  endDate: string;
  owner: string;
}

interface ProjectCardsProps {
  projects: Project[];
}

export function ProjectCards({ projects }: ProjectCardsProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 10,
    }}>
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => navigate(`/projects/${project.id}`)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px var(--border-subtle), 0 1px 3px rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: 'var(--surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-2)',
              flexShrink: 0,
            }}>
              {project.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{project.phase}</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--ink-3)',
            fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          }}>
            <span>{project.owner}</span>
            <span>{project.phase}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
