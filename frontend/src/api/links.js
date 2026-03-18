import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

/**
 * Get all saved links from the backend
 * @returns {Promise} Axios promise that resolves to the links array
 */
export const getLinks = () => axios.get(`${BASE_URL}/links`);

/**
 * Save a new link to the backend
 * @param {string} url - The URL to save
 * @returns {Promise} Axios promise that resolves to the created link
 */
export const saveLink = (url) => axios.post(`${BASE_URL}/links`, { url });

/**
 * Delete a link by ID
 * @param {number} linkId - The ID of the link to delete
 * @returns {Promise} Axios promise
 */
export const deleteLink = (linkId) => axios.delete(`${BASE_URL}/links/${linkId}`);
