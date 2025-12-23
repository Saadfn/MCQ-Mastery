/**
 * API Configuration for FastAPI backend
 */

// Backend API base URL - defaults to localhost:8000 for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/api/analyze`,
  analyzeWithCrop: `${API_BASE_URL}/api/analyze-with-crop`,
  analyzePdf: `${API_BASE_URL}/api/analyze-pdf`,
  crop: `${API_BASE_URL}/api/crop`,
  health: `${API_BASE_URL}/health`,
} as const;

/**
 * Check if the backend is available
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.health);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'healthy' && data.geminiConfigured;
  } catch {
    return false;
  }
};
