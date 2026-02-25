import React, { createContext, useEffect, useMemo, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { clearToken, getToken, setToken } from "../utils/tokenStorage";
import { normalizeRole } from "../utils/roleUtils";
import { disconnectSocket } from "../utils/socket";

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
      `UserContext: attempted to call ${actionName} outside of UserProvider.`,
    );
  }
};

const defaultContextValue = {
  user: null,
  loading: true,
  updateUser: createGuardedAction("updateUser"),
  clearUser: createGuardedAction("clearUser"),
};

const UserContext = createContext(defaultContextValue);

const withNormalizedRole = (userData) => {
  if (!userData || typeof userData !== "object") {
    return userData;
  }

  return {
    ...userData,
    role: normalizeRole(userData.role),
  };
};

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(defaultContextValue.user);
  const [loading, setLoading] = useState(defaultContextValue.loading);

  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      const accessToken = getToken();

      if (!accessToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
        if (isMounted) {
          setUser(withNormalizedRole(response.data));
        }
      } catch (error) {
        console.error("User not authenticated", error);
        disconnectSocket();
        clearToken();        
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUser = (userData, options = {}) => {
    const normalizedUser = withNormalizedRole(userData);

    setUser(normalizedUser);
    if (normalizedUser?.token) {
      setToken(normalizedUser.token, options.rememberMe);
    }
    setLoading(false);
  };
  
  const clearUser = () => {
    disconnectSocket();
    setUser(null);
    clearToken();
  };

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      updateUser,
      clearUser,
    }),
    [user, loading],
  );
  
  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

export default UserProvider;
export { UserContext };
 
