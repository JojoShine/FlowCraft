import { useState,useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import {DocumentAssistantProvider} from '../../features/documents/DocumentAssistantContext';
import { AIPanel } from './AIPanel';
import { useProjectContext } from '../../contexts/ProjectContext';

const pageNames: Record<string, string> = {
  workbench: '工作台',
  projects: '项目',
  artifacts: '产物',
  kanban: '看板',
  templates: '模板',
  reports: '汇报',
  documents: '文档中心',
  drawings: '绘图中心',
};

export function Layout() {
  const location = useLocation();
  const { selectedProjectId, projects } = useProjectContext();
  const path = location.pathname.slice(1) || 'workbench';

  let title = pageNames[path.split('/')[0]] || 'FlowCraft';
  if (path === 'projects' && selectedProjectId) {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (selectedProject) {
      title = selectedProject.name;
    }
  }

  const [aiOpen, setAiOpen] = useState(true);
  const openDocumentAssistant=useCallback(()=>setAiOpen(true),[]);
  const contentRoute = /^\/(documents|drawings)(\/|$)/.test(location.pathname);

  return (
    <DocumentAssistantProvider onOpen={openDocumentAssistant}><div className={contentRoute ? "content-layout" : undefined} style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      <Sidebar />
      <div className="flowcraft-main" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 240,
        marginRight: aiOpen ? 420 : 0,
        transition: 'margin-right 200ms',
        overflow: 'hidden',
      }}>
        <nav className="content-mobile-nav"><Link to="/documents">文档中心</Link><Link to="/drawings">绘图中心</Link><Link to="/projects">项目</Link></nav>
        <Topbar title={title} aiOpen={aiOpen} onAiToggle={() => setAiOpen(!aiOpen)} />
        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
      <AIPanel isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div></DocumentAssistantProvider>
  );
}
