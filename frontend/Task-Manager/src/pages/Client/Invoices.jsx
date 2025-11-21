import React from "react";
import InvoicesWorkspace from "../../components/Invoices/InvoicesWorkspace";

const ClientInvoices = () => (
  <InvoicesWorkspace
    viewerRole="client"
    heading="Billing & Statements"
    description="Review statements, understand payment status, and see how each matter is progressing toward completion."
    showClientDetails={false}
    activeMenu="Invoices"
  />
);

export default ClientInvoices;