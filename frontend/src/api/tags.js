import axios from 'axios';

const API_HOST = window.location.hostname || 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:8000`;

export const getTags = () => axios.get(`${BASE_URL}/tags`);
