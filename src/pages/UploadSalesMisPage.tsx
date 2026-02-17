import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { downloadFile, apiPost } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto, SalesMisRequestPayload, ImportSalesMisRequest, SalesMisImportResult } from "../api/contracts/types";

const formatMonthLabel = (record: PendingSalesMisRecordDto) => record.NewDueMonthV ?? `${record.NewDueMonth}`;

function UploadSalesMisPage() {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<SalesMisImportResult | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!resolvedRecord || !selectedFile) return;
    setError(null);
    setIsUploading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const requestPayload: ImportSalesMisRequest = {
        ProjectNumber: resolvedRecord.ProjectNumber,
        YearMonth: resolvedRecord.NewDueMonth,
        PreviousYearMonth: resolvedRecord.LastSubmittedMonth,
      };

      // [FromUri] means parameters should be in query string, not FormData
      const result = await apiPost<SalesMisImportResult>(API_ENDPOINTS.SALES_MIS_IMPORT, formData, {
        params: requestPayload,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImportResult(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to upload MIS file";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!resolvedRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Upload Sales MIS</h2>
          <p className="text-muted">No pending MIS record was provided.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h5 mb-1">Upload Sales MIS</h2>
              <div className="text-muted">
                {resolvedRecord.ProjectName} · {resolvedRecord.BorrowerName}
              </div>
              <div className="text-muted small">
                Project #{resolvedRecord.ProjectNumber} · Borrower {resolvedRecord.BorrowerCode}
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
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? "Downloading..." : "Download MIS Excel"}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h3 className="h6 mb-3">Upload Updated Sales MIS</h3>
          <div className="mb-3">
            <label htmlFor="misFile" className="form-label">
              Select Excel File
            </label>
            <input type="file" className="form-control" id="misFile" accept=".xlsx,.xls" onChange={handleFileChange} disabled={isUploading} />
            {selectedFile && (
              <div className="form-text mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          <button className="btn btn-success" onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload MIS File"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h3 className="h6 mb-3">Import Results</h3>
            <div className="mb-3">
              <div className={`alert ${importResult.Success ? "alert-success" : "alert-warning"}`}>
                <strong>Status:</strong> {importResult.Success ? "Success" : "Completed with Errors"}
                <br />
                <strong>Imported Count:</strong> {importResult.ImportedCount}
                {importResult.Errors.length > 0 && (
                  <>
                    <br />
                    <strong>Errors:</strong> {importResult.Errors.length} row(s) with validation errors
                  </>
                )}
              </div>
            </div>
            {importResult.Errors.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-bordered table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>Asset Number</th>
                      <th>Asset Name</th>
                      <th>Unit Number</th>
                      <th>Phase</th>
                      <th>Building</th>
                      <th>Floor</th>
                      <th>Validation Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.Errors.map((error, index) => (
                      <tr key={index}>
                        <td>{error.AssetNumber}</td>
                        <td>{error.AssetName}</td>
                        <td>{error.UnitNumber}</td>
                        <td>{error.Phase}</td>
                        <td>{error.Building}</td>
                        <td>{error.Floor}</td>
                        <td className="text-danger">{error.ValidationErrors}</td>
                      </tr>
                    ))}
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

export default UploadSalesMisPage;
