import axios from "axios";
import { API_PATHS } from "./apiPaths";
import { getToken } from "./tokenStorage";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = getToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors globally
    if (error.response) {
      if (error.response.status === 401) {
        const requestUrl = error.config && error.config.url ? error.config.url : "";
        const isAuthRequest = [API_PATHS.AUTH.LOGIN].some((path) => requestUrl.endsWith(path));
        const isBrowser = typeof window !== "undefined" && typeof window.location !== "undefined";
        const isAlreadyOnLoginPage = isBrowser && window.location.pathname === "/login";

        if (isBrowser && !isAuthRequest && !isAlreadyOnLoginPage) {
          window.location.replace("/login");
        }
      } else if (error.response.status === 500) {
        console.error("Server error. Please try again later.");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please try again.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
