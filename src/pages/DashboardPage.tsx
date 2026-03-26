import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto, PendingDisbursementRequestDto, PendingNocRequestDto } from "../api/contracts/types";
import { getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";

function DashboardPage() {
  const [records, setRecords] = useState<PendingSalesMisRecordDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDr, setPendingDr] = useState<PendingDisbursementRequestDto[]>([]);
  const [pendingDrError, setPendingDrError] = useState<string | null>(null);
  const [pendingDrLoading, setPendingDrLoading] = useState(true);
  const [pendingNocRequests, setPendingNocRequests] = useState<PendingNocRequestDto[]>([]);
  const [pendingNocError, setPendingNocError] = useState<string | null>(null);
  const [pendingNocLoading, setPendingNocLoading] = useState(true);
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

    const fetchPendingNocRequests = async () => {
      setPendingNocError(null);
      try {
        const data = await apiGet<PendingNocRequestDto[]>(API_ENDPOINTS.NOC_PENDING_REQUESTS);
        if (isMounted) {
          setPendingNocRequests(data ?? []);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load pending NOC requests";
        if (isMounted) {
          setPendingNocError(message);
        }
      } finally {
        if (isMounted) {
          setPendingNocLoading(false);
        }
      }
    };

    fetchPendingNocRequests();

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

  const formatMoney = (value: number | null | undefined) => {
    const n = typeof value === "number" ? value : null;
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="d-flex flex-column gap-4">
      <section className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 px-2 px-md-3 py-2 border-bottom">
            <h2 className="h5 mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-bar-chart-line text-primary" aria-hidden />
              <span>Pending Sales MIS</span>
            </h2>
            <button type="button" className="btn btn-outline-primary btn-sm align-self-end" onClick={() => navigate("/download-sales-mis")}>
              Download existing MIS
            </button>
          </div>

          <div className="p-2 p-md-3 pt-2">
            {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

            {isLoading ? (
              <div className="text-muted">Loading pending MIS...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Project #</th>
                      <th scope="col">Project</th>
                      <th scope="col">Borrower</th>
                      <th scope="col">Last Mis Month</th>
                      <th scope="col">Due Month</th>
                      <th scope="col">Last Action By</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-end" style={{ minWidth: "160px" }}>
                        Action
                      </th>
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
                          <td className="text-end">
                            <div className="d-flex justify-content-end">
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
                            </div>
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
      </section>

      <section className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 px-2 px-md-3 py-2 border-bottom">
            <h2 className="h5 mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-cash-coin text-primary" aria-hidden />
              <span>Pending Disbursement Requests</span>
            </h2>
            <div className="d-flex gap-2 flex-wrap justify-content-end align-self-end">
              {isBorrower ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/add-disbursement-request")}>
                  New DR
                </button>
              ) : null}
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate("/approved-disbursement-requests")}>
                Approved DRs
              </button>
            </div>
          </div>

          <div className="p-2 p-md-3 pt-2">
            {pendingDrError ? <div className="alert alert-danger mb-3">{pendingDrError}</div> : null}

            {pendingDrLoading ? (
              <div className="text-muted">Loading pending disbursement requests...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">DR #</th>
                      <th scope="col">Project #</th>
                      <th scope="col">Project</th>
                      <th scope="col">Borrower</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last Action By</th>
                      <th scope="col">Created</th>
                      <th scope="col" className="text-end" style={{ minWidth: "140px" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDr.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No pending disbursement requests.
                        </td>
                      </tr>
                    ) : (
                      pendingDr.map((dr) => (
                        <tr key={dr.DrNumber}>
                          <td>{dr.DrNumber}</td>
                          <td>{dr.ProjectNumber || "—"}</td>
                          <td>{dr.ProjectName}</td>
                          <td>
                            <div>{dr.BorrowerName}</div>
                          </td>
                          <td>
                            <span className={`badge ${getSalesMisStatusBadgeClass(dr.LatestWorkflowStatus)}`}>{dr.LatestWorkflowStatus || "—"}</span>
                          </td>
                          <td>
                            {dr.LatestWorkflowUser?.trim() ? `${dr.LatestWorkflowUser.trim()} (${dr.LatestWorkflowUserRole?.trim() || "—"})` : "—"}
                          </td>
                          <td>{dr.CreatedDate || "—"}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end">
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
                                  Review DR
                                </button>
                              )}
                            </div>
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
      </section>

      <section className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 px-2 px-md-3 py-2 border-bottom">
            <h2 className="h5 mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-check text-primary" aria-hidden />
              <span>Pending NOC Requests</span>
            </h2>
            {isBorrower ? (
              <button type="button" className="btn btn-primary btn-sm align-self-end" onClick={() => navigate("/request-noc")}>
                Request for NOC
              </button>
            ) : null}
          </div>

          <div className="p-2 p-md-3 pt-2">
            {pendingNocError ? <div className="alert alert-danger mb-3">{pendingNocError}</div> : null}

            {pendingNocLoading ? (
              <div className="text-muted">Loading pending NOC requests...</div>
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
                      <th scope="col">Last Action By</th>
                      <th scope="col">Remarks</th>
                      <th scope="col" className="text-end" style={{ minWidth: "140px" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingNocRequests.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          No pending NOC requests.
                        </td>
                      </tr>
                    ) : (
                      pendingNocRequests.map((noc) => (
                        <tr key={`${noc.UnitUniqueNumber}-${noc.YearMonth}-${noc.NocNumber ?? ""}`}>
                          <td>
                            <div>{noc.ProjectName}</div>
                            <div className="text-muted small">{noc.ProjecNumber}</div>
                          </td>
                          <td>
                            <div>{noc.UnitNumber || "—"}</div>
                            <div className="text-muted small">
                              {noc.Phase || "—"} / {noc.Building || "—"} / {noc.Floor || "—"}
                            </div>
                          </td>
                          <td>
                            <div>{noc.CustomerName || "—"}</div>
                            <div className="text-muted small">{noc.CustomerKycMobile || noc.CustomerKycEmail || "—"}</div>
                          </td>
                          <td>{formatMoney(noc.SalesTotalAmount)}</td>
                          <td>
                            <span className={`badge ${noc.MspVarianceAmount < 0 ? "text-bg-danger" : "text-bg-success"}`}>
                              {formatMoney(noc.MspVarianceAmount)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getSalesMisStatusBadgeClass(noc.LatestWorkflowStatus)}`}>
                              {noc.LatestWorkflowStatus || "—"}
                            </span>
                          </td>
                          <td>
                            {noc.LatestWorkflowUser?.trim() ? `${noc.LatestWorkflowUser.trim()} (${noc.LatestWorkflowUserRole?.trim() || "—"})` : "—"}
                          </td>
                          <td>{noc.Remarks || noc.LatestWorkflowComments || "—"}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end">
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate("/review-noc")}>
                                Review NOC
                              </button>
                            </div>
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
      </section>
    </div>
  );
}

export default DashboardPage;
