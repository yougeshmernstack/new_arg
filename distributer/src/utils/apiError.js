export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data === 'string' && data.trim()) return data;

  if (err?.code === 'ECONNABORTED') {
    return 'Request timed out. Please check if the API server is running.';
  }
  if (err?.message === 'Network Error' || !err?.response) {
    return 'Cannot reach the server. Check your API URL and that the backend is running.';
  }

  return fallback;
}
