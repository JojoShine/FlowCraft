import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Workbench } from './pages/Workbench';
import { ProjectPage } from './pages/ProjectPage';
import { Artifacts } from './pages/Artifacts';
import { Kanban } from './pages/Kanban';
import { Templates } from './pages/Templates';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { SharedArtifact } from './pages/SharedArtifact';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProjectProvider>
          <ConfirmProvider>
            <ToastProvider>
              <BrowserRouter basename="/flowcraft">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/share/:token" element={<SharedArtifact />} />
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
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
    </AuthProvider>
  );
}

export default App;
