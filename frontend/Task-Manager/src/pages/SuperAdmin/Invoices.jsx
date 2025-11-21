import React from "react";
import InvoicesWorkspace from "../../components/Invoices/InvoicesWorkspace";

const SuperAdminInvoices = () => (
  <InvoicesWorkspace
    viewerRole="super_admin"
    heading="Revenue Operations"
    description="Stay informed on collections, cash flow, and matter-level billing momentum across the practice."
    showClientDetails
    activeMenu="Invoices"
  />
);

export default SuperAdminInvoices;