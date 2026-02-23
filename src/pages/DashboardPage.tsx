import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { getUserRole } from "../api/http";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto } from "../api/contracts/types";
import { getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";

function DashboardPage() {
  const [records, setRecords] = useState<PendingSalesMisRecordDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const role = getUserRole();
  const isBorrower = role === "B";

  const handleNavigate = (record: PendingSalesMisRecordDto, path: string) => {
    sessionStorage.setItem("pendingMisRecord", JSON.stringify(record));
    navigate(path, { state: record });
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h5 mb-0">Pending Sales MIS</h2>
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
                    <td>{record.LatestWorkflowUser?.trim() + " (" + record.LatestWorkflowUserRole?.trim() + ")" || "—"}</td>
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
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => handleNavigate(record, "/review-sales-mis")}>
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
    </div>
  );
}

export default DashboardPage;
