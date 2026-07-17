export const APP_NAME = process.env.REACT_APP_NAME || 'Arogya Green Life';
export const APP_TAGLINE = 'Natural • Pure • Healthy • Sustainable';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:6500';
export const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/distributor';
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  PROFILE: 'auth_profile',
};
