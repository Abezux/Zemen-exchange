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

/**
 * Fetch image and convert to base64 data URL
 * Works for both authenticated and public endpoints
 */
export const loadImageAsDataUrl = async (imagePath: string | null): Promise<string> => {
  if (!imagePath) return '';
  if (imagePath.startsWith('data:')) return imagePath;
  
  try {
    const fullUrl = getImageUrl(imagePath);
    console.log(`[IMAGE-LOAD] Fetching image from: ${fullUrl}`);
    
    const response = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    if (!response.data || response.data.byteLength === 0) {
      console.error(`[IMAGE-LOAD] Image response is empty from ${fullUrl}`);
      throw new Error('Image content is empty');
    }
    
    // Convert arraybuffer to base64
    const bytes = new Uint8Array(response.data);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log(`[IMAGE-LOAD] Successfully loaded image (${response.data.byteLength} bytes) from ${fullUrl}`);
    
    return dataUrl;
  } catch (error: any) {
    console.error(`[IMAGE-LOAD] Failed to load image from ${imagePath}:`, error.message || error);
    // Return a transparent 1x1 pixel as fallback
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
};
