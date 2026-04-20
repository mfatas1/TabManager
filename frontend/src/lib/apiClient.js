import axios from 'axios';
import { supabase } from './supabase';

const API_HOST = window.location.hostname || 'localhost';
export const BASE_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}:8000`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  if (!supabase) {
    return config;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
