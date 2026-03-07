/**
 * Disbursement request line / approval status codes.
 * Used when approvers set approved amount per line (not Sales MIS workflow).
 */
export const DISBURSEMENT_REQUEST_LINE_STATUS = {
  /** Approved: approved amount = payable */
  APPROVED: "A",
  /** Rejected: approved amount = 0 */
  REJECTED: "R",
  /** Partial: 0 < approved amount < payable */
  PARTIAL: "P",
} as const;

export type DisbursementRequestLineStatusCode =
  (typeof DISBURSEMENT_REQUEST_LINE_STATUS)[keyof typeof DISBURSEMENT_REQUEST_LINE_STATUS];
