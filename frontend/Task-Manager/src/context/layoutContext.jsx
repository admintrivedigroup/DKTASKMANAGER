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
  // Sidebar collapse state
  isSidebarCollapsed: false,
  toggleSidebar: createGuardedAction("toggleSidebar"),
  setSidebarCollapsed: createGuardedAction("setSidebarCollapsed"),
  // Command palette state
  isCommandPaletteOpen: false,
  openCommandPalette: createGuardedAction("openCommandPalette"),
  closeCommandPalette: createGuardedAction("closeCommandPalette"),
  toggleCommandPalette: createGuardedAction("toggleCommandPalette"),
  // Right sidebar state
  isRightSidebarOpen: false,
  toggleRightSidebar: createGuardedAction("toggleRightSidebar"),
  setRightSidebarOpen: createGuardedAction("setRightSidebarOpen"),
  // Theme variant
  themeVariant: "default",
  setThemeVariant: createGuardedAction("setThemeVariant"),
  // Font size
  fontSize: "medium",
  setFontSize: createGuardedAction("setFontSize"),
  // Onboarding
  hasCompletedTour: false,
  setTourCompleted: createGuardedAction("setTourCompleted"),
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
  
  // New state variables
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpenState] = useState(false);
  
  const [themeVariant, setThemeVariantState] = useState(() => {
    try {
      return localStorage.getItem('theme-variant') || 'default';
    } catch {
      return 'default';
    }
  });
  
  const [fontSize, setFontSizeState] = useState(() => {
    try {
      return localStorage.getItem('font-size') || 'medium';
    } catch {
      return 'medium';
    }
  });
  
  const [hasCompletedTour, setHasCompletedTourState] = useState(() => {
    try {
      return localStorage.getItem('onboarding-completed') === 'true';
    } catch {
      return false;
    }
  });

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

  // Sidebar collapse callbacks
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const setSidebarCollapsed = useCallback((value) => {
    setIsSidebarCollapsedState(value);
    try {
      localStorage.setItem('sidebar-collapsed', String(value));
    } catch {}
  }, []);

  // Command palette callbacks
  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev);
  }, []);

  // Right sidebar callbacks
  const toggleRightSidebar = useCallback(() => {
    setIsRightSidebarOpenState((prev) => !prev);
  }, []);

  const setRightSidebarOpen = useCallback((value) => {
    setIsRightSidebarOpenState(value);
  }, []);

  // Theme variant callbacks
  const setThemeVariant = useCallback((variant) => {
    setThemeVariantState(variant);
    try {
      localStorage.setItem('theme-variant', variant);
    } catch {}
  }, []);

  // Font size callbacks
  const setFontSize = useCallback((size) => {
    setFontSizeState(size);
    try {
      localStorage.setItem('font-size', size);
    } catch {}
    // Apply font size to document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-size', size);
    }
  }, []);

  // Onboarding callbacks
  const setTourCompleted = useCallback((value) => {
    setHasCompletedTourState(value);
    try {
      localStorage.setItem('onboarding-completed', String(value));
    } catch {}
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
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      isRightSidebarOpen,
      toggleRightSidebar,
      setRightSidebarOpen,
      themeVariant,
      setThemeVariant,
      fontSize,
      setFontSize,
      hasCompletedTour,
      setTourCompleted,
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
      isSidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      isRightSidebarOpen,
      toggleRightSidebar,
      setRightSidebarOpen,
      themeVariant,
      setThemeVariant,
      fontSize,
      setFontSize,
      hasCompletedTour,
      setTourCompleted,
    ],
  );

  return (
    <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>
  );
};

const useLayoutContext = () => useContext(LayoutContext);

export default LayoutProvider;
export { LayoutContext, useLayoutContext };