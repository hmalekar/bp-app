import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, downloadFile } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import { getSalesMisStatusBadgeClass, SALES_MIS_WORKFLOW_STATUS } from "../constants/salesMisWorkflowStatus";
import { DISBURSEMENT_REQUEST_LINE_STATUS } from "../constants/disbursementRequestStatus";
import type {
  DisbursementRequestCostRecordDto,
  DisbursementRequestDto,
  DisbursementRequestWorkflowUpdateRequest,
  ValidationResponse,
  WorkflowRecordDto,
} from "../api/contracts/types";

/** Parse string to number; allow only digits and one decimal. Returns NaN if invalid or value is undefined/null. */
function parseAmount(value: string | undefined | null): number {
  if (value == null) return NaN;
  const cleaned = String(value)
    .replace(/[^\d.]/g, "")
    .replace(/^(\d*\.?\d*).*/, "$1");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? NaN : num;
}

/** Clamp approved amount to [0, payable]. */
function clampApprovedAmount(approved: number, payable: number): number {
  if (approved < 0) return 0;
  const max = typeof payable === "number" && !Number.isNaN(payable) ? payable : 0;
  return approved > max ? max : approved;
}

/** Derive line status from approved and payable: A = full, R = zero, P = partial. */
function getLineStatus(approved: number, payable: number): "A" | "R" | "P" {
  const a = Number(approved);
  const p = Number(payable);
  if (a <= 0) return "R";
  if (p > 0 && a >= p) return "A";
  return "P";
}

