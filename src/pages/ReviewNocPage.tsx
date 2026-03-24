import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, downloadFile } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingNocRequestDto, UnitNocWorkflowUpdateRequest, ValidationResponse } from "../api/contracts/types";
import { getCurrentUser, getUserRole } from "../api/http";
import { SALES_MIS_WORKFLOW_STATUS, getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";

type NocReviewRowState = {
  commentary: string;
  actionComments: string;
  attachment: File | null;
};

const getRowKey = (row: PendingNocRequestDto) => `${row.YearMonth}-${row.ProjecNumber}-${row.AssetNumber}-${row.UnitUniqueNumber}`;
const isSubmittedForApproval = (status?: string | null) => (status ?? "").trim().toLowerCase() === "submitted for approval";
const isApproved = (status?: string | null) => (status ?? "").trim().toLowerCase() === "approved";
const isRejected = (status?: string | null) => (status ?? "").trim().toLowerCase() === "rejected";

function ReviewNocPage() {
  const navigate = useNavigate();
  const role = getUserRole();
  const isBorrower = role === "B";
  const currentUser = (getCurrentUser() ?? "").trim().toLowerCase();

  const [records, setRecords] = useState<PendingNocRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, NocReviewRowState>>({});
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [downloadLoading, setDownloadLoading] = useState<Record<string, boolean>>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRecords = async () => {
      setError(null);
      try {
        const data = await apiGet<PendingNocRequestDto[]>(API_ENDPOINTS.NOC_PENDING_REQUESTS);
        if (!isMounted) return;
        const resolved = data ?? [];
        setRecords(resolved);
        setRowState(
          resolved.reduce<Record<string, NocReviewRowState>>((acc, row) => {
            acc[getRowKey(row)] = {
              commentary: row.Remarks || row.LatestWorkflowComments || "",
              actionComments: "",
              attachment: null,
            };
            return acc;
          }, {}),
        );
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load pending NOC requests";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecords();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateRowState = (key: string, updater: (current: NocReviewRowState) => NocReviewRowState) => {
    setRowState((prev) => {
      const current = prev[key] ?? { commentary: "", actionComments: "", attachment: null };
      return { ...prev, [key]: updater(current) };
    });
  };

  const orderedRecords = useMemo(
    () => [...records].sort((a, b) => b.YearMonth - a.YearMonth || a.ProjecNumber - b.ProjecNumber || a.UnitUniqueNumber - b.UnitUniqueNumber),
    [records],
  );

  const validateBorrowerAttachment = (file: File | null, hasExistingAttachment: boolean) => {
    if (!file && !hasExistingAttachment) return "Attachment is required.";
    if (!file) return null;
    const isZipOrRar = /\.(zip|rar)$/i.test(file.name ?? "");
    return isZipOrRar ? null : "Only .zip and .rar files are allowed for attachments.";
  };

  const updateRowAfterSuccess = (target: PendingNocRequestDto, nextStatus: string, nextComments: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        getRowKey(r) === getRowKey(target)
          ? {
              ...r,
              LatestWorkflowStatus: nextStatus,
              LatestWorkflowComments: nextComments,
              Remarks: nextComments,
            }
          : r,
      ),
    );
  };

  const handleBorrowerAction = async (row: PendingNocRequestDto, workflowStatus: string) => {
    const key = getRowKey(row);
    const state = rowState[key] ?? { commentary: "", actionComments: "", attachment: null };

    if (workflowStatus === SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL) {
      const hasExistingAttachment = Boolean((row.AttachmentFileName ?? "").trim());
      const attachmentError = validateBorrowerAttachment(state.attachment, hasExistingAttachment);
      if (attachmentError) {
        setError(attachmentError);
        setActionSuccess(null);
        return;
      }
    }

    setError(null);
    setActionSuccess(null);
    setRowLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const payload: UnitNocWorkflowUpdateRequest = {
        YearMonth: row.YearMonth,
        ProjectNumber: row.ProjecNumber,
        AssetNumber: row.AssetNumber,
        UnitUniqueNumber: row.UnitUniqueNumber,
        WorkflowStatus: workflowStatus,
        Comments: state.commentary,
      };
      const workflowResult = await apiPost<ValidationResponse>(API_ENDPOINTS.NOC_WORKFLOW_UPDATE, payload);
      if (!workflowResult.IsValid) {
        setError(workflowResult.Message || "NOC workflow update failed.");
        return;
      }

      if (workflowStatus === SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL && state.attachment) {
        const formData = new FormData();
        formData.append("file", state.attachment);
        const attachmentUrl = `${API_ENDPOINTS.NOC_ATTACHMENT}?yearMonth=${encodeURIComponent(row.YearMonth)}&projectNumber=${encodeURIComponent(
          row.ProjecNumber,
        )}&assetNumber=${encodeURIComponent(row.AssetNumber)}&unitUniqueNumber=${encodeURIComponent(row.UnitUniqueNumber)}`;
        await apiPost<{ FileName?: string; Path?: string }>(attachmentUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      const nextStatusCaption =
        workflowStatus === SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL ? "Submitted for Approval" : "Recalled";
      updateRowAfterSuccess(row, nextStatusCaption, state.commentary);
      setActionSuccess(`Unit ${row.UnitNumber || row.UnitUniqueNumber} updated successfully.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to update NOC record";
      setError(message);
    } finally {
      setRowLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleApproverAction = async (row: PendingNocRequestDto, workflowStatus: string) => {
    const key = getRowKey(row);
    const state = rowState[key] ?? { commentary: "", actionComments: "", attachment: null };
    const comments = state.actionComments.trim();
    const isRejectAction = workflowStatus === SALES_MIS_WORKFLOW_STATUS.REJECTED;
    if (isRejectAction && !comments) {
      setError("Comments are required for reject action.");
      setActionSuccess(null);
      return;
    }

    setError(null);
    setActionSuccess(null);
    setRowLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const payload: UnitNocWorkflowUpdateRequest = {
        YearMonth: row.YearMonth,
        ProjectNumber: row.ProjecNumber,
        AssetNumber: row.AssetNumber,
        UnitUniqueNumber: row.UnitUniqueNumber,
        WorkflowStatus: workflowStatus,
        Comments: comments,
      };
      const workflowResult = await apiPost<ValidationResponse>(API_ENDPOINTS.NOC_WORKFLOW_UPDATE, payload);
      if (!workflowResult.IsValid) {
        setError(workflowResult.Message || "NOC workflow update failed.");
        return;
      }

      const nextStatusCaption = workflowStatus === SALES_MIS_WORKFLOW_STATUS.APPROVED ? "Approved" : "Rejected";
      updateRowAfterSuccess(row, nextStatusCaption, comments);
      setActionSuccess(`Unit ${row.UnitNumber || row.UnitUniqueNumber} updated successfully.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to update NOC record";
      setError(message);
    } finally {
      setRowLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDownloadAttachment = async (row: PendingNocRequestDto) => {
    const key = getRowKey(row);
    const fileName = (row.AttachmentFileName ?? "").trim();
    if (!fileName) return;

    setError(null);
    setDownloadLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const url = `${API_ENDPOINTS.NOC_DOWNLOAD_ATTACHMENT}?yearMonth=${encodeURIComponent(row.YearMonth)}&projectNumber=${encodeURIComponent(
        row.ProjecNumber,
      )}&assetNumber=${encodeURIComponent(row.AssetNumber)}&unitUniqueNumber=${encodeURIComponent(row.UnitUniqueNumber)}`;
      await downloadFile(url, fileName);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download attachment";
      setError(message);
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const formatMoney = (value: number | null | undefined) => {
    const n = typeof value === "number" ? value : null;
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">Review NOC Records</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/pending-workflow")}>
          Back to Pending Workflow
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {actionSuccess ? <div className="alert alert-success">{actionSuccess}</div> : null}

      {loading ? (
        <p className="text-muted mb-0">Loading pending NOC requests...</p>
      ) : (
        <div className="card">
          <div className="card-body">
            <h3 className="h6 card-title mb-3">Pending NOC records</h3>
            {orderedRecords.length === 0 ? (
              <p className="text-muted mb-0">No pending NOC records.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Sales Total</th>
                      <th scope="col">MSP Variance</th>
                      <th scope="col">Status</th>
                      <th scope="col">{isBorrower ? "Commentary" : "Comments"}</th>
                      <th scope="col">Download Attachment</th>
                      {isBorrower ? <th scope="col">Upload Attachment</th> : null}
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedRecords.map((row) => {
                      const key = getRowKey(row);
                      const state = rowState[key] ?? { commentary: "", actionComments: "", attachment: null };
                      const inProgress = rowLoading[key] ?? false;
                      const downloadInProgress = downloadLoading[key] ?? false;
                      const lastActionUser = (row.LatestWorkflowUser ?? "").trim().toLowerCase();
                      const lockedBySameUserOnFinalState =
                        (isApproved(row.LatestWorkflowStatus) || isRejected(row.LatestWorkflowStatus)) &&
                        !!currentUser &&
                        lastActionUser === currentUser;
                      const rowLocked = isBorrower && isSubmittedForApproval(row.LatestWorkflowStatus);
                      const canSubmit = isBorrower && !rowLocked && !lockedBySameUserOnFinalState;
                      const canRecall = isBorrower && rowLocked && !lockedBySameUserOnFinalState;
                      const hasAttachment = Boolean((row.AttachmentFileName ?? "").trim());
                      return (
                        <tr key={key}>
                          <td>
                            <div>{row.ProjectName || "—"}</div>
                            <div className="text-muted small">{row.ProjecNumber}</div>
                          </td>
                          <td>
                            <div>{row.UnitNumber || "—"}</div>
                            <div className="text-muted small">
                              {row.Phase || "—"} / {row.Building || "—"} / {row.Floor || "—"}
                            </div>
                          </td>
                          <td>
                            <div>{row.CustomerName || "—"}</div>
                            <div className="text-muted small">{row.CustomerKycMobile || row.CustomerKycEmail || "—"}</div>
                          </td>
                          <td>{formatMoney(row.SalesTotalAmount)}</td>
                          <td>
                            <span className={`badge ${row.MspVarianceAmount < 0 ? "text-bg-danger" : "text-bg-success"}`}>
                              {formatMoney(row.MspVarianceAmount)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getSalesMisStatusBadgeClass(row.LatestWorkflowStatus)}`}>
                              {row.LatestWorkflowStatus || "—"}
                            </span>
                          </td>
                          <td style={{ minWidth: 240 }}>
                            {isBorrower ? (
                              <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={state.commentary}
                                placeholder="Enter commentary"
                                disabled={inProgress || rowLocked || lockedBySameUserOnFinalState}
                                onChange={(e) => updateRowState(key, (current) => ({ ...current, commentary: e.target.value }))}
                              />
                            ) : (
                              <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={state.actionComments}
                                placeholder="Enter comments"
                                disabled={inProgress || lockedBySameUserOnFinalState}
                                onChange={(e) => updateRowState(key, (current) => ({ ...current, actionComments: e.target.value }))}
                              />
                            )}
                          </td>
                          <td style={{ minWidth: 220 }}>
                            {hasAttachment ? (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={downloadInProgress}
                                onClick={() => handleDownloadAttachment(row)}
                              >
                                {downloadInProgress ? "Downloading..." : "Download"}
                              </button>
                            ) : (
                              <span className="text-muted">No attachment</span>
                            )}
                          </td>
                          {isBorrower ? (
                            <td style={{ minWidth: 260 }}>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept=".zip,.rar,application/zip,application/x-rar-compressed,application/vnd.rar"
                                disabled={inProgress || rowLocked || lockedBySameUserOnFinalState}
                                onChange={(e) => updateRowState(key, (current) => ({ ...current, attachment: e.target.files?.[0] ?? null }))}
                              />
                              {state.attachment ? <div className="form-text">{state.attachment.name}</div> : row.AttachmentFileName ? <div className="form-text">Current: {row.AttachmentFileName}</div> : null}
                            </td>
                          ) : null}
                          <td style={{ minWidth: isBorrower ? 250 : 220 }}>
                            {isBorrower ? (
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={inProgress || !canSubmit}
                                  onClick={() => handleBorrowerAction(row, SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL)}
                                >
                                  {inProgress ? "Processing..." : "Submit for Approval"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-sm"
                                  disabled={inProgress || !canRecall}
                                  onClick={() => handleBorrowerAction(row, SALES_MIS_WORKFLOW_STATUS.RECALLED)}
                                >
                                  {inProgress ? "Processing..." : "Recall"}
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  disabled={inProgress || lockedBySameUserOnFinalState}
                                  onClick={() => handleApproverAction(row, SALES_MIS_WORKFLOW_STATUS.APPROVED)}
                                >
                                  {inProgress ? "Processing..." : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  disabled={inProgress || lockedBySameUserOnFinalState}
                                  onClick={() => handleApproverAction(row, SALES_MIS_WORKFLOW_STATUS.REJECTED)}
                                >
                                  {inProgress ? "Processing..." : "Reject"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewNocPage;
