import React, { useContext, useMemo } from "react";
import KraKpiWorkspace from "../components/kraKpi/KraKpiWorkspace";
import { UserContext } from "../context/userContext.jsx";
import { hasPrivilegedAccess, normalizeRole } from "../utils/roleUtils";

const KraKpiPage = () => {
  const { user } = useContext(UserContext);
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isPrivilegedUser = hasPrivilegedAccess(normalizedRole);

  return <KraKpiWorkspace readOnly={!isPrivilegedUser} currentUser={user} />;
};

export default KraKpiPage;
