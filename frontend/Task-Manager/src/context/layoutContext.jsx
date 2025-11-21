import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const isDevelopment = () => {
  try {
    return Boolean(typeof import.meta !== "undefined" && import.meta?.env?.DEV);
  } catch (error) {
    return false;
  }
};

const createGuardedAction = (actionName) => () => {
  if (isDevelopment()) {
    console.warn(
      `LayoutContext: attempted to call ${actionName} outside of LayoutProvider.`,
    );
  }
};

const defaultContextValue = {
  activeMenu: "",
  setActiveMenu: createGuardedAction("setActiveMenu"),
  isMobileNavOpen: false,
  openMobileNav: createGuardedAction("openMobileNav"),
  closeMobileNav: createGuardedAction("closeMobileNav"),
  toggleMobileNav: createGuardedAction("toggleMobileNav"),
  isDarkMode: false,
  setDarkMode: createGuardedAction("setDarkMode"),
  toggleDarkMode: createGuardedAction("toggleDarkMode"),
  resetThemePreference: createGuardedAction("resetThemePreference"),
};

const LayoutContext = createContext(defaultContextValue);

const getStoredThemePreference = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedPreference = window.localStorage.getItem("task-manager-theme");
    if (storedPreference === "dark") {
      return true;
    }

    if (storedPreference === "light") {
      return false;
    }
  } catch (error) {
    if (isDevelopment()) {
      console.warn("LayoutContext: failed to access localStorage", error);
    }
  }

  return null;
};

const getInitialThemePreference = () => {
  const storedPreference = getStoredThemePreference();

  if (storedPreference !== null) {
    return storedPreference;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch (error) {
    if (isDevelopment()) {
      console.warn("LayoutContext: unable to read prefers-color-scheme", error);
    }
    return false;
  }
};

const applyThemeToDocument = (shouldUseDarkTheme) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", shouldUseDarkTheme);
};

const persistThemePreference = (shouldUseDarkTheme) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      "task-manager-theme",
      shouldUseDarkTheme ? "dark" : "light",
    );
  } catch (error) {
    if (isDevelopment()) {
      console.warn("LayoutContext: failed to persist theme preference", error);
    }
  }
};

const clearStoredThemePreference = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem("task-manager-theme");
  } catch (error) {
    if (isDevelopment()) {
      console.warn("LayoutContext: failed to clear theme preference", error);
    }
  }
};

const LayoutProvider = ({ children }) => {
  const [activeMenu, setActiveMenuState] = useState(defaultContextValue.activeMenu);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(
    defaultContextValue.isMobileNavOpen,
  );
  const [isDarkMode, setIsDarkMode] = useState(getInitialThemePreference);
  const hasStoredPreferenceRef = useRef(getStoredThemePreference() !== null);

  useEffect(() => {
    applyThemeToDocument(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event) => {
      if (hasStoredPreferenceRef.current) {
        return;
      }

      setIsDarkMode(event.matches);
    };

    try {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } catch (error) {
      // Safari <14 does not support addEventListener on MediaQueryList
      mediaQuery.addListener?.(handleSystemThemeChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } catch (error) {
        mediaQuery.removeListener?.(handleSystemThemeChange);
      }
    };
  }, []);

  const setActiveMenu = useCallback((menuLabel) => {
    setActiveMenuState(menuLabel || "");
  }, []);

  const openMobileNav = useCallback(() => {
    setIsMobileNavOpen(true);
  }, []);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  const toggleMobileNav = useCallback(() => {
    setIsMobileNavOpen((previous) => !previous);
  }, []);

  const setDarkMode = useCallback((value) => {
    setIsDarkMode((previous) => {
      const nextValue = Boolean(value);
      if (previous === nextValue) {
        hasStoredPreferenceRef.current = true;
        persistThemePreference(nextValue);
        return previous;
      }

      hasStoredPreferenceRef.current = true;
      persistThemePreference(nextValue);
      return nextValue;
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((previous) => {
      const nextValue = !previous;
      hasStoredPreferenceRef.current = true;
      persistThemePreference(nextValue);
      return nextValue;
    });
  }, []);

  const resetThemePreference = useCallback(() => {
    hasStoredPreferenceRef.current = false;
    clearStoredThemePreference();
    setIsDarkMode(getInitialThemePreference());
  }, []);

  const contextValue = useMemo(
    () => ({
      activeMenu,
      setActiveMenu,
      isMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
      isDarkMode,
      setDarkMode,
      toggleDarkMode,
      resetThemePreference,
    }),
    [
      activeMenu,
      isMobileNavOpen,
      isDarkMode,
      setActiveMenu,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
      setDarkMode,
      toggleDarkMode,
      resetThemePreference,
    ],
  );

  return (
    <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>
  );
};

const useLayoutContext = () => useContext(LayoutContext);

export default LayoutProvider;
export { LayoutContext, useLayoutContext };