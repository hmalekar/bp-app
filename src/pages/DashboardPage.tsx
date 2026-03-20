import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto, PendingDisbursementRequestDto } from "../api/contracts/types";
import { getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";

function DashboardPage() {
  const [records, setRecords] = useState<PendingSalesMisRecordDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDr, setPendingDr] = useState<PendingDisbursementRequestDto[]>([]);
  const [pendingDrError, setPendingDrError] = useState<string | null>(null);
  const [pendingDrLoading, setPendingDrLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchPendingMis = async () => {
      setError(null);
      try {
        const data = await apiGet<PendingSalesMisRecordDto[]>(API_ENDPOINTS.GET_PENDING_MIS);
        if (isMounted) {
          setRecords(data);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load pending MIS";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPendingMis();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPendingDr = async () => {
      setPendingDrError(null);
      try {
        const data = await apiGet<PendingDisbursementRequestDto[]>(API_ENDPOINTS.COST_PENDING_DR);
        if (isMounted) {
          setPendingDr(data);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load pending disbursement requests";
        if (isMounted) {
          setPendingDrError(message);
        }
      } finally {
        if (isMounted) {
          setPendingDrLoading(false);
        }
      }
    };

    fetchPendingDr();

    return () => {
      isMounted = false;
    };
  }, []);

  const role = getUserRole();
  const isBorrower = role === "B";

  const handleNavigate = (record: PendingSalesMisRecordDto, path: string) => {
    sessionStorage.setItem("pendingMisRecord", JSON.stringify(record));
    navigate(path, { state: record });
  };

  const isReviewLocked = (status?: string | null) => {
    const normalizedStatus = status?.trim() ?? "";
    return normalizedStatus === "Pending Upload" || normalizedStatus === "Pending Submission for Approval";
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h5 mb-0">Pending Sales MIS</h2>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate("/download-sales-mis")}>
          Download existing MIS
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading pending MIS...</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col">Project #</th>
                <th scope="col">Project</th>
                <th scope="col">Borrower</th>
                <th scope="col">Last Mis Month</th>
                <th scope="col">Due Month</th>
                <th scope="col">Last Action By</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No pending MIS records.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={`${record.ProjectNumber}-${record.BorrowerCode}`}>
                    <td>{record.ProjectNumber}</td>
                    <td>{record.ProjectName}</td>
                    <td>
                      <div>{record.BorrowerName}</div>
                      {/* <div className="text-muted small">{record.BorrowerCode}</div> */}
                    </td>
                    <td>{record.LastMisMonth}</td>
                    <td>{record.NewDueMonthV ?? record.NewDueMonth}</td>
                    <td>
                      {record.LatestWorkflowUser?.trim()
                        ? `${record.LatestWorkflowUser.trim()} (${record.LatestWorkflowUserRole?.trim() || "—"})`
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge ${getSalesMisStatusBadgeClass(record.LatestWorkflowStatus)}`}>
                        {record.LatestWorkflowStatus || "—"}
                      </span>
                    </td>
                    <td>
                      {isBorrower ? (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handleNavigate(record, "/upload-sales-mis")}>
                          Upload Sales MIS
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleNavigate(record, "/review-sales-mis")}
                          disabled={isReviewLocked(record.LatestWorkflowStatus)}
                        >
                          Review MIS
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Disbursement Requests */}
      <div className="mt-5">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 mb-0">Pending Disbursement Requests</h2>
          <div className="d-flex gap-2">
            {isBorrower ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate("/add-disbursement-request")}>
                Add
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate("/approved-disbursement-requests")}
            >
              Approved DRs
            </button>
          </div>
        </div>

        {pendingDrError ? <div className="alert alert-danger">{pendingDrError}</div> : null}

        {pendingDrLoading ? (
          <div className="text-muted">Loading pending disbursement requests...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th scope="col">DR #</th>
                  <th scope="col">Project</th>
                  <th scope="col">Borrower</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last Action By</th>
                  <th scope="col">Created</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingDr.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No pending disbursement requests.
                    </td>
                  </tr>
                ) : (
                  pendingDr.map((dr) => (
                    <tr key={dr.DrNumber}>
                      <td>{dr.DrNumber}</td>
                      <td>
                        <div>{dr.ProjectName}</div>
                        <div className="text-muted small">{dr.ProjectNumber}</div>
                      </td>
                      <td>
                        <div>{dr.BorrowerName}</div>
                        <div className="text-muted small">{dr.BorrowerCode}</div>
                      </td>
                      <td>
                        <span className={`badge ${getSalesMisStatusBadgeClass(dr.LatestWorkflowStatus)}`}>{dr.LatestWorkflowStatus || "—"}</span>
                      </td>
                      <td>{dr.LatestWorkflowUser?.trim() ? `${dr.LatestWorkflowUser.trim()} (${dr.LatestWorkflowUserRole?.trim() || "—"})` : "—"}</td>
                      <td>{dr.CreatedDate || "—"}</td>
                      <td>
                        {isBorrower ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() =>
                              navigate(`/my-disbursement-request/${dr.DrNumber}`, {
                                state: { pendingDr: dr },
                              })
                            }
                          >
                            View / Edit
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() =>
                              navigate(`/manage-disbursement-request/${dr.DrNumber}`, {
                                state: { nextApprovalUserRole: dr.NextApprovalUserRole },
                              })
                            }
                          >
                            Action
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
