import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true) {
      const { data, meta } = response.data;
      response.data = data;
      if (meta) {
        (response as any).meta = meta;
      }
    }
    return response;
  },
  (error) => {
    const serverError = error.response?.data?.error;
    const serverMessage = typeof serverError === 'string'
      ? serverError
      : serverError?.message;

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    if (serverMessage) {
      error.message = serverMessage;
    }
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> ${error.response?.status}: ${serverMessage || error.message}`);
    return Promise.reject(error);
  }
);

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  getSummary: (id: string) => api.get(`/projects/${id}`, { params: { view: 'summary' } }),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const tasksApi = {
  list: (params?: { projectId?: string; column?: string }) => api.get('/tasks', { params }),
  count: (projectId: string) => api.get('/tasks/count', { params: { projectId } }),
  listByPhase: (phaseId: string) => api.get('/tasks', { params: { phaseId } }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const artifactsApi = {
  list: (params?: { projectId?: string; type?: string; page?: number; pageSize?: number }) => api.get('/artifacts', { params }),
  get: (id: string) => api.get(`/artifacts/${id}`),
  create: (data: unknown) => api.post('/artifacts', data),
  update: (id: string, data: unknown) => api.patch(`/artifacts/${id}`, data),
  delete: (id: string) => api.delete(`/artifacts/${id}`),
  upload: (file: File, metadata: { projectId: string; taskId?: string; type?: string; name?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', metadata.projectId);
    if (metadata.taskId) formData.append('taskId', metadata.taskId);
    if (metadata.type) formData.append('type', metadata.type);
    if (metadata.name) formData.append('name', metadata.name);
    
    return api.post('/artifacts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFolder: (files: FileList | File[], metadata: { projectId: string; taskId?: string; name?: string; type?: string }) => {
    const formData = new FormData();
    Array.from(files).forEach((file, i) => {
      formData.append('files', file);
      const relativePath = (file as any).webkitRelativePath || file.name;
      formData.append(`relativePath_${i}`, relativePath);
    });
    formData.append('projectId', metadata.projectId);
    if (metadata.taskId) formData.append('taskId', metadata.taskId);
    if (metadata.name) formData.append('name', metadata.name);
    if (metadata.type) formData.append('type', metadata.type);

    return api.post('/artifacts/upload-folder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFolderFileUrl: (artifactId: string, filePath: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/artifacts/${artifactId}/files/${filePath}`;
  },
  getFileUrl: (id: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('token') || '';
    return `${baseURL}/artifacts/${id}/file?token=${encodeURIComponent(token)}`;
  },
  getPreviewUrl: (id: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('token') || '';
    return `${baseURL}/artifacts/${id}/preview?token=${encodeURIComponent(token)}`;
  },
  getFolderPreviewUrl: (artifactId: string, filePath: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('token') || '';
    return `${baseURL}/artifacts/${artifactId}/preview/${filePath}?token=${encodeURIComponent(token)}`;
  },
  share: (id: string) => api.post(`/artifacts/${id}/share`),
  unshare: (id: string) => api.delete(`/artifacts/${id}/share`),
  getPublicFileUrl: (token: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/file`;
  },
  getPublicFolderFileUrl: (token: string, filePath: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/files/${filePath}`;
  },
  getPublicPreviewUrl: (token: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/preview`;
  },
  getPublicFolderPreviewUrl: (token: string, filePath: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/preview/${filePath}`;
  },
};

export const publicApi = {
  getArtifact: (token: string) => api.get(`/public/artifacts/${token}`),
};

export const phasesApi = {
  list: (projectId?: string) => api.get('/phases', { params: { projectId } }),
  create: (data: unknown) => api.post('/phases', data),
  update: (id: string, data: unknown) => api.patch(`/phases/${id}`, data),
};

export const templatesApi = {
  list: () => api.get('/templates'),
  get: (id: string) => api.get(`/templates/${id}`),
  create: (data: unknown) => api.post('/templates', data),
  update: (id: string, data: unknown) => api.patch(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

export const reportsApi = {
  list: (params?: { projectId?: string; type?: string; year?: number; month?: number }) =>
    api.get('/reports', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: unknown) => api.post('/reports', data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  generate: (data: { type: string; projectId: string; date?: string; weekStart?: string }) =>
    api.post('/reports/generate', data),
};

export const inviteApi = {
  create: (projectId: string) => api.post(`/projects/${projectId}/invite`),
  list: (projectId: string) => api.get(`/projects/${projectId}/viewers`),
  revoke: (projectId: string, userId: string) => api.delete(`/projects/${projectId}/invite/${userId}`),
};

export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
};

export const searchApi = {
  search: (q: string, projectId?: string) => api.get('/search', { params: { q, projectId } }),
};

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  register: (username: string, password: string, name?: string) => api.post('/auth/register', { username, password, name }),
  getMe: () => api.get('/auth/me'),
};

export const aiApi = {
  chat(conversationId: string | null, message: string, projectId?: string) {
    const token = localStorage.getItem('token');
    return fetch(`${baseURL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ conversationId, message, projectId }),
    });
  },
  listConversations: (projectId?: string) =>
    api.get('/ai/conversations', { params: projectId ? { projectId } : {} }),
  getConversation: (id: string) => api.get(`/ai/conversations/${id}`),
  createConversation: (projectId?: string) => api.post('/ai/conversations', { projectId }),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
};

export default api;
