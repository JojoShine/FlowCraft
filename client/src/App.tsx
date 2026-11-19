import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';

const Layout = lazy(() => import('./components/layout/Layout').then(module => ({ default: module.Layout })));
const Workbench = lazy(() => import('./pages/Workbench').then(module => ({ default: module.Workbench })));
const ProjectPage = lazy(() => import('./pages/ProjectPage').then(module => ({ default: module.ProjectPage })));
const Artifacts = lazy(() => import('./pages/Artifacts').then(module => ({ default: module.Artifacts })));
const Kanban = lazy(() => import('./pages/Kanban').then(module => ({ default: module.Kanban })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const SharedArtifact = lazy(() => import('./pages/SharedArtifact').then(module => ({ default: module.SharedArtifact })));

const SharedContent = lazy(() => import('./pages/SharedContent').then(m => ({default:m.SharedContent})));
const Documents = lazy(() => import('./pages/Documents').then(m => ({default:m.Documents})));
const DocumentSample = lazy(() => import('./pages/DocumentSample').then(m => ({default:m.DocumentSample})));
const DocumentPage = lazy(() => import('./pages/DocumentPage').then(m => ({default:m.DocumentPage})));
const Drawings = lazy(() => import('./pages/Drawings').then(m => ({default:m.Drawings})));
const DrawingPage = lazy(() => import('./pages/DrawingPage').then(m => ({default:m.DrawingPage})));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--ink-3)', fontSize: 13 }}>
      加载中...
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProjectProvider>
          <ConfirmProvider>
            <ToastProvider>
              <BrowserRouter basename="/flowcraft">
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/share/:token" element={<SharedArtifact />} />
                  <Route path="/share/:kind/:token" element={<SharedContent />} />
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
                    <Route path="templates" element={<Navigate to="/documents?tab=templates" replace />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="documents/sample" element={<DocumentSample />} />
                    <Route path="documents/:id/sample" element={<DocumentSample />} />
                    <Route path="documents/:id" element={<DocumentPage />} />
                    <Route path="drawings" element={<Drawings />} />
                    <Route path="drawings/:id" element={<DrawingPage />} />
                  </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </ConfirmProvider>
        </ProjectProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
