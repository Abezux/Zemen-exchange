import axios from 'axios';

export const getImageUrl = (path: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:')) return path;
  
  const baseURL = axios.defaults.baseURL || '';
  // Remove trailing slash from baseURL if present
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBaseURL}${normalizedPath}`;
};