function ManageDisbursementRequestPage() {
  const { drNumber: drNumberParam } = useParams<"drNumber">();
  const location = useLocation();
  const navigate = useNavigate();
  const nextApprovalUserRole = (location.state as { nextApprovalUserRole?: string } | null)?.nextApprovalUserRole;
  const [dr, setDr] = useState<DisbursementRequestDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);
  const [rejectComments, setRejectComments] = useState("");
  /** Approved amount input value per record (RecordNumber -> string). Only used when approver can edit. */
  const [approvedAmountByRecord, setApprovedAmountByRecord] = useState<Record<number, string>>({});
  /** Audit remarks per record (RecordNumber -> string). Mandatory when approved amount ≠ payable. */
  const [auditRemarksByRecord, setAuditRemarksByRecord] = useState<Record<number, string>>({});
  /** Committed approved amount per record (updated on blur only); used for row highlight. */
  const [committedApprovedByRecord, setCommittedApprovedByRecord] = useState<Record<number, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [showWorkflowHistoryDetails, setShowWorkflowHistoryDetails] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowRecordDto[]>([]);
  const [isLoadingWorkflowHistory, setIsLoadingWorkflowHistory] = useState(false);
  const role = getUserRole();
  const isBorrower = role === "B";

  useEffect(() => {
    if (isBorrower) {
      navigate("/pending-workflow", { replace: true });
      return;
    }
  }, [isBorrower, navigate]);

  useEffect(() => {
    if (isBorrower || drNumberParam == null) return;

    let isMounted = true;
    const drNumber = Number(drNumberParam);
    if (Number.isNaN(drNumber)) {
      setError("Invalid DR number");
      setIsLoading(false);
      return;
    }

    const fetchDr = async () => {
      setError(null);
      setDr(null);
      try {
        const data = await apiGet<DisbursementRequestDto>(API_ENDPOINTS.COST_DR, {
          params: { drNumber },
        });
        if (isMounted) setDr(data);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load disbursement request";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDr();
    return () => {
      isMounted = false;
    };
  }, [drNumberParam, isBorrower]);

  useEffect(() => {
    if (isBorrower || drNumberParam == null) return;
    const drNumber = Number(drNumberParam);
    if (Number.isNaN(drNumber)) return;
    let isMounted = true;
    setIsLoadingWorkflowHistory(true);
    const fetchWorkflowHistory = async () => {
      try {
        const data = await apiGet<WorkflowRecordDto[]>(API_ENDPOINTS.COST_DR_WORKFLOW_HISTORY, {
          params: { drNumber },
        });
        if (isMounted) setWorkflowHistory(Array.isArray(data) ? data : []);
      } catch {
        if (isMounted) setWorkflowHistory([]);
      } finally {
        if (isMounted) setIsLoadingWorkflowHistory(false);
      }
    };
    fetchWorkflowHistory();
    return () => {
      isMounted = false;
    };
  }, [drNumberParam, isBorrower]);

  // Initialize approved amount, audit remarks, and committed approved (for row highlight) from DR records.
  useEffect(() => {
    if (!dr?.Records?.length) {
      setApprovedAmountByRecord({});
      setAuditRemarksByRecord({});
      setCommittedApprovedByRecord({});
      return;
    }
    const nextAmount: Record<number, string> = {};
    const nextCommitted: Record<number, number> = {};
    const nextRemarks: Record<number, string> = {};
    for (const row of dr.Records) {
      const payable = row.PayableAmount ?? 0;
      const current = row.ApprovedAmount;
      const initial = typeof current === "number" && !Number.isNaN(current) ? current : payable;
      const clamped = clampApprovedAmount(initial, payable);
      nextAmount[row.RecordNumber] = String(clamped);
      nextCommitted[row.RecordNumber] = clamped;
      nextRemarks[row.RecordNumber] = row.AuditRemarks != null ? String(row.AuditRemarks) : "";
    }
    setApprovedAmountByRecord(nextAmount);
    setCommittedApprovedByRecord(nextCommitted);
    setAuditRemarksByRecord(nextRemarks);
  }, [dr?.Records]);

  const drNumber = drNumberParam != null ? Number(drNumberParam) : null;
  const approvalFlag = (dr?.ApprovalFlag ?? "").trim().toUpperCase();

  const setApprovedAmountForRecord = (recordNumber: number, raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "").replace(/^(\d*\.?\d*).*/, "$1");
    setApprovedAmountByRecord((prev) => ({ ...prev, [recordNumber]: cleaned }));
  };

  const handleApprove = async () => {
    if (drNumber == null || Number.isNaN(drNumber) || !dr?.Records?.length) return;
    setError(null);
    const payableByRecord = new Map(dr.Records.map((r) => [r.RecordNumber, r.PayableAmount ?? 0]));
    const records = dr.Records.map((row) => {
      const payable = row.PayableAmount ?? 0;
      const committed = committedApprovedByRecord[row.RecordNumber];
      const raw = approvedAmountByRecord[row.RecordNumber];
      const fromInput = Number.isNaN(parseAmount(raw)) ? NaN : clampApprovedAmount(parseFloat(raw), payable);
      const approved = typeof committed === "number" && !Number.isNaN(committed) ? committed : Number.isNaN(fromInput) ? 0 : fromInput;
      const status = getLineStatus(approved, payable);
      const remarks = (auditRemarksByRecord[row.RecordNumber] ?? "").trim();
      return { RecordNumber: row.RecordNumber, ApprovedAmount: approved, Status: status, AuditRemarks: remarks };
    });
    const missingRemarks = records.filter((r) => {
      const payable = payableByRecord.get(r.RecordNumber) ?? 0;
      return r.ApprovedAmount !== payable && r.ApprovedAmount > 0 && !(auditRemarksByRecord[r.RecordNumber] ?? "").trim();
    });
    if (missingRemarks.length > 0) {
      setError("Audit remarks are mandatory when approved amount is not equal to payable amount. Please add remarks for the affected line(s).");
      return;
    }
    setIsApproving(true);
    try {
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        // Approve action always persists approved workflow state.
        // Partial is a derived line-level status and should not be saved as workflow status.
        WorkflowStatus: DISBURSEMENT_REQUEST_LINE_STATUS.APPROVED,
        Comments: "",
        Records: records,
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        navigate("/pending-workflow", { replace: true });
      } else {
        setError(result.Message ?? "Failed to approve");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownloadAttachment = async () => {
    if (drNumber == null || Number.isNaN(drNumber)) return;
    setError(null);
    setIsDownloadingAttachment(true);
    try {
      //const url = `${API_ENDPOINTS.COST_DR_DOWNLOAD_ATTACHMENT}?drNumber=${encodeURIComponent(drNumber)}`;
      //await downloadFile(url, `dr_${drNumber}_attachment.xlsx`);
      await downloadFile(API_ENDPOINTS.COST_DR_DOWNLOAD_ATTACHMENT, `dr_${drNumber}.zip`, {
        params: { drNumber },
      });
    } catch (caught) {
      const status = (caught as { response?: { status?: number } })?.response?.status;
      const message = status === 404 ? "No attachment found" : caught instanceof Error ? caught.message : "Failed to download attachment";
      setError(message);
    } finally {
      setIsDownloadingAttachment(false);
    }
  };

  const handleExport = async () => {
    if (drNumber == null || Number.isNaN(drNumber)) return;
    setError(null);
    setIsExporting(true);
    try {
      await downloadFile(API_ENDPOINTS.COST_DR_EXPORT, `dr_${drNumber}.xlsx`, {
        params: { drNumber },
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download export";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReject = async () => {
    if (drNumber == null || Number.isNaN(drNumber) || !dr?.Records?.length) return;
    const comments = rejectComments.trim();
    if (!comments) {
      setError("Please enter comments for rejection.");
      return;
    }
    setError(null);
    setIsRejecting(true);
    try {
      const records = dr.Records.map((row) => {
        const raw = approvedAmountByRecord[row.RecordNumber];
        const payable = row.PayableAmount ?? 0;
        const approved = Number.isNaN(parseAmount(raw)) ? 0 : clampApprovedAmount(parseFloat(raw), payable);
        const status = getLineStatus(approved, payable);
        const remarks = (auditRemarksByRecord[row.RecordNumber] ?? "").trim();
        return { RecordNumber: row.RecordNumber, ApprovedAmount: approved, Status: status, AuditRemarks: remarks };
      });
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.REJECTED,
        Comments: comments,
        Records: records,
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        navigate("/pending-workflow", { replace: true });
      } else {
        setError(result.Message ?? "Failed to reject");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to reject");
    } finally {
      setIsRejecting(false);
    }
  };

  if (isBorrower) return null;

  const formatNumber = (n: number) => (n != null && !Number.isNaN(n) ? n.toLocaleString() : "—");
  const cell = (v: string | number | null | undefined) => (v != null && String(v).trim() !== "" ? String(v) : "—");
  const renderPartyCell = (row: DisbursementRequestCostRecordDto) => {
    const name = cell(row.PartyName);
    const gstn = cell(row.PartyGSTN);
    const pan = cell(row.PartyPAN);
    const email = cell(row.PartyEmail);
    const mobile = cell(row.PartyMobile);
    const line2 = [gstn, pan].filter((x) => x !== "—").join(" · ") || null;
    const line3 = [email, mobile].filter((x) => x !== "—").join(" · ") || null;
    if (name === "—" && !line2 && !line3) return "—";
    return (
      <span className="d-block small text-break">
        {name !== "—" && name}
        {line2 && (
          <>
            <br />
            {line2}
          </>
        )}
        {line3 && (
          <>
            <br />
            {line3}
          </>
        )}
      </span>
    );
  };
  const renderPoWoCell = (row: DisbursementRequestCostRecordDto) => {
    const po = cell(row.PoWoNumber);
    const order = formatNumber(row.TotalOrderAmount);
    if (po === "—" && order === "—") return "—";
    return <span className="small">{[po, order].filter((x) => x !== "—").join(" / ")}</span>;
  };
  const formatDate = (v: string | null | undefined) => {
    if (v == null || String(v).trim() === "") return "—";
    const s = String(v).trim();
    const dateOnly = s.split("T")[0];
    const [y, m, d] = dateOnly.split("-").map(Number);
    if (y == null || m == null || d == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return s;
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return s;
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatWorkflowDate = (dateValue: string) => {
    if (!dateValue) return "—";
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return dateValue;
    return dt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const renderDocCell = (row: DisbursementRequestCostRecordDto) => {
    const docType = cell(row.DocumentType);
    const docNo = cell(row.DocumentNumber);
    const docDate = formatDate(row.DocumentDate);
    const days = row.PayableDays != null && String(row.PayableDays).trim() !== "" ? String(row.PayableDays) : null;
    const line1Parts = [docType !== "—" ? docType : null, docNo !== "—" ? `#${docNo}` : null, days != null ? `${days} days` : null].filter(Boolean);
    const hasDate = docDate !== "—";
    if (line1Parts.length === 0 && !hasDate) return "—";
    return (
      <span className="small d-block text-break">
        {line1Parts.length > 0 && line1Parts.join(" · ")}
        {line1Parts.length > 0 && hasDate && <br />}
        {hasDate && docDate}
      </span>
    );
  };
  const getApprovedAmountForRow = (row: DisbursementRequestCostRecordDto) => {
    if (isNextApprover && !isWorkflowLocked) {
      const committed = committedApprovedByRecord[row.RecordNumber];
      return typeof committed === "number" && !Number.isNaN(committed) ? committed : 0;
    }
    const a = row.ApprovedAmount;
    return typeof a === "number" && !Number.isNaN(a) ? a : 0;
  };
  const getRowHighlightClass = (row: DisbursementRequestCostRecordDto) => {
    const approved = getApprovedAmountForRow(row);
    const payable = row.PayableAmount ?? 0;
    if (approved <= 0) return "table-danger";
    if (payable > 0 && approved < payable) return "table-warning";
    return "";
  };
  const isAlreadyApproved = Boolean(dr?.ApprovalFlag && ["Y", "A"].includes(dr.ApprovalFlag.trim().toUpperCase()));
  const currentUserRole = (role ?? "").trim();
  const isNextApprover = nextApprovalUserRole != null && currentUserRole === (nextApprovalUserRole ?? "").trim();
  const isWorkflowLocked = isAlreadyApproved || !isNextApprover;

  return (
    <div className="manage-dr-page">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-shrink-0">
        <h2 className="h5 mb-0">Manage Disbursement Request</h2>
        <div className="d-flex gap-2">
          {dr && (
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowWorkflowHistoryDetails((prev) => !prev)}>
              {showWorkflowHistoryDetails ? "Hide workflow history" : "Show workflow history"}
            </button>
          )}
          {dr && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleDownloadAttachment}
              disabled={isDownloadingAttachment}
              aria-label="Download DR attachment"
            >
              {isDownloadingAttachment ? "Downloading..." : "Download Attachment"}
            </button>
          )}
          {dr && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleExport}
              disabled={isExporting}
              aria-label="Download DR as Excel"
            >
              {isExporting ? "Downloading..." : "Export Excel"}
            </button>
          )}
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/pending-workflow")}>
            Back to Pending Workflow
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger flex-shrink-0">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading disbursement request...</div>
      ) : dr ? (
        <div className="manage-dr-content d-flex flex-column flex-grow-1 min-h-0">
          <div className="card mb-3 flex-shrink-0">
            <div className="card-body py-2">
              <p className="mb-1 small">
                <strong>DR #</strong> {cell(dr.Number)}
                <span className="text-muted mx-2">·</span>
                <strong>Project</strong> {cell(dr.ProjectNumber)}
                <span className="text-muted mx-2">·</span>
                <strong>Year / month</strong> {cell(dr.YearMonth)}
              </p>
              <p className="mb-0 small">
                <strong>Remarks</strong> {cell(dr.Remarks)}
                <span className="text-muted mx-2">·</span>
                <strong>Status</strong>{" "}
                {(() => {
                  const caption = (dr.LatestWorkflowStatus ?? "").trim();
                  if (caption) return caption;
                  if (!approvalFlag) return "—";
                  switch (approvalFlag) {
                    case "S":
                      return "Submitted for Approval";
                    case "R":
                      return "Rejected";
                    case "A":
                    case "Y":
                      return "Approved";
                    default:
                      return approvalFlag;
                  }
                })()}
              </p>
            </div>
          </div>

          {showWorkflowHistoryDetails ? (
            <div className="card mb-3 flex-shrink-0">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h3 className="h6 mb-0">Workflow history</h3>
                <span className="badge bg-secondary">{workflowHistory.length} step(s)</span>
              </div>
              <div className="card-body p-2">
                {isLoadingWorkflowHistory ? (
                  <div className="p-3 text-muted small">Loading workflow history...</div>
                ) : workflowHistory.length === 0 ? (
                  <div className="p-3 text-muted small">No workflow steps recorded yet.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col">Step</th>
                          <th scope="col">Status</th>
                          <th scope="col">User</th>
                          <th scope="col">Role</th>
                          <th scope="col">Timestamp</th>
                          <th scope="col">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowHistory.map((entry, index) => (
                          <tr key={`${entry.SerialNo}-${entry.Date}-${index}`}>
                            <td>{entry.SerialNo}</td>
                            <td>
                              <span className={`badge ${getSalesMisStatusBadgeClass(entry.StatusFlag || "Pending Upload")}`}>
                                {entry.StatusFlag || "—"}
                              </span>
                            </td>
                            <td>{entry.Username || "Unknown user"}</td>
                            <td>{entry.Role || "—"}</td>
                            <td>{formatWorkflowDate(entry.Date)}</td>
                            <td>{entry.Comments?.trim() || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="card mb-3">
            <div className="card-header bg-light py-2 d-flex align-items-center">
              <h3 className="h6 mb-0">Workflow</h3>
              {isWorkflowLocked && <span className="badge bg-secondary ms-2">Approved</span>}
            </div>
            <div className="card-body py-3">
              {isNextApprover && !isWorkflowLocked && (
                <p className="small text-muted mb-2">
                  Edit <strong>Approved amt</strong> (0 to payable) and <strong>Audit remarks</strong> per line. When approved amount ≠ payable, audit
                  remarks are mandatory. Status: A = full, R = reject (0), P = partial.
                </p>
              )}
              <div className="d-flex flex-wrap gap-3 align-items-end">
                <button type="button" className="btn btn-success" onClick={handleApprove} disabled={isApproving || isRejecting || isWorkflowLocked}>
                  {isApproving ? "Approving..." : "Approve"}
                </button>
                <div className="flex-grow-1" style={{ minWidth: "200px" }}>
                  <label htmlFor="drRejectComments" className="form-label small text-muted mb-1">
                    Rejection comments (required to reject)
                  </label>
                  <textarea
                    id="drRejectComments"
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Enter comments for rejection..."
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    disabled={isApproving || isRejecting || isWorkflowLocked}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={isApproving || isRejecting || !rejectComments.trim() || isWorkflowLocked}
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>

          <div className="card mb-3 cost-lines-card flex-grow-1 min-h-0 d-flex flex-column">
            <div className="card-body cost-lines-card-body d-flex flex-column flex-grow-1 min-h-0">
              <h3 className="h6 card-title mb-3 flex-shrink-0">Cost lines</h3>
              <div className="cost-lines-table-wrapper flex-grow-1 min-h-0">
                <div className="cost-lines-scroll" role="region" aria-label="Cost lines table">
                  <table className="table table-sm table-bordered table-striped align-middle small cost-lines-table">
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: "44px" }}>Row</th>
                        <th style={{ minWidth: "72px" }}>Building</th>
                        <th style={{ minWidth: "40px" }}>Category</th>
                        <th style={{ minWidth: "60px" }}>Sub category</th>
                        <th style={{ minWidth: "160px" }}>Party</th>
                        <th style={{ minWidth: "100px" }}>Cost reason</th>
                        <th style={{ minWidth: "100px" }}>PO/WO · Order</th>
                        <th style={{ minWidth: "140px" }}>Document</th>
                        <th style={{ minWidth: "80px" }}>Document amt</th>
                        <th style={{ minWidth: "72px" }}>GST amt</th>
                        <th style={{ minWidth: "72px" }}>Total amt</th>
                        <th style={{ minWidth: "72px" }}>TDS amt</th>
                        <th style={{ minWidth: "80px" }}>Advance adj.</th>
                        <th style={{ minWidth: "72px" }}>Retention</th>
                        <th style={{ minWidth: "72px" }}>Other ded.</th>
                        <th style={{ minWidth: "80px" }}>Payable amt</th>
                        <th style={{ minWidth: "100px" }}>Approved amt</th>
                        <th style={{ minWidth: "88px" }}>Outstanding</th>
                        <th style={{ minWidth: "180px" }}>Audit remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dr.Records ?? []).map((row: DisbursementRequestCostRecordDto) => (
                        <tr key={row.RecordNumber} className={getRowHighlightClass(row)}>
                          <td>{row.RecordNumber}</td>
                          <td className="cost-lines-cell-wrap">{cell(row.Building)}</td>
                          <td className="cost-lines-cell-wrap">{cell(row.Category)}</td>
                          <td className="cost-lines-cell-wrap">{cell(row.SubCategory)}</td>
                          <td className="cost-lines-cell-wrap">{renderPartyCell(row)}</td>
                          <td className="cost-lines-cell-wrap">{cell(row.CostReason)}</td>
                          <td className="cost-lines-cell-wrap">{renderPoWoCell(row)}</td>
                          <td className="cost-lines-cell-wrap">{renderDocCell(row)}</td>
                          <td>{formatNumber(row.DocumentAmount)}</td>
                          <td>{formatNumber(row.GstAmount)}</td>
                          <td>{formatNumber(row.TotalAmount)}</td>
                          <td>{formatNumber(row.TdsAmount)}</td>
                          <td>{formatNumber(row.AdvanceAdjustedAmount)}</td>
                          <td>{formatNumber(row.RetentionAmount)}</td>
                          <td>{formatNumber(row.AnyOtherDeductions)}</td>
                          <td>{formatNumber(row.PayableAmount)}</td>
                          <td>
                            {isNextApprover && !isWorkflowLocked ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="form-control form-control-sm"
                                style={{ maxWidth: "120px" }}
                                value={approvedAmountByRecord[row.RecordNumber] ?? ""}
                                onChange={(e) => setApprovedAmountForRecord(row.RecordNumber, e.target.value)}
                                onBlur={(e) => {
                                  const num = parseAmount(e.target.value);
                                  const payable = row.PayableAmount ?? 0;
                                  const clamped = Number.isNaN(num) ? 0 : clampApprovedAmount(num, payable);
                                  setApprovedAmountByRecord((prev) => ({ ...prev, [row.RecordNumber]: String(clamped) }));
                                  setCommittedApprovedByRecord((prev) => ({ ...prev, [row.RecordNumber]: clamped }));
                                }}
                                aria-label={`Approved amount for row ${row.RecordNumber} (0 to ${row.PayableAmount ?? 0})`}
                              />
                            ) : (
                              formatNumber(row.ApprovedAmount)
                            )}
                          </td>
                          <td>{formatNumber(row.OutstandingAmount)}</td>
                          <td className="audit-remarks-cell" style={{ minWidth: "180px" }}>
                            {isNextApprover && !isWorkflowLocked ? (
                              <textarea
                                rows={2}
                                className={`form-control form-control-sm ${(() => {
                                  const raw = approvedAmountByRecord[row.RecordNumber];
                                  const payable = row.PayableAmount ?? 0;
                                  const approved = Number.isNaN(parseAmount(raw)) ? 0 : clampApprovedAmount(parseFloat(raw), payable);
                                  const remarks = (auditRemarksByRecord[row.RecordNumber] ?? "").trim();
                                  const needsRemarks = approved > 0 && approved !== payable;
                                  return needsRemarks && !remarks ? "border-danger" : "";
                                })()}`}
                                value={auditRemarksByRecord[row.RecordNumber] ?? ""}
                                onChange={(e) => setAuditRemarksByRecord((prev) => ({ ...prev, [row.RecordNumber]: e.target.value }))}
                                placeholder="Required if approved ≠ payable"
                                aria-label={`Audit remarks for row ${row.RecordNumber}`}
                              />
                            ) : (
                              <span className="small">{cell(row.AuditRemarks)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(!dr.Records || dr.Records.length === 0) && <p className="text-muted mb-0">No cost lines.</p>}
            </div>
          </div>
        </div>
      ) : !error && !isLoading ? (
        <div className="text-muted">No disbursement request found.</div>
      ) : null}
    </div>
  );
}

export default ManageDisbursementRequestPage;
