import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

// Use an environment variable for the backend API URL, or fallback to a default
const baseURL = process.env.NEXT_PUBLIC_API_URL || "https://api.surisync.internal/v1";

export const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
};

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Ideally trigger a refresh token flow here
      // For now, logout if unauthorized
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
