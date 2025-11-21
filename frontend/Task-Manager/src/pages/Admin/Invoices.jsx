import React from "react";
import InvoicesWorkspace from "../../components/Invoices/InvoicesWorkspace";

const AdminInvoices = () => (
  <InvoicesWorkspace
    viewerRole="admin"
    heading="Firm Billing Overview"
    description="Monitor every client invoice, stay ahead of receivables, and surface which matters need follow-up."
    showClientDetails
    activeMenu="Invoices"
  />
);

export default AdminInvoices;