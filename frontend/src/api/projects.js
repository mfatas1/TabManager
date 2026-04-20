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

export const addUrlToProject = (projectId, url) =>
  apiClient.post(`/projects/${projectId}/links/from-url`, { url });

export const updateProjectLink = (projectId, linkId, updates) =>
  apiClient.patch(`/projects/${projectId}/links/${linkId}`, updates);

export const removeLinkFromProject = (projectId, linkId) =>
  apiClient.delete(`/projects/${projectId}/links/${linkId}`);

export const createTask = (projectId, task) =>
  apiClient.post(`/projects/${projectId}/tasks`, task);

export const updateTask = (taskId, updates) => apiClient.patch(`/tasks/${taskId}`, updates);

export const deleteTask = (taskId) => apiClient.delete(`/tasks/${taskId}`);
