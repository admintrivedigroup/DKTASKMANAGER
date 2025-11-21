import React from "react";
import { Route, Routes } from "react-router-dom";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import MattersWorkspace from "../../components/matters/MattersWorkspace";

const SuperAdminMatters = () => {
  return (
    <DashboardLayout activeMenu="Matters">
      <Routes>
        <Route
          index
          element={<MattersWorkspace basePath="/super-admin/matters" />}
        />
        <Route
          path=":matterId"
          element={<MattersWorkspace basePath="/super-admin/matters" />}
        />
        <Route
          path=":matterId/cases/:caseId"
          element={<MattersWorkspace basePath="/super-admin/matters" />}
        />
      </Routes>
    </DashboardLayout>
  );
};

export default SuperAdminMatters;