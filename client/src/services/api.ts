import axios from 'axios';

export const api = axios.create({
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
      const currentToken = localStorage.getItem('token');
      const requestToken = error.config?.headers?.get?.('Authorization') || error.config?.headers?.Authorization;
      if (!currentToken || requestToken === `Bearer ${currentToken}`) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth:logout'));
      }
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
  list: (params?: { projectId?: string; column?: string }, signal?: AbortSignal) => api.get('/tasks', { params, signal }),
  listOptions: (projectId: string) => api.get('/tasks/options', { params: { projectId } }),
  count: (projectId: string) => api.get('/tasks/count', { params: { projectId } }),
  overdueCount: () => api.get('/tasks/overdue-count'),
  overdue: (projectId: string) => api.get('/tasks/overdue', { params: { projectId } }),
  listByPhase: (phaseId: string) => api.get('/tasks', { params: { phaseId } }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const artifactsApi = {
  list: (params?: { projectId?: string; type?: string; keyword?: string; page?: number; pageSize?: number }, signal?: AbortSignal) => api.get('/artifacts', { params, signal }),
  count: (projectId?: string) => api.get('/artifacts/count', { params: projectId ? { projectId } : {} }),
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
  getHtmlFileUrl: (id: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('token') || '';
    return `${baseURL}/artifacts/${id}/html-file?token=${encodeURIComponent(token)}`;
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
  getFolderDownloadUrl: (artifactId: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/artifacts/${artifactId}/download`;
  },
  share: (id: string) => api.post(`/artifacts/${id}/share`),
  unshare: (id: string) => api.delete(`/artifacts/${id}/share`),
  getPublicFileUrl: (token: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/file`;
  },
  getPublicHtmlFileUrl: (token: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/html-file`;
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
  getPublicFolderDownloadUrl: (token: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseURL}/public/artifacts/${token}/download`;
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

export interface TaskProposal {title:string;description:string;type:string;priority:'high'|'med'|'low';dueDate:string|null}
export interface DocumentExpansionValidation {count:number;max:number|null;unit:'han'|'characters';unsupportedLines:number}
export interface TaskPreview {summary:string;tasks:TaskProposal[];sourceTitle:string}
export const aiApi = {
  expandDocument:(input:{documentId:string;baseVersion:number;text:string;instructions:string},signal?:AbortSignal,files:File[]=[])=>{
    const form=new FormData();Object.entries(input).forEach(([key,value])=>form.append(key,String(value)));files.forEach(file=>form.append('files',file));
    return api.post<{documentId:string;baseVersion:number;title:string;markdown:string;validation?:DocumentExpansionValidation}>('/ai/document-expansion',form,{signal,timeout:70000});
  },
  previewTasks:(input:{projectId:string;text?:string;documentId?:string;instructions?:string},signal?:AbortSignal,files:File[]=[])=>{
    if(!files.length) return api.post<TaskPreview>('/ai/task-breakdown',input,{signal,timeout:70000});
    const form=new FormData();Object.entries(input).forEach(([key,value])=>{if(value) form.append(key,value);});files.forEach(file=>form.append('files',file));
    return api.post<TaskPreview>('/ai/task-breakdown',form,{signal,timeout:70000});
  },
  importTasks:(input:{projectId:string;requestId:string;tasks:TaskProposal[]})=>api.post<{count:number;taskIds:string[]}>('/ai/task-breakdown/import',input),

  chat(conversationId: string | null, message: string, projectId?: string, templateIds?: string[], signal?: AbortSignal) {
    const token = localStorage.getItem('token');
    return fetch(`${baseURL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ conversationId, message, projectId, templateIds }),
      signal,
    });
  },
  listConversations: (projectId?: string) =>
    api.get('/ai/conversations', { params: projectId ? { projectId } : {} }),
  getConversation: (id: string) => api.get(`/ai/conversations/${id}`),
  createConversation: (projectId?: string) => api.post('/ai/conversations', { projectId }),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
  clearConversations: () => api.delete('/ai/conversations'),
};

export default api;
