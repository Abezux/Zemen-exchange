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


//  * Fetch image as a blob URL with proper authentication
//  *// Handles both authenticated// endpoints (/api/p2p/orders/*/proof) and 
//  *// public endpoints (/uploads/*) 

export const loadImageAsBlob = async (imagePath: string | null): Promise<string> => {
  if (!imagePath) return '';
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('blob:')) return imagePath;
  
  try {
    const fullUrl = getImageUrl(imagePath);
    console.log(`[IMAGE-LOAD] Fetching image from: ${fullUrl}`);
    
    const response = await axios.get(fullUrl, {
      responseType: 'blob',
      timeout: 30000 // 30 second timeout for slower connections
    });
    
    if (!response.data || response.data.size === 0) {
      console.error(`[IMAGE-LOAD] Image response is empty from ${fullUrl}`);
      throw new Error('Image content is empty');
    }
    
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'image/jpeg' 
    });
    
    const blobUrl = URL.createObjectURL(blob);
    console.log(`[IMAGE-LOAD] Successfully loaded image (${blob.size} bytes) from ${fullUrl}`);
    
    return blobUrl;
  } catch (error: any) {
    console.error(`[IMAGE-LOAD] Failed to load image from ${imagePath}:`, error.message || error);
    // Return a transparent 1x1 pixel as fallback
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
};
