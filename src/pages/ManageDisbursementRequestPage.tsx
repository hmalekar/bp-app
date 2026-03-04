import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import { SALES_MIS_WORKFLOW_STATUS } from "../constants/salesMisWorkflowStatus";
import type {
  DisbursementRequestCostRecordDto,
  DisbursementRequestDto,
  DisbursementRequestWorkflowUpdateRequest,
  ValidationResponse,
} from "../api/contracts/types";

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
  const [rejectComments, setRejectComments] = useState("");

  const role = getUserRole();
  const isBorrower = role === "B";

  useEffect(() => {
    if (isBorrower) {
      navigate("/dashboard", { replace: true });
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

  const drNumber = drNumberParam != null ? Number(drNumberParam) : null;

  const handleApprove = async () => {
    if (drNumber == null || Number.isNaN(drNumber)) return;
    setError(null);
    setIsApproving(true);
    try {
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.APPROVED,
        Comments: "",
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.Message ?? "Failed to approve");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (drNumber == null || Number.isNaN(drNumber)) return;
    const comments = rejectComments.trim();
    if (!comments) {
      setError("Please enter comments for rejection.");
      return;
    }
    setError(null);
    setIsRejecting(true);
    try {
      const payload: DisbursementRequestWorkflowUpdateRequest = {
        DrNumber: drNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.REJECTED,
        Comments: comments,
      };
      const result = await apiPost<ValidationResponse>(API_ENDPOINTS.COST_DR_WORKFLOW_UPDATE, payload);
      if (result.IsValid) {
        navigate("/dashboard", { replace: true });
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
  const isAlreadyApproved = Boolean(dr?.ApprovalFlag && ["Y", "A"].includes(dr.ApprovalFlag.trim().toUpperCase()));
  const currentUserRole = (role ?? "").trim();
  const isNextApprover = nextApprovalUserRole != null && currentUserRole === (nextApprovalUserRole ?? "").trim();
  const isWorkflowLocked = isAlreadyApproved || !isNextApprover;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">Manage Disbursement Request</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading disbursement request...</div>
      ) : dr ? (
        <>
          <div className="card mb-3">
            <div className="card-body py-2">
              <p className="mb-0 small">
                <strong>DR #</strong> {cell(dr.Number)}
                <span className="text-muted mx-2">·</span>
                <strong>Project</strong> {cell(dr.ProjectNumber)}
                <span className="text-muted mx-2">·</span>
                <strong>Year / month</strong> {cell(dr.YearMonth)}
                <span className="text-muted mx-2">·</span>
                <strong>Remarks</strong> {cell(dr.Remarks)}
              </p>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header bg-light py-2 d-flex align-items-center">
              <h3 className="h6 mb-0">Workflow</h3>
              {isWorkflowLocked && <span className="badge bg-secondary ms-2">Approved</span>}
            </div>
            <div className="card-body py-3">
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

          <div className="card mb-3">
            <div className="card-body">
              <h3 className="h6 card-title mb-3">Cost lines</h3>
              <div className="table-responsive">
                <table className="table table-sm table-bordered table-striped align-middle small">
                  <thead className="table-light">
                    <tr>
                      <th>Row</th>
                      <th>Building</th>
                      <th>Category</th>
                      <th>Sub category</th>
                      <th>Party name</th>
                      <th>Party GSTN</th>
                      <th>Party PAN</th>
                      <th>Party email</th>
                      <th>Party mobile</th>
                      <th>Cost reason</th>
                      <th>PO / WO #</th>
                      <th>Total order</th>
                      <th>Doc type</th>
                      <th>Doc #</th>
                      <th>Doc date</th>
                      <th>Payable days</th>
                      <th>Document amt</th>
                      <th>GST amt</th>
                      <th>Total amt</th>
                      <th>TDS amt</th>
                      <th>Advance adj.</th>
                      <th>Retention</th>
                      <th>Other ded.</th>
                      <th>Payable amt</th>
                      <th>Approved amt</th>
                      <th>Outstanding</th>
                      <th>Status</th>
                      <th>Validation</th>
                      <th>Audit remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dr.Records ?? []).map((row: DisbursementRequestCostRecordDto) => (
                      <tr key={row.RecordNumber}>
                        <td>{row.RecordNumber}</td>
                        <td>{cell(row.Building)}</td>
                        <td>{cell(row.Category)}</td>
                        <td>{cell(row.SubCategory)}</td>
                        <td>{cell(row.PartyName)}</td>
                        <td>{cell(row.PartyGSTN)}</td>
                        <td>{cell(row.PartyPAN)}</td>
                        <td>{cell(row.PartyEmail)}</td>
                        <td>{cell(row.PartyMobile)}</td>
                        <td>{cell(row.CostReason)}</td>
                        <td>{cell(row.PoWoNumber)}</td>
                        <td>{formatNumber(row.TotalOrderAmount)}</td>
                        <td>{cell(row.DocumentType)}</td>
                        <td>{cell(row.DocumentNumber)}</td>
                        <td>{cell(row.DocumentDate)}</td>
                        <td>{cell(row.PayableDays)}</td>
                        <td>{formatNumber(row.DocumentAmount)}</td>
                        <td>{formatNumber(row.GstAmount)}</td>
                        <td>{formatNumber(row.TotalAmount)}</td>
                        <td>{formatNumber(row.TdsAmount)}</td>
                        <td>{formatNumber(row.AdvanceAdjustedAmount)}</td>
                        <td>{formatNumber(row.RetentionAmount)}</td>
                        <td>{formatNumber(row.AnyOtherDeductions)}</td>
                        <td>{formatNumber(row.PayableAmount)}</td>
                        <td>{formatNumber(row.ApprovedAmount)}</td>
                        <td>{formatNumber(row.OutstandingAmount)}</td>
                        <td>{cell(row.Status)}</td>
                        <td className="text-danger small">{cell(row.ValidationErrors)}</td>
                        <td className="small">{cell(row.AuditRemarks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!dr.Records || dr.Records.length === 0) && <p className="text-muted mb-0">No cost lines.</p>}
            </div>
          </div>
        </>
      ) : !error && !isLoading ? (
        <div className="text-muted">No disbursement request found.</div>
      ) : null}
    </div>
  );
}

export default ManageDisbursementRequestPage;
