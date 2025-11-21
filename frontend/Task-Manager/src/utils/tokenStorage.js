const TOKEN_KEY = "token";
const STORAGE_PREFERENCE_KEY = "tokenStoragePreference";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const setPreference = (preference) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_PREFERENCE_KEY, preference);
  } catch (error) {
    console.error("Failed to set token storage preference", error);
  }
};

export const getStoredTokenPreference = () => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFERENCE_KEY);
  } catch (error) {
    console.error("Failed to read token storage preference", error);
    return null;
  }
};

const storeInLocalStorage = (token) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    setPreference("local");
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to store token in localStorage", error);
  }
};

const storeInSessionStorage = (token) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    setPreference("session");
    window.localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to store token in sessionStorage", error);
  }
};

export const setToken = (token, rememberMe) => {
  if (!token) {
    clearToken();
    return;
  }

  if (rememberMe === true) {
    storeInLocalStorage(token);
    return;
  }

  if (rememberMe === false) {
    storeInSessionStorage(token);
    return;
  }

  const preference = getStoredTokenPreference();
  if (preference === "session") {
    storeInSessionStorage(token);
  } else {
    storeInLocalStorage(token);
  }
};

export const getToken = () => {
  if (!isBrowser()) return null;

  const preference = getStoredTokenPreference();
  try {
    if (preference === "session") {
      return window.sessionStorage.getItem(TOKEN_KEY);
    }

    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to access stored token", error);
    return null;
  }
};

export const clearToken = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(STORAGE_PREFERENCE_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear stored token", error);
  }
};