import axios from "axios";

// Debug: Check environment variable loading
console.log("🔧 DEBUG Environment Variables:");
console.log("  VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("  NODE_ENV:", import.meta.env.NODE_ENV);
console.log("  All env vars:", import.meta.env);

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : window.location.hostname.includes("vercel.app")
    ? "https://vfx-seal-q.onrender.com/api" // Production fallback
    : "/api"; // Development

console.log("🚀 Final API_BASE:", API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vfxseal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vfxseal_token");
      localStorage.removeItem("vfxseal_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Enhanced error information for better debugging
    if (error.response) {
      const errorMessage =
        error.response.data?.message ||
        `HTTP ${error.response.status}: ${error.response.statusText}`;
      error.displayMessage = errorMessage;
    } else if (error.request) {
      error.displayMessage =
        "Network error: Unable to reach the server. Please check your connection.";
    } else {
      error.displayMessage = error.message || "An unexpected error occurred";
    }

    return Promise.reject(error);
  },
);

export default api;
