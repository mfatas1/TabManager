import { apiClient } from '../lib/apiClient';

/**
 * Get all saved links from the backend
 * @returns {Promise} Axios promise that resolves to the links array
 */
export const getLinks = () => apiClient.get('/links');

export const getTags = () => apiClient.get('/tags');

/**
 * Save a new link to the backend
 * @param {string} url - The URL to save
 * @returns {Promise} Axios promise that resolves to the created link
 */
export const saveLink = (url) => apiClient.post('/links', { url });

/**
 * Delete a link by ID
 * @param {number} linkId - The ID of the link to delete
 * @returns {Promise} Axios promise
 */
export const deleteLink = (linkId) => apiClient.delete(`/links/${linkId}`);

/**
 * Update a link's title and/or summary
 * @param {number} linkId - The ID of the link to update
 * @param {{ title?: string, summary?: string }} data
 */
export const updateLink = (linkId, data) => apiClient.patch(`/links/${linkId}`, data);

/**
 * Upload a file (PDF, DOCX, TXT, MD) for text extraction and analysis
 * @param {File} file - The file to upload
 */
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
