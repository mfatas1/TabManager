import axios from 'axios';

const API_HOST = window.location.hostname || 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:8000`;

export const getProjects = () => axios.get(`${BASE_URL}/projects`);

export const createProject = (project) => axios.post(`${BASE_URL}/projects`, project);

export const getProject = (projectId) => axios.get(`${BASE_URL}/projects/${projectId}`);

export const updateProject = (projectId, updates) => axios.patch(`${BASE_URL}/projects/${projectId}`, updates);

export const deleteProject = (projectId) => axios.delete(`${BASE_URL}/projects/${projectId}`);

export const addLinkToProject = (projectId, linkId, data = {}) =>
  axios.post(`${BASE_URL}/projects/${projectId}/links`, {
    link_id: linkId,
    ...data,
  });

export const addUrlToProject = (projectId, url) =>
  axios.post(`${BASE_URL}/projects/${projectId}/links/from-url`, { url });

export const updateProjectLink = (projectId, linkId, updates) =>
  axios.patch(`${BASE_URL}/projects/${projectId}/links/${linkId}`, updates);

export const removeLinkFromProject = (projectId, linkId) =>
  axios.delete(`${BASE_URL}/projects/${projectId}/links/${linkId}`);

export const createTask = (projectId, task) =>
  axios.post(`${BASE_URL}/projects/${projectId}/tasks`, task);

export const updateTask = (taskId, updates) => axios.patch(`${BASE_URL}/tasks/${taskId}`, updates);

export const deleteTask = (taskId) => axios.delete(`${BASE_URL}/tasks/${taskId}`);
