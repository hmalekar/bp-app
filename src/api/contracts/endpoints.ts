export const API_ENDPOINTS = {
  // Add service endpoints here as they are defined.
  LOGIN: "/api/v1/auth/login",
  GET_PENDING_MIS: "/api/v1/sales/mis_pending",
  MIS: "/api/v1/sales/mis",
  SALES_MIS_EXPORT: "/api/v1/sales/mis_export",
  SALES_MIS_IMPORT: "/api/v1/sales/mis_import",
} as const;

export type ApiEndpointGroup = keyof typeof API_ENDPOINTS;
