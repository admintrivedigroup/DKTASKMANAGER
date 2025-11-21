import React, { useContext, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingOverlay from "../components/LoadingOverlay";
import { UserContext } from "../context/userContext.jsx";
import { isRoleAllowed } from "../utils/roleUtils";

const PrivateRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const { user, loading } = useContext(UserContext);

  const canAccess = useMemo(() => {
    if (!user) return false;

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return true;
    }

    return isRoleAllowed(user.role, allowedRoles);
  }, [allowedRoles, user]);

  if (loading) {
    return (
      <LoadingOverlay
        fullScreen
        message="Authenticating your session..."
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccess) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default PrivateRoute;