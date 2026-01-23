import axios from "axios";
import { API_PATHS, API_BASE_URL } from "./apiPaths";
import { getToken } from "./tokenStorage";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const normalizeBaseUrl = (url) => {
  if (!isNonEmptyString(url)) {
    return "";
  }

  return url.trim().replace(/\/?$/, "");
};

const configuredBaseUrl = normalizeBaseUrl(API_BASE_URL);

if (!configuredBaseUrl) {
  console.warn("VITE_API_URL is not set; API calls will use relative paths.");
}

const mergeUrl = (url, baseUrl = configuredBaseUrl) => {
  if (!url) {
    return url;
  }

  if (ABSOLUTE_URL_REGEX.test(url)) {
    return url;
  }

  const sanitizedBase = normalizeBaseUrl(baseUrl);

  if (!sanitizedBase) {
    return url.startsWith("/") ? url : `/${url}`;
  }

  if (ABSOLUTE_URL_REGEX.test(sanitizedBase)) {
    const baseForUrl = sanitizedBase.endsWith("/") ? sanitizedBase : `${sanitizedBase}/`;
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;

    try {
      return new URL(normalizedPath, baseForUrl).toString();
    } catch (error) {
      const fallbackBase = sanitizedBase.replace(/\/+$/g, "");
      const fallbackPath = normalizedPath.replace(/^\/+/, "");

      return `${fallbackBase}/${fallbackPath}`;
    }
  }

  const normalizedBase = sanitizedBase.replace(/\/+$/g, "");
  const trimmedBase = normalizedBase.replace(/^\/+/, "");
  const trimmedPath = url.replace(/^\/+/, "");

  if (url.startsWith("/")) {
    return `/${trimmedPath}`;
  }

  if (trimmedBase && trimmedPath.startsWith(`${trimmedBase}/`)) {
    return `/${trimmedPath}`;
  }

  const segments = [trimmedBase, trimmedPath].filter(Boolean);

  return `/${segments.join("/")}`.replace(/\/+$/g, "");
};

const resolveTimeout = () => {
  let envTimeout;

  if (typeof import.meta !== "undefined") {
    const meta = import.meta;
    if (meta && meta.env && typeof meta.env === "object") {
      envTimeout = meta.env.VITE_API_TIMEOUT;
    }
  }

  if (!envTimeout && typeof process !== "undefined" && process && process.env) {
    envTimeout = process.env.VITE_API_TIMEOUT;
  }

  const parsedTimeout = Number.parseInt(envTimeout, 10);

  if (Number.isFinite(parsedTimeout) && parsedTimeout > 0) {
    return parsedTimeout;
  }

  // Render-hosted services can take a while to warm up. Give them plenty of time
  // instead of failing after just 10 seconds.
  return 60000;
};

const axiosInstance = axios.create({
  baseURL: configuredBaseUrl || undefined,
  timeout: resolveTimeout(),
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

    const computedBaseUrl =
      normalizeBaseUrl(config.baseURL) ||
      normalizeBaseUrl(axiosInstance.defaults.baseURL) ||
      configuredBaseUrl;

    if (typeof config.url === "string") {
      const trimmedUrl = config.url.trim();
      const finalUrl = mergeUrl(trimmedUrl, computedBaseUrl);

      config.url = finalUrl;

      if (!ABSOLUTE_URL_REGEX.test(finalUrl) && computedBaseUrl) {
        config.baseURL = computedBaseUrl;
      } else {
        config.baseURL = undefined;
      }
    } else if (computedBaseUrl) {
      config.baseURL = computedBaseUrl;
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
