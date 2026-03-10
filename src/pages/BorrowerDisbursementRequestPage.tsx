import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost, downloadFile } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type {
  DisbursementRequestCostRecordDto,
  DisbursementRequestDto,
  DisbursementRequestWorkflowUpdateRequest,
  PendingDisbursementRequestDto,
  ValidationResponse,
} from "../api/contracts/types";
import { SALES_MIS_WORKFLOW_STATUS } from "../constants/salesMisWorkflowStatus";

function BorrowerDisbursementRequestPage() {
  const { drNumber: drNumberParam } = useParams<"drNumber">();
  const location = useLocation();
  const navigate = useNavigate();
  const role = getUserRole();
  const pendingDrFromNav = (location.state as { pendingDr?: PendingDisbursementRequestDto } | null)?.pendingDr;
  const isBorrower = role === "B";

  const [dr, setDr] = useState<DisbursementRequestDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [borrowerRemarks, setBorrowerRemarks] = useState("");
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadUploading, setReuploadUploading] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [reuploadSuccess, setReuploadSuccess] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [recallInProgress, setRecallInProgress] = useState(false);
  const [lastKnownWorkflowStatus, setLastKnownWorkflowStatus] = useState<string | null>(null);
  /** Per-line borrower remarks (editable only when that row has audit remarks). */
  const [borrowerRemarksByRecord, setBorrowerRemarksByRecord] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isBorrower) {
      navigate("/dashboard", { replace: true });
    }
  }, [isBorrower, navigate]);

  useEffect(() => {
    if (!isBorrower || drNumberParam == null) return;

    let isMounted = true;
    const drNumber = Number(drNumberParam);
    if (Number.isNaN(drNumber)) {
      setError("Invalid DR number");
      setIsLoading(false);
      return;
    }

    const fetchDr = async () => {
      setError(null);
      try {
        const data = await apiGet<DisbursementRequestDto>(API_ENDPOINTS.COST_DR, {
          params: { drNumber },
        });
        if (!isMounted) return;
        setDr(data);
        setBorrowerRemarks(data.Remarks ?? "");
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

  // Initialize per-line borrower remarks from DR records
  useEffect(() => {
    if (!dr?.Records?.length) {
      setBorrowerRemarksByRecord({});
      return;
    }
    const next: Record<number, string> = {};
    for (const row of dr.Records) {
      next[row.RecordNumber] = row.Remarks != null ? String(row.Remarks) : "";
    }
    setBorrowerRemarksByRecord(next);
  }, [dr?.Records]);

  const drNumber = drNumberParam != null ? Number(drNumberParam) : null;
  const approvalFlag = (dr?.ApprovalFlag ?? "").trim().toUpperCase();
  const workflowStatusCaption = (dr?.LatestWorkflowStatus ?? lastKnownWorkflowStatus ?? pendingDrFromNav?.LatestWorkflowStatus ?? "").trim();

  const isSubmittedForApproval = approvalFlag === "S" || workflowStatusCaption.toLowerCase() === "submitted for approval";
  const isRejected = approvalFlag === "R" || workflowStatusCaption.toLowerCase() === "rejected";
  const isApproved = approvalFlag === "A" || approvalFlag === "Y" || workflowStatusCaption.toLowerCase() === "approved";
  // Rejected DRs can be re-submitted (e.g. after re-upload); only block when pending approval or already approved
  const isSubmittedOrFinal = isSubmittedForApproval || isApproved || ["S", "A", "Y"].includes(approvalFlag);
  const canSubmitForApproval = Boolean(dr && !isSubmittedOrFinal);
  const uploadSectionLocked = isSubmittedForApproval;

  const handleSubmitForApproval = async () => {
    if (!canSubmitForApproval || drNumber == null || submitInProgress || !dr?.Records?.length) return;
    setError(null);
    setSubmitInProgress(true);
    try {
      const records = dr.Records.map((row) => ({
        RecordNumber: row.RecordNumber,
        ApprovedAmount: row.ApprovedAmount ?? 0,
        Status: row.Status ?? "",
        AuditRemarks: (row.AuditRemarks ?? "").trim() || undefined,
        Remarks: (borrowerRemarksByRecord[row.RecordNumber] ?? "").trim() || undefined,
      }));
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL,
        Comments: "",
        Records: records,
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        setLastKnownWorkflowStatus("Submitted for Approval");
        const updated = await apiGet<DisbursementRequestDto>(API_ENDPOINTS.COST_DR, { params: { drNumber } });
        setDr(updated);
      } else {
        setError(result.Message ?? "Submit for approval failed.");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to submit for approval";
      setError(message);
    } finally {
      setSubmitInProgress(false);
    }
  };

  const handleRecall = async () => {
    if (drNumber == null || !isSubmittedForApproval || recallInProgress) return;
    setError(null);
    setRecallInProgress(true);
    try {
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.RECALLED,
        Comments: "",
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        setLastKnownWorkflowStatus("Recalled");
        const updated = await apiGet<DisbursementRequestDto>(API_ENDPOINTS.COST_DR, { params: { drNumber } });
        setDr(updated);
      } else {
        setError(result.Message ?? "Recall failed.");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to recall";
      setError(message);
    } finally {
      setRecallInProgress(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setReuploadFile(file);
    setReuploadError(null);
    setReuploadSuccess(null);
  };

  const handleReupload = async () => {
    if (!isBorrower || drNumber == null || !reuploadFile || reuploadUploading) return;

    const name = reuploadFile.name ?? "";
    const isZipOrRar = /\.(zip|rar)$/i.test(name);
    if (!isZipOrRar) {
      setReuploadError("Only .zip and .rar files are allowed for attachments.");
      return;
    }

    setReuploadError(null);
    setReuploadSuccess(null);
    setReuploadUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", reuploadFile);
      const url = `${API_ENDPOINTS.COST_DR_ATTACHMENT}?drNumber=${encodeURIComponent(drNumber)}`;
      const result = await apiPost<{ FileName?: string; Path?: string }>(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const uploadedName = result.FileName || "attachment";
      setReuploadSuccess(`Attachment uploaded successfully as ${uploadedName}.`);
      setReuploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to upload attachment";
      setReuploadError(message);
    } finally {
      setReuploadUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!isBorrower || drNumber == null || deleteInProgress) return;
    if (!window.confirm("Are you sure you want to delete this disbursement request? This action cannot be undone.")) {
      return;
    }

    setError(null);
    setDeleteInProgress(true);
    try {
      const url = `${API_ENDPOINTS.COST_DR_DELETE}?drNumber=${encodeURIComponent(drNumber)}`;
      const result = await apiPost<ValidationResponse>(url);
      if (result.IsValid) {
        const message = result.Message?.trim() || "Disbursement request deleted successfully.";
        alert(message);
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.Message ?? "Failed to delete disbursement request");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to delete disbursement request";
      setError(message);
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleDownloadAttachment = async () => {
    if (drNumber == null || Number.isNaN(drNumber)) return;
    setError(null);
    setIsDownloadingAttachment(true);
    try {
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

  if (!isBorrower) return null;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">Your Disbursement Request</h2>
        <div className="d-flex gap-2">
          {dr && (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleDownloadAttachment}
              disabled={isDownloadingAttachment}
              aria-label="Download DR attachment"
            >
              {isDownloadingAttachment ? "Downloading..." : "Download Attachment"}
            </button>
          )}
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={deleteInProgress}>
            {deleteInProgress ? "Deleting..." : "Delete DR"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading disbursement request...</div>
      ) : dr ? (
        <div className="d-flex flex-column flex-grow-1 min-h-0">
          <div className="card mb-3 flex-shrink-0">
            <div className="card-body py-2">
              <p className="mb-1 small">
                <strong>DR #</strong> {dr.Number}
                <span className="text-muted mx-2">·</span>
                <strong>Project</strong> {dr.ProjectNumber}
              </p>
              <p className="mb-0 small">
                <strong>Your remarks</strong>{" "}
                <textarea
                  className="form-control form-control-sm mt-1"
                  rows={2}
                  value={borrowerRemarks}
                  onChange={(e) => setBorrowerRemarks(e.target.value)}
                  placeholder={isRejected ? "Add remarks explaining the updated submission..." : "Optional remarks"}
                />
              </p>
            </div>
          </div>

          <div className="card mb-3 flex-shrink-0">
            <div className="card-header bg-light py-2">
              <h3 className="h6 mb-0">Upload / Re-upload &amp; Submit</h3>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitForApproval}
                  disabled={!canSubmitForApproval || submitInProgress || uploadSectionLocked}
                >
                  {submitInProgress ? "Submitting..." : "Submit for approval"}
                </button>
                {isSubmittedForApproval && (
                  <button type="button" className="btn btn-outline-warning" onClick={handleRecall} disabled={recallInProgress}>
                    {recallInProgress ? "Recalling..." : "Recall"}
                  </button>
                )}
              </div>
              <p className="text-muted small mb-2">
                {uploadSectionLocked
                  ? "Submitted for approval. Use Recall to bring it back for edits or upload a new attachment."
                  : "Submit this disbursement request for approver review. If the DR has been rejected, you can upload or re-upload an attachment (previous attachment will be deleted)."}
              </p>
              <hr className="my-3" />
              <p className="text-muted small mb-2">
                If the DR has been rejected, you can upload or re-upload an attachment. The previous attachment will be deleted and replaced with the new one.
              </p>
              {reuploadError ? <div className="alert alert-danger mb-3">{reuploadError}</div> : null}
              {reuploadSuccess ? <div className="alert alert-success mb-3">{reuploadSuccess}</div> : null}
              <div className="mb-3">
                <label htmlFor="borrower-dr-file" className="form-label">
                  {isRejected ? "New attachment" : "Re-upload attachment (only when rejected)"}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  id="borrower-dr-file"
                  accept=".zip,.rar"
                  onChange={handleFileChange}
                  disabled={reuploadUploading || uploadSectionLocked}
                />
                {reuploadFile && (
                  <div className="form-text mt-1">
                    Selected: {reuploadFile.name} ({(reuploadFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleReupload}
                disabled={!reuploadFile || reuploadUploading || !isRejected || uploadSectionLocked}
              >
                {reuploadUploading ? "Uploading..." : "Upload attachment"}
              </button>
              {uploadSectionLocked && (
                <p className="text-muted small mt-2 mb-0">Submit and re-upload are locked while the DR is submitted for approval.</p>
              )}
              {!isRejected && !uploadSectionLocked && (
                <p className="text-muted small mt-2 mb-0">
                  Re-upload is enabled only when the disbursement request has been rejected by the approver.
                </p>
              )}
            </div>
          </div>

          <div className="card mb-3 cost-lines-card flex-grow-1 min-h-0 d-flex flex-column">
            <div className="card-body cost-lines-card-body d-flex flex-column flex-grow-1 min-h-0">
              <h3 className="h6 card-title mb-3 flex-shrink-0">Cost lines &amp; audit remarks from approver</h3>
              {dr.Records && dr.Records.length > 0 ? (
                <div className="cost-lines-table-wrapper flex-grow-1 min-h-0">
                  <div className="cost-lines-scroll" role="region" aria-label="Cost lines table">
                    <table className="table table-sm table-bordered table-striped align-middle small cost-lines-table">
                      <thead className="table-light">
                        <tr>
                          <th style={{ minWidth: "44px" }}>Row</th>
                          <th style={{ minWidth: "72px" }}>Building</th>
                          <th style={{ minWidth: "40px" }}>Category</th>
                          <th style={{ minWidth: "60px" }}>Sub category</th>
                          <th style={{ minWidth: "100px" }}>Party</th>
                          <th style={{ minWidth: "100px" }}>Cost reason</th>
                          <th style={{ minWidth: "140px" }}>Document</th>
                          <th style={{ minWidth: "80px" }}>Document amt</th>
                          <th style={{ minWidth: "72px" }}>Total amt</th>
                          <th style={{ minWidth: "80px" }}>Payable amt</th>
                          <th style={{ minWidth: "100px" }}>Approved amt</th>
                          <th style={{ minWidth: "180px" }}>Audit remarks</th>
                          <th style={{ minWidth: "180px" }}>Your remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dr.Records as DisbursementRequestCostRecordDto[]).map((row) => {
                          const hasAuditRemarks = (row.AuditRemarks ?? "").trim() !== "";
                          return (
                            <tr key={row.RecordNumber}>
                              <td>{row.RecordNumber}</td>
                              <td className="cost-lines-cell-wrap">{row.Building ?? "—"}</td>
                              <td className="cost-lines-cell-wrap">{row.Category ?? "—"}</td>
                              <td className="cost-lines-cell-wrap">{row.SubCategory ?? "—"}</td>
                              <td className="cost-lines-cell-wrap">{row.PartyName ?? "—"}</td>
                              <td className="cost-lines-cell-wrap">{row.CostReason ?? "—"}</td>
                              <td className="cost-lines-cell-wrap">
                                {[row.DocumentType, row.DocumentNumber ? `#${row.DocumentNumber}` : ""].filter(Boolean).join(" ") || "—"}
                              </td>
                              <td>{(row.DocumentAmount ?? 0).toLocaleString()}</td>
                              <td>{(row.TotalAmount ?? 0).toLocaleString()}</td>
                              <td>{(row.PayableAmount ?? 0).toLocaleString()}</td>
                              <td>{(row.ApprovedAmount ?? 0).toLocaleString()}</td>
                              <td className="audit-remarks-cell">{row.AuditRemarks ?? "—"}</td>
                              <td className="audit-remarks-cell">
                                {hasAuditRemarks ? (
                                  <textarea
                                    rows={2}
                                    className="form-control form-control-sm"
                                    value={borrowerRemarksByRecord[row.RecordNumber] ?? ""}
                                    onChange={(e) => setBorrowerRemarksByRecord((prev) => ({ ...prev, [row.RecordNumber]: e.target.value }))}
                                    placeholder="Optional response to audit remarks"
                                    aria-label={`Your remarks for row ${row.RecordNumber}`}
                                    disabled={uploadSectionLocked}
                                  />
                                ) : (
                                  (borrowerRemarksByRecord[row.RecordNumber] ?? row.Remarks ?? "—")
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-muted mb-0">No cost lines.</p>
              )}
            </div>
          </div>
        </div>
      ) : !error && !isLoading ? (
        <div className="text-muted">No disbursement request found.</div>
      ) : null}
    </div>
  );
}

export default BorrowerDisbursementRequestPage;
