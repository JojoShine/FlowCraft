import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Workbench } from './pages/Workbench';
import { ProjectPage } from './pages/ProjectPage';
import { Artifacts } from './pages/Artifacts';
import { Kanban } from './pages/Kanban';
import { Templates } from './pages/Templates';
import { Reports } from './pages/Reports';

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <ConfirmProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/workbench" replace />} />
                  <Route path="workbench" element={<Workbench />} />
                  <Route path="projects" element={<ProjectPage />} />
                  <Route path="artifacts" element={<Artifacts />} />
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="reports" element={<Reports />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ConfirmProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
