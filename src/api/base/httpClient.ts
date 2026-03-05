import axios from "axios";
import { environment } from "../../environment";
import { getToken } from "../../auth/tokenManager";

export const httpClient = axios.create({
  baseURL: environment.apiBaseUrl,
  timeout: 15000,
});

// Request interceptor
httpClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – force ApiResponse<T>
httpClient.interceptors.response.use(
  (response) => {
    return Promise.resolve(response.data);
  },
  (error) => {
    // Handle network errors (timeout, CORS, connection refused, etc.)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error(`API Timeout: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        message: 'Request timed out. Check if backend is accessible and CORS is configured.'
      });
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      console.error(`Network Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        baseURL: error.config?.baseURL,
        message: 'Network error. Check CORS settings and backend connectivity.'
      });
    } else if (error.response?.data) {
      // Server responded with error
      return Promise.resolve(error.response.data);
    }

    return Promise.resolve({
      responseStatusCode: error.response?.status || 500,
      isError: true,
      successData: undefined,
      errorData: {
        displayMessage: error.message || 'Network error. Please check your connection and backend server.',
        additionalProps: new Map(),
      },
    });
  }
);
