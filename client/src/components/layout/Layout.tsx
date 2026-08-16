import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AIPanel } from './AIPanel';
import { useProjectContext } from '../../contexts/ProjectContext';

const pageNames: Record<string, string> = {
  workbench: '工作台',
  projects: '项目',
  artifacts: '产物',
  kanban: '看板',
  templates: '模板',
  reports: '汇报',
};

export function Layout() {
  const location = useLocation();
  const { selectedProjectId, projects } = useProjectContext();
  const path = location.pathname.slice(1) || 'workbench';

  let title = pageNames[path] || 'FlowCraft';
  if (path === 'projects' && selectedProjectId) {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (selectedProject) {
      title = selectedProject.name;
    }
  }

  const [aiOpen, setAiOpen] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 240,
        marginRight: aiOpen ? 420 : 0,
        transition: 'margin-right 200ms',
        overflow: 'hidden',
      }}>
        <Topbar title={title} aiOpen={aiOpen} onAiToggle={() => setAiOpen(!aiOpen)} />
        <main className="hide-scrollbar" style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
      <AIPanel isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
