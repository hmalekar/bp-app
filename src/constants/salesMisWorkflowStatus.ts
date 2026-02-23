/**
 * Pending Sales MIS workflow status codes and captions.
 * API returns captions; codes are used for further workflow/backend use.
 */
export const SALES_MIS_WORKFLOW_STATUS = {
  /** Pending Upload: '' - Not uploaded at all */
  PENDING_UPLOAD: "",
  /** Pending Submission for Approval: '' - Uploaded but not yet submitted for approval */
  PENDING_SUBMISSION_FOR_APPROVAL: "",
  /** Submitted for Approval: 'S' - Uploaded and submitted for approval */
  SUBMITTED_FOR_APPROVAL: "S",
  /** Recalled: 'U' - When it is recalled after submission but before the workflow has moved */
  RECALLED: "U",
  /** Approved: 'A' */
  APPROVED: "A",
  /** Rejected: 'R' */
  REJECTED: "R",
} as const;

export type SalesMisWorkflowStatusCode = (typeof SALES_MIS_WORKFLOW_STATUS)[keyof typeof SALES_MIS_WORKFLOW_STATUS];

/** Captions returned by the API (display text). Map code -> caption if API ever sends codes. */
export const SALES_MIS_WORKFLOW_STATUS_CAPTIONS: Record<string, string> = {
  /** Code '' applies to both "Pending Upload" and "Pending Submission for Approval" */
  [SALES_MIS_WORKFLOW_STATUS.PENDING_UPLOAD]: "Pending Upload",
  [SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL]: "Submitted for Approval",
  [SALES_MIS_WORKFLOW_STATUS.RECALLED]: "Recalled",
  [SALES_MIS_WORKFLOW_STATUS.APPROVED]: "Approved",
  [SALES_MIS_WORKFLOW_STATUS.REJECTED]: "Rejected",
};

/** Caption used when status is "uploaded but not submitted" — show download uploaded MIS section */
export const CAPTION_SUBMITTED_FOR_APPROVAL = "Submitted for Approval";

/** Badge CSS classes keyed by API caption (API returns captions, not codes). */
export const SALES_MIS_STATUS_BADGE_CLASS: Record<string, string> = {
  "Pending Upload": "bg-secondary",
  "Pending Submission for Approval": "bg-secondary",
  [CAPTION_SUBMITTED_FOR_APPROVAL]: "bg-info",
  Recalled: "bg-warning text-dark",
  Approved: "bg-success",
  Rejected: "bg-danger",
};

export function getSalesMisStatusBadgeClass(caption: string): string {
  if (!caption) return SALES_MIS_STATUS_BADGE_CLASS["Pending Upload"] ?? "bg-secondary";
  const normalized = caption.trim();
  return SALES_MIS_STATUS_BADGE_CLASS[normalized] ?? "bg-secondary";
}
