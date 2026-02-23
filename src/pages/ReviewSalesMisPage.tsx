import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPost, downloadFile } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import { SALES_MIS_WORKFLOW_STATUS, getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";
import type {
  PendingSalesMisRecordDto,
  SalesMisRequestPayload,
  SalesMisComparisonResultDto,
  SalesMisWorkflowUpdateRequest,
  ValidationResponse,
} from "../api/contracts/types";

const formatMonthLabel = (record: PendingSalesMisRecordDto) => record.NewDueMonthV ?? `${record.NewDueMonth}`;

const formatNumber = (n: number) => (n === 0 ? "0" : n.toLocaleString());

/** Extract error message from caught error; prefer ValidationResponse.Message from API if present. */
function getWorkflowErrorMessage(caught: unknown, fallback: string): string {
  if (caught && typeof caught === "object" && "response" in caught) {
    const err = caught as { response?: { data?: { Message?: string } } };
    if (typeof err.response?.data?.Message === "string" && err.response.data.Message) {
      return err.response.data.Message;
    }
  }
  return caught instanceof Error ? caught.message : fallback;
}

function ReviewSalesMisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingRecord = location.state as PendingSalesMisRecordDto | null;
  const resolvedRecord = useMemo(() => {
    if (pendingRecord) return pendingRecord;
    const stored = sessionStorage.getItem("pendingMisRecord");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as PendingSalesMisRecordDto;
    } catch {
      return null;
    }
  }, [pendingRecord]);

  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [comparison, setComparison] = useState<SalesMisComparisonResultDto | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectComments, setRejectComments] = useState("");

  useEffect(() => {
    if (!resolvedRecord) return;
    let isMounted = true;
    setError(null);
    setIsLoadingComparison(true);
    const fetchComparison = async () => {
      try {
        const data = await apiGet<SalesMisComparisonResultDto>(API_ENDPOINTS.SALES_MIS_COMPARE, {
          params: {
            yearMonth: resolvedRecord.NewDueMonth,
            projectNumber: resolvedRecord.ProjectNumber,
            previousYearMonth: resolvedRecord.LastSubmittedMonth,
          },
        });
        if (isMounted) setComparison(data);
      } catch (caught) {
        if (isMounted) setError(caught instanceof Error ? caught.message : "Failed to load comparison");
      } finally {
        if (isMounted) setIsLoadingComparison(false);
      }
    };
    fetchComparison();
    return () => {
      isMounted = false;
    };
  }, [resolvedRecord]);

  const handleDownload = async () => {
    if (!resolvedRecord) return;
    setError(null);
    setIsDownloading(true);
    try {
      const payload: SalesMisRequestPayload = {
        YearMonth: resolvedRecord.NewDueMonth,
        ProjectNumber: resolvedRecord.ProjectNumber,
        PreviousYearMonth: resolvedRecord.LastSubmittedMonth,
      };
      const monthLabel = formatMonthLabel(resolvedRecord).replace(/[\s/]+/g, "-");
      const fileName = `sales-mis-${resolvedRecord.ProjectNumber}-${monthLabel}.xlsx`;
      await downloadFile(API_ENDPOINTS.SALES_MIS_EXPORT, fileName, { params: payload });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download MIS";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApprove = async () => {
    if (!resolvedRecord) return;
    setError(null);
    setIsApproving(true);
    try {
      const request: SalesMisWorkflowUpdateRequest = {
        YearMonth: resolvedRecord.NewDueMonth,
        ProjectNumber: resolvedRecord.ProjectNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.APPROVED,
        Comments: "",
      };
      const response = await apiPost<ValidationResponse>(API_ENDPOINTS.SALES_MIS_WORKFLOW_UPDATE, request);
      if (!response.IsValid) {
        setError(response.Message || "Failed to approve");
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(getWorkflowErrorMessage(caught, "Failed to approve"));
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!resolvedRecord) return;
    const comments = rejectComments.trim();
    if (!comments) {
      setError("Please enter comments for rejection.");
      return;
    }
    setError(null);
    setIsRejecting(true);
    try {
      const request: SalesMisWorkflowUpdateRequest = {
        YearMonth: resolvedRecord.NewDueMonth,
        ProjectNumber: resolvedRecord.ProjectNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.REJECTED,
        Comments: comments,
      };
      const response = await apiPost<ValidationResponse>(API_ENDPOINTS.SALES_MIS_WORKFLOW_UPDATE, request);
      if (!response.IsValid) {
        setError(response.Message || "Failed to reject");
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(getWorkflowErrorMessage(caught, "Failed to reject"));
    } finally {
      setIsRejecting(false);
    }
  };

  const role = getUserRole();
  const isBorrower = role === "B";

  if (isBorrower) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Review Sales MIS</h2>
          <p className="text-muted">This page is for approvers only. Borrowers cannot review MIS here.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!resolvedRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Review Sales MIS</h2>
          <p className="text-muted">No pending MIS record was provided.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = resolvedRecord.LatestWorkflowStatus?.trim() || "Pending Upload";
  //const statusFromApi = resolvedRecord.LatestWorkflowStatus?.trim();
  //const isFinalStatus = statusFromApi === "Approved" || statusFromApi === "Rejected";
  const nextRole = (resolvedRecord.NextApprovalUserRole ?? "").trim();
  const lastRole = (resolvedRecord.LatestWorkflowUserRole ?? "").trim();
  const canApprove = role !== null && role !== undefined && role === nextRole && role !== lastRole;
  const buttonsLocked = !canApprove;

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => navigate("/dashboard")}>
          ← Back to dashboard
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h5 mb-1">Review Sales MIS</h2>
              <div className="text-muted">
                {resolvedRecord.ProjectName} · {resolvedRecord.BorrowerName}
              </div>
              <div className="text-muted small">
                Project #{resolvedRecord.ProjectNumber} · Borrower {resolvedRecord.BorrowerCode}
              </div>
              <div className="mt-2">
                <span className={`badge ${getSalesMisStatusBadgeClass(currentStatus)}`}>Status: {currentStatus}</span>
              </div>
            </div>
            <div className="text-end">
              <div className="text-muted small">Working month</div>
              <div>{formatMonthLabel(resolvedRecord)}</div>
              <div className="text-muted small mt-2">Last submitted</div>
              <div>{resolvedRecord.LastSubmittedMonth}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <p className="mb-3">Download the MIS Excel for the selected project and month, then upload it back once reviewed.</p>
          {error ? <div className="alert alert-danger mb-3">{error}</div> : null}
          <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading || buttonsLocked}>
            {isDownloading ? "Downloading..." : "Download MIS Excel"}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-light">
          <h3 className="h6 mb-0">Workflow</h3>
        </div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <div>
              <button type="button" className="btn btn-success" onClick={handleApprove} disabled={isApproving || isRejecting || buttonsLocked}>
                {isApproving ? "Approving..." : "Approve"}
              </button>
            </div>
            <div className="flex-grow-1" style={{ minWidth: "280px" }}>
              <label htmlFor="rejectComments" className="form-label small text-muted">
                Rejection comments (required to reject)
              </label>
              <textarea
                id="rejectComments"
                className="form-control"
                rows={2}
                placeholder="Enter comments for rejection..."
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                disabled={isApproving || isRejecting || buttonsLocked}
              />
            </div>
            <div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReject}
                disabled={isApproving || isRejecting || !rejectComments.trim() || buttonsLocked}
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoadingComparison ? (
        <div className="card shadow-sm border-0">
          <div className="card-body text-muted">Loading comparison...</div>
        </div>
      ) : comparison ? (
        <>
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light">
              <h3 className="h6 mb-0">Aggregated comparison</h3>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Units sold during period</div>
                    <div className="fw-semibold">{formatNumber(comparison.UnitsSoldDuringPeriod)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Units cancelled during period</div>
                    <div className="fw-semibold">{formatNumber(comparison.UnitsCancelledDuringPeriod)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Total demand till date</div>
                    <div className="fw-semibold">{formatNumber(comparison.TotalDemandTillDate)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Total collection till date</div>
                    <div className="fw-semibold">{formatNumber(comparison.TotalCollectionTillDate)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Total sales value till date</div>
                    <div className="fw-semibold">{formatNumber(comparison.TotalSalesValueTillDate)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Incremental demand</div>
                    <div className="fw-semibold text-success">+{formatNumber(comparison.IncrementalDemand)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Reduction in demand</div>
                    <div className="fw-semibold text-danger">−{formatNumber(comparison.ReductionInDemand)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Incremental collection</div>
                    <div className="fw-semibold text-success">+{formatNumber(comparison.IncrementalCollection)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Reduction in collection</div>
                    <div className="fw-semibold text-danger">−{formatNumber(comparison.ReductionInCollection)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Incremental sales value</div>
                    <div className="fw-semibold text-success">+{formatNumber(comparison.IncrementalSalesValue)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Reduction in sales value</div>
                    <div className="fw-semibold text-danger">−{formatNumber(comparison.ReductionInSalesValue)}</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="border rounded p-2 bg-white">
                    <div className="text-muted small">Units with warnings</div>
                    <div className="fw-semibold">{formatNumber(comparison.TotalUnitsWithWarnings)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {comparison.UnitsWithWarnings && comparison.UnitsWithWarnings.length > 0 && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h3 className="h6 mb-0">Warnings</h3>
                <span className="badge bg-warning text-dark">{comparison.UnitsWithWarnings.length} unit(s)</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Unit #</th>
                        <th scope="col">Warnings</th>
                        <th scope="col">Commentary</th>
                        <th scope="col" className="text-center">
                          Has commentary
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.UnitsWithWarnings.map((w, i) => (
                        <tr key={`${w.UnitNumber}-${w.UnitUniqueNumber}-${i}`}>
                          <td>{w.UnitNumber}</td>
                          <td className="text-warning">{w.Warnings || "—"}</td>
                          <td>{w.Commentary || "—"}</td>
                          <td className="text-center">
                            {w.HasCommentary ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(comparison.AmountChanges?.length ?? 0) > 0 && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light">
                <h3 className="h6 mb-0">Amount changes</h3>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Unit #</th>
                        <th scope="col">Previous demand</th>
                        <th scope="col">Current demand</th>
                        <th scope="col">Demand diff</th>
                        <th scope="col">Previous received</th>
                        <th scope="col">Current received</th>
                        <th scope="col">Received diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.AmountChanges!.map((ac, i) => (
                        <tr key={`${ac.UnitNumber}-${ac.UnitUniqueNumber}-${i}`}>
                          <td>{ac.UnitNumber}</td>
                          <td>{formatNumber(ac.PreviousDemand)}</td>
                          <td>{formatNumber(ac.CurrentDemand)}</td>
                          <td className={ac.DemandDifference >= 0 ? "text-success" : "text-danger"}>
                            {ac.DemandDifference >= 0 ? "+" : ""}
                            {formatNumber(ac.DemandDifference)}
                          </td>
                          <td>{formatNumber(ac.PreviousReceived)}</td>
                          <td>{formatNumber(ac.CurrentReceived)}</td>
                          <td className={ac.ReceivedDifference >= 0 ? "text-success" : "text-danger"}>
                            {ac.ReceivedDifference >= 0 ? "+" : ""}
                            {formatNumber(ac.ReceivedDifference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default ReviewSalesMisPage;
