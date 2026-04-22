import { apiClient } from '../lib/apiClient';

export const getProjects = () => apiClient.get('/projects');

export const createProject = (project) => apiClient.post('/projects', project);

export const getProject = (projectId) => apiClient.get(`/projects/${projectId}`);

export const updateProject = (projectId, updates) => apiClient.patch(`/projects/${projectId}`, updates);

export const deleteProject = (projectId) => apiClient.delete(`/projects/${projectId}`);

export const addLinkToProject = (projectId, linkId, data = {}) =>
  apiClient.post(`/projects/${projectId}/links`, {
    link_id: linkId,
    ...data,
  });

export const addUrlToProject = (projectId, url, skipAnalysis = false) =>
  apiClient.post(`/projects/${projectId}/links/from-url${skipAnalysis ? '?skip_analysis=true' : ''}`, { url });

export const addFileToProject = (projectId, file, skipAnalysis = false) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post(
    `/projects/${projectId}/links/from-file${skipAnalysis ? '?skip_analysis=true' : ''}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const updateProjectLink = (projectId, linkId, updates) =>
  apiClient.patch(`/projects/${projectId}/links/${linkId}`, updates);

export const removeLinkFromProject = (projectId, linkId) =>
  apiClient.delete(`/projects/${projectId}/links/${linkId}`);

export const createTask = (projectId, task) =>
  apiClient.post(`/projects/${projectId}/tasks`, task);

export const updateTask = (taskId, updates) => apiClient.patch(`/tasks/${taskId}`, updates);

export const deleteTask = (taskId) => apiClient.delete(`/tasks/${taskId}`);
