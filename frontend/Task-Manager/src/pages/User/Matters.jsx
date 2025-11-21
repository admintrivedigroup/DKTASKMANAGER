import React from "react";
import { Route, Routes } from "react-router-dom";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import MattersWorkspace from "../../components/matters/MattersWorkspace";

const UserMatters = () => {
  return (
    <DashboardLayout activeMenu="Matters">
      <Routes>
        <Route
          index
          element={<MattersWorkspace basePath="/user/matters" />}
        />
        <Route
          path=":matterId"
          element={<MattersWorkspace basePath="/user/matters" />}
        />
        <Route
          path=":matterId/cases/:caseId"
          element={<MattersWorkspace basePath="/user/matters" />}
        />
      </Routes>
    </DashboardLayout>
  );
};

export default UserMatters;