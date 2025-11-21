import React from "react";

import DashboardLayout from "../../components/layouts/DashboardLayout";
import DocumentsDisabledNotice from "../../components/documents/DocumentsDisabledNotice";

const Documents = () => {
  return (
    <DashboardLayout activeMenu="Documents">
      <DocumentsDisabledNotice />
    </DashboardLayout>
  );
};

export default Documents;