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
  COST_PROJECTS: "/api/v1/cost/projects",
  COST_CATEGORY_MASTER: "/api/v1/cost/category_master",
  COST_DR_EXPORT_TEMPLATE: "/api/v1/cost/export_template",
  COST_DR_IMPORT: "/api/v1/cost/dr_import",
  COST_PENDING_DR: "/api/v1/cost/pending_dr",
  COST_DR_WORKFLOW_UPDATE: "/api/v1/cost/dr_workflow_update",
  COST_DR: "/api/v1/cost/dr",
  COST_DR_EXPORT: "/api/v1/cost/dr_export",
  COST_DR_DELETE: "/api/v1/cost/dr_delete",
  COST_DR_ATTACHMENT: "/api/v1/cost/dr_attachment",
  COST_DR_DOWNLOAD_ATTACHMENT: "/api/v1/cost/dr_download",
} as const;

export type ApiEndpointGroup = keyof typeof API_ENDPOINTS;
