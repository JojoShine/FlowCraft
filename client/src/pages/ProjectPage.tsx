import { useEffect } from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { ProjectSpace } from './ProjectSpace';

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

  if (!selectedProjectId || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>加载中...</div>
      </div>
    );
  }

  return <ProjectSpace />;
}
