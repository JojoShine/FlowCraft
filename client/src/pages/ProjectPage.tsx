import { useProjectContext } from '../contexts/ProjectContext';
import { ProjectSpace } from './ProjectSpace';
import { EmptyState } from '../components/ui/EmptyState';

export function ProjectPage() {
  const { selectedProjectId, projects, projectsLoading: loading } = useProjectContext();

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
