import React from "react";
import { Route, Routes } from "react-router-dom";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import MattersWorkspace from "../../components/matters/MattersWorkspace";

const Matters = () => {
  return (
    <DashboardLayout activeMenu="Matters">
      <Routes>
        <Route
          index
          element={<MattersWorkspace basePath="/admin/matters" />}
        />
        <Route
          path=":matterId"
          element={<MattersWorkspace basePath="/admin/matters" />}
        />
        <Route
          path=":matterId/cases/:caseId"
          element={<MattersWorkspace basePath="/admin/matters" />}
        />
      </Routes>
    </DashboardLayout>
  );
};

export default Matters;