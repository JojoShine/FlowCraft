import { useEffect } from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { ProjectSpace } from './ProjectSpace';
import { EmptyState } from '../components/ui/EmptyState';

export function ProjectPage() {
  const { selectedProjectId, selectProject, projects, projectsLoading: loading } = useProjectContext();

  useEffect(() => {
    if (loading) return;
    if (projects.length === 0) return;
    const exists = projects.some(p => p.id === selectedProjectId);
    if (!exists || !selectedProjectId) {
      selectProject(projects[0].id);
    }
  }, [selectedProjectId, loading, projects, selectProject]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="暂无项目"
        description="在左侧栏创建一个项目开始使用"
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  return <ProjectSpace />;
}
