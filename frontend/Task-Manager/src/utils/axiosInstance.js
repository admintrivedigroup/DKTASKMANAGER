import axios from "axios";
import { API_PATHS, BASE_URL } from "./apiPaths";
import { getToken } from "./tokenStorage";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const normalizeBaseUrl = (url) => {
  if (!isNonEmptyString(url)) {
    return "";
  }

  return url.trim().replace(/\/?$/, "");
};

const getEnvValue = (key) => {
  if (typeof key !== "string" || key.length === 0) {
    return undefined;
  }

  if (typeof import.meta !== "undefined") {
    const meta = import.meta;
    if (meta && typeof meta.env === "object" && meta.env !== null) {
      const value = meta.env[key];
      if (isNonEmptyString(value)) {
        return value;
      }
    }
  }

  if (typeof process !== "undefined" && process && typeof process.env === "object") {
    const value = process.env[key];
    if (isNonEmptyString(value)) {
      return value;
    }
  }

  return undefined;
};

const deriveLocalBaseUrl = () => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return "";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const normalizedHost = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";

  const isLocalHost =
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "0.0.0.0" ||
    (normalizedHost.endsWith && normalizedHost.endsWith(".local"));

  if (!isLocalHost) {
    return "";
  }

  const configuredPort = getEnvValue("VITE_BACKEND_PORT");
  const parsedPort = Number.parseInt(configuredPort, 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5000;

  return `${protocol}//${hostname}:${port}`;
};

const shouldUseLocalApi = () => {
  const rawPreference = getEnvValue("VITE_USE_LOCAL_API");

  if (!isNonEmptyString(rawPreference)) {
    return false;
  }

  const normalizedPreference = rawPreference.trim().toLowerCase();

  return ["1", "true", "yes", "on"].includes(normalizedPreference);
};

const resolveBaseUrl = () => {
  const envBaseUrl = normalizeBaseUrl(getEnvValue("VITE_API_BASE_URL"));
  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (shouldUseLocalApi()) {
    const localBaseUrl = normalizeBaseUrl(deriveLocalBaseUrl());
    if (localBaseUrl) {
      return localBaseUrl;
    }
  }

  return normalizeBaseUrl(BASE_URL);
};

const fallbackBaseUrl = normalizeBaseUrl(BASE_URL);

const mergeUrl = (url, baseUrl) => {
  if (!url) {
    return url;
  }

  if (ABSOLUTE_URL_REGEX.test(url)) {
    return url;
  }

  const sanitizedBase = normalizeBaseUrl(baseUrl || fallbackBaseUrl || BASE_URL);

  if (!sanitizedBase) {
    return url.startsWith("/") ? url : `/${url}`;
  }

  if (ABSOLUTE_URL_REGEX.test(sanitizedBase)) {
    const baseForUrl = sanitizedBase.endsWith("/")
      ? sanitizedBase
      : `${sanitizedBase}/`;
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

const initialBaseUrl = resolveBaseUrl() || fallbackBaseUrl;

// ======================================================
// 🔍 DEBUG LOGS – SEE WHAT BASE URL AXIOS IS USING
// ======================================================
console.group("%c🔍 AXIOS BASE URL DEBUG", "color: #4CAF50; font-weight: bold;");
console.log("import.meta.env.VITE_API_BASE_URL:", import.meta.env?.VITE_API_BASE_URL);
console.log("import.meta.env.VITE_USE_LOCAL_API:", import.meta.env?.VITE_USE_LOCAL_API);
console.log("import.meta.env.VITE_BACKEND_PORT:", import.meta.env?.VITE_BACKEND_PORT);
console.log("Derived Local Base URL:", deriveLocalBaseUrl());
console.log("Should Use Local API:", shouldUseLocalApi());
console.log("BASE_URL from apiPaths.js:", BASE_URL);
console.log("Resolved Base URL (initialBaseUrl):", initialBaseUrl);
console.groupEnd();

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
  baseURL: initialBaseUrl || undefined,
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
      initialBaseUrl ||
      fallbackBaseUrl;

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
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
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