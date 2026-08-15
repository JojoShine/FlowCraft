import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
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
    if (error.response?.data?.error) {
      const { message, code } = error.response.data.error;
      console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> ${code}: ${message}`);
    }
    return Promise.reject(error);
  }
);

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const tasksApi = {
  list: (params?: { projectId?: string; column?: string }) => api.get('/tasks', { params }),
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
    return `${baseURL}/artifacts/${id}/file`;
  },
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
};

export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
};

export const searchApi = {
  search: (q: string, projectId?: string) => api.get('/search', { params: { q, projectId } }),
};

export default api;
