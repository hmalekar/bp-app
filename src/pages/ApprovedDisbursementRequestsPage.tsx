import { useEffect, useMemo, useState } from "react";
import { apiGet, downloadFile } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { ApprovedDisbursementRequestDto } from "../api/contracts/types";
import { useNavigate } from "react-router-dom";

type ApprovedDrGroup = {
  ProjectNumber: number;
  ProjectName: string;
  requests: ApprovedDisbursementRequestDto[];
};

function ApprovedDisbursementRequestsPage() {
  const navigate = useNavigate();
  const [approvedDrs, setApprovedDrs] = useState<ApprovedDisbursementRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingDrNumber, setDownloadingDrNumber] = useState<number | null>(null);
  const [downloadingAttachmentDrNumber, setDownloadingAttachmentDrNumber] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchApprovedDrs = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const data = await apiGet<ApprovedDisbursementRequestDto[]>(API_ENDPOINTS.COST_APPROVED_DR);
        if (isMounted) setApprovedDrs(data);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load approved DRs";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchApprovedDrs();
    return () => {
      isMounted = false;
    };
  }, []);

  const groupedByProject = useMemo<ApprovedDrGroup[]>(() => {
    const map = new Map<string, ApprovedDrGroup>();
    for (const dr of approvedDrs) {
      const key = String(dr.ProjectNumber);
      const existing = map.get(key);
      if (existing) {
        existing.requests.push(dr);
      } else {
        map.set(key, {
          ProjectNumber: dr.ProjectNumber,
          ProjectName: dr.ProjectName,
          requests: [dr],
        });
      }
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        requests: [...g.requests].sort((a, b) => b.DrNumber - a.DrNumber),
      }))
      .sort((a, b) => a.ProjectNumber - b.ProjectNumber);
  }, [approvedDrs]);

  const formatMoney = (value: number | null | undefined) => {
    const n = typeof value === "number" ? value : null;
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDownloadDr = async (drNumber: number) => {
    if (downloadingDrNumber === drNumber) return;
    setError(null);
    setDownloadingDrNumber(drNumber);
    try {
      await downloadFile(API_ENDPOINTS.COST_DR_EXPORT, `dr_${drNumber}.xlsx`, { params: { drNumber } });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download DR";
      setError(message);
    } finally {
      setDownloadingDrNumber(null);
    }
  };

  const handleDownloadAttachment = async (drNumber: number) => {
    if (downloadingAttachmentDrNumber === drNumber) return;
    setError(null);
    setDownloadingAttachmentDrNumber(drNumber);
    try {
      await downloadFile(API_ENDPOINTS.COST_DR_DOWNLOAD_ATTACHMENT, `dr_${drNumber}.zip`, { params: { drNumber } });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download DR attachments";
      setError(message);
    } finally {
      setDownloadingAttachmentDrNumber(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4 mis-page">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h5 mb-0">Approved Disbursement Requests</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/pending-workflow")}>
          Back to Pending Workflow
        </button>
      </div>

      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading approved DRs...</div>
      ) : approvedDrs.length === 0 ? (
        <div className="text-muted">No approved disbursement requests found.</div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {groupedByProject.map((group) => (
            <div key={group.ProjectNumber} className="card shadow-sm border-0">
              <div className="card-header bg-white border-0">
                <div className="d-flex justify-content-between align-items-baseline gap-2">
                  <div>
                    <div className="text-muted small">Project #{group.ProjectNumber}</div>
                    <div className="h6 mb-0">{group.ProjectName}</div>
                  </div>
                  <div className="text-muted small">{group.requests.length} DRs</div>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">DR #</th>
                        <th scope="col">Year-Month</th>
                        <th scope="col">Remarks</th>
                        <th scope="col">Payable Amount</th>
                        <th scope="col">Approved Amount</th>
                        <th scope="col" style={{ width: 320 }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.requests.map((dr) => (
                        <tr key={dr.DrNumber}>
                          <td>{dr.DrNumber}</td>
                          <td>{dr.YearMonth}</td>
                          <td>{dr.Remarks || "—"}</td>
                          <td>{formatMoney(dr.PayableAmount)}</td>
                          <td>{formatMoney(dr.ApprovedAmount)}</td>
                          <td>
                            <div className="d-flex gap-2 flex-nowrap text-nowrap">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDownloadDr(dr.DrNumber)}
                                disabled={downloadingDrNumber === dr.DrNumber}
                              >
                                {downloadingDrNumber === dr.DrNumber ? "Downloading..." : "Download DR"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleDownloadAttachment(dr.DrNumber)}
                                disabled={downloadingAttachmentDrNumber === dr.DrNumber}
                              >
                                {downloadingAttachmentDrNumber === dr.DrNumber ? "Downloading..." : "Download Attachment"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovedDisbursementRequestsPage;

