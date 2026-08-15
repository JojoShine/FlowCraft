import { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { ProjectGrid } from '../components/projects/ProjectGrid';
import { ProjectDrawer } from '../components/ui/ProjectDrawer';
import { formatDate } from '../utils/date';

export function Projects() {
  const [showNewProjectDrawer, setShowNewProjectDrawer] = useState(false);
  const { projects, loading, error } = useProjects();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--red)' }}>加载失败: {error}</div>
      </div>
    );
  }

  // Transform backend data to match component props
  const transformedProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description || '',
    status: (p.status || 'planning') as any,
    progress: p.progress || 0,
    startDate: p.startDate ? formatDate(p.startDate) : '',
    endDate: p.endDate ? formatDate(p.endDate) : '',
    owner: p.ownerId || '',
  }));

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2 }}>项目</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>管理所有项目，跟踪进度与阶段</div>
        </div>
        <button
          onClick={() => setShowNewProjectDrawer(true)}
          style={{
            height: 36,
            padding: '0 16px',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--canvas)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建项目
        </button>
      </div>

      {/* Project grid */}
      <ProjectGrid projects={transformedProjects} />

      {/* Project Drawer */}
      <ProjectDrawer
        isOpen={showNewProjectDrawer}
        onClose={() => setShowNewProjectDrawer(false)}
      />
    </div>
  );
}
