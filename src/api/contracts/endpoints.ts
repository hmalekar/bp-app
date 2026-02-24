export const API_ENDPOINTS = {
  // Add service endpoints here as they are defined.
  LOGIN: "/api/v1/auth/login",
  GET_PENDING_MIS: "/api/v1/sales/mis_pending",
  MIS: "/api/v1/sales/mis",
  SALES_MIS_EXPORT: "/api/v1/sales/mis_export",
  SALES_MIS_IMPORT: "/api/v1/sales/mis_import",
  SALES_MIS_VALIDATE: "/api/v1/sales/mis_validate",
  SALES_MIS_UPDATE_COMMENTARY: "/api/v1/sales/mis_update_commentary",
  SALES_MIS_WORKFLOW_UPDATE: "/api/v1/sales/mis_workflow_update",
  SALES_MIS_COMPARE: "/api/v1/sales/mis_compare",
  SALES_SOLD_UNITS: "/api/v1/sales/mis_sold_units",
  SALES_CANCELLATION: "/api/v1/sales/sales_cancellation",
  SALES_CANCELLED_UNITS: "/api/v1/sales/cancelled_units",
} as const;

export type ApiEndpointGroup = keyof typeof API_ENDPOINTS;
