import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { downloadFile, apiPost } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import { SALES_MIS_WORKFLOW_STATUS, getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";
import type {
  PendingSalesMisRecordDto,
  SalesMisRequestPayload,
  SalesMisImportResult,
  SalesMisRowError,
  ImportSalesMisRequest,
  SalesMisWorkflowUpdateRequest,
  ValidationResponse,
} from "../api/contracts/types";

const formatMonthLabel = (record: PendingSalesMisRecordDto) => record.NewDueMonthV ?? `${record.NewDueMonth}`;

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

  // Local record so we can update status after submit/recall without reload
  const [record, setRecord] = useState<PendingSalesMisRecordDto | null>(null);
  useEffect(() => {
    if (resolvedRecord) setRecord(resolvedRecord);
  }, [resolvedRecord]);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdatingCommentary, setIsUpdatingCommentary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalling, setIsRecalling] = useState(false);
  const [importResult, setImportResult] = useState<SalesMisImportResult | null>(null);

  const currentStatus = record?.LatestWorkflowStatus?.trim() || "Pending Upload";
  const isPendingUpload = currentStatus === "Pending Upload";
  const isSubmittedForApproval = currentStatus === "Submitted for Approval";
  const isApproved = currentStatus === "Approved";
  const isRejected = currentStatus === "Rejected";

  // Enable upload section for: pending upload, pending submission for approval, recalled, rejected
  const isUploadEnabled =
    currentStatus === "Pending Upload" ||
    currentStatus === "Pending Submission for Approval" ||
    currentStatus === "Recalled" ||
    currentStatus === "Rejected";

  // Show recall button if status is not approved or rejected
  const showRecallButton = !isApproved && !isRejected;

  const displayRecord = record ?? resolvedRecord;

  const handleDownload = async () => {
    if (!displayRecord) return;
    setError(null);
    setIsDownloading(true);
    try {
      const payload: SalesMisRequestPayload = {
        YearMonth: displayRecord.NewDueMonth,
        ProjectNumber: displayRecord.ProjectNumber,
        PreviousYearMonth: displayRecord.LastSubmittedMonth,
      };
      const monthLabel = formatMonthLabel(displayRecord).replace(/[\s/]+/g, "-");
      const fileName = `sales-mis-${displayRecord.ProjectNumber}-${monthLabel}.xlsx`;
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

  const handleCommentaryChange = (index: number, value: string) => {
    if (!importResult) return;
    setImportResult({
      ...importResult,
      Errors: importResult.Errors.map((err, i) => (i === index ? { ...err, Commentary: value } : err)),
    });
  };

  const hasValidationErrors = (row: { ValidationErrors?: string }) => Boolean(row.ValidationErrors?.trim());

  const errorRows = importResult?.Errors.filter((row) => hasValidationErrors(row)) ?? [];
  const warningRows = importResult?.Errors.filter((row) => !hasValidationErrors(row)) ?? [];
  const hasErrors = errorRows.length > 0;

  // Check if all warning rows have commentary filled
  const allCommentaryFilled = warningRows.length > 0 && warningRows.every((row) => Boolean(row.Commentary?.trim()));

  const handleImport = async () => {
    if (!displayRecord || !selectedFile) return;
    setError(null);
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await apiPost<SalesMisImportResult>(API_ENDPOINTS.SALES_MIS_IMPORT, formData, {
        params: {
          ProjectNumber: displayRecord.ProjectNumber,
          YearMonth: displayRecord.NewDueMonth,
          PreviousYearMonth: displayRecord.LastSubmittedMonth,
        },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImportResult({
        ...result,
        Errors: result.Errors.map((err) => ({
          ...err,
          Commentary: err.Commentary || "",
        })),
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to import MIS file";
      setError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateCommentary = async () => {
    if (!importResult || !allCommentaryFilled) return;
    setError(null);
    setSuccessMessage(null);
    setIsUpdatingCommentary(true);
    try {
      await apiPost<void, SalesMisRowError[]>(API_ENDPOINTS.SALES_MIS_UPDATE_COMMENTARY, warningRows);
      setError(null);
      setSuccessMessage("Commentary updated successfully.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to update commentary";
      setError(message);
    } finally {
      setIsUpdatingCommentary(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!displayRecord || isSubmittedForApproval) return;
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const validateParams: Pick<ImportSalesMisRequest, "ProjectNumber" | "YearMonth" | "PreviousYearMonth"> = {
        ProjectNumber: displayRecord.ProjectNumber,
        YearMonth: displayRecord.NewDueMonth,
        PreviousYearMonth: displayRecord.LastSubmittedMonth,
      };

      const validateResult = await apiPost<SalesMisImportResult>(API_ENDPOINTS.SALES_MIS_VALIDATE, undefined, {
        params: validateParams,
      });

      const validationErrorsWithCommentary: SalesMisImportResult = {
        ...validateResult,
        Errors: validateResult.Errors.map((err) => ({
          ...err,
          Commentary: err.Commentary || "",
        })),
      };
      setImportResult(validationErrorsWithCommentary);

      if (!validateResult.Success) {
        setError("Validation failed. Please resolve the errors and warnings below before submitting for approval.");
        setSuccessMessage(null);
        return;
      }

      const workflowRequest: SalesMisWorkflowUpdateRequest = {
        YearMonth: displayRecord.NewDueMonth,
        ProjectNumber: displayRecord.ProjectNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL,
        Comments: "",
      };

      const response = await apiPost<ValidationResponse>(API_ENDPOINTS.SALES_MIS_WORKFLOW_UPDATE, workflowRequest);

      if (!response.IsValid) {
        setError(response.Message || "Failed to submit MIS for approval");
        setSuccessMessage(null);
        return;
      }

      setSuccessMessage("MIS has been submitted for approval");
      setError(null);
      setRecord((prev) => (prev ? { ...prev, LatestWorkflowStatus: "Submitted for Approval" } : null));
    } catch (caught) {
      setError(getWorkflowErrorMessage(caught, "Failed to submit MIS for approval"));
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecall = async () => {
    if (!displayRecord) return;
    setError(null);
    setSuccessMessage(null);
    setIsRecalling(true);
    try {
      const request: SalesMisWorkflowUpdateRequest = {
        YearMonth: displayRecord.NewDueMonth,
        ProjectNumber: displayRecord.ProjectNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.RECALLED,
        Comments: "",
      };

      const response = await apiPost<ValidationResponse>(API_ENDPOINTS.SALES_MIS_WORKFLOW_UPDATE, request);

      if (!response.IsValid) {
        setError(response.Message || "Failed to recall MIS");
        setSuccessMessage(null);
        return;
      }

      setSuccessMessage("MIS has been recalled");
      setError(null);
      setRecord((prev) => (prev ? { ...prev, LatestWorkflowStatus: "Recalled" } : null));
    } catch (caught) {
      setError(getWorkflowErrorMessage(caught, "Failed to recall MIS"));
      setSuccessMessage(null);
    } finally {
      setIsRecalling(false);
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

  const safeRecord = displayRecord ?? resolvedRecord;

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
              <h2 className="h5 mb-1">Upload Sales MIS</h2>
              <div className="text-muted">
                {safeRecord.ProjectName} · {safeRecord.BorrowerName}
              </div>
              <div className="text-muted small">
                Project #{safeRecord.ProjectNumber} · Borrower {safeRecord.BorrowerCode}
              </div>
              <div className="mt-2">
                <span className={`badge ${getSalesMisStatusBadgeClass(currentStatus)}`}>Status: {currentStatus}</span>
              </div>
            </div>
            <div className="text-end">
              <div className="text-muted small">Working month</div>
              <div>{formatMonthLabel(safeRecord)}</div>
              <div className="text-muted small mt-2">Last submitted</div>
              <div>{safeRecord.LastSubmittedMonth}</div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="mb-0">Download the MIS Excel for the selected project and month, then upload it back once reviewed.</p>
            <div className="d-flex gap-2">
              {showRecallButton && (
                <button type="button" className="btn btn-warning" onClick={handleRecall} disabled={isRecalling || isPendingUpload}>
                  {isRecalling ? "Recalling..." : "Recall"}
                </button>
              )}
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSubmitForApproval}
                disabled={isSubmittedForApproval || isSubmitting || isPendingUpload}
              >
                {isSubmitting ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? "Downloading..." : "Download MIS Excel"}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h3 className="h6 mb-3">Upload Updated Sales MIS</h3>
          {!isUploadEnabled && (
            <div className="alert alert-info mb-3">
              Upload is disabled. Current status: <strong>{currentStatus}</strong>
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="misFile" className="form-label">
              Select Excel File
            </label>
            <input
              type="file"
              className="form-control"
              id="misFile"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting || !isUploadEnabled}
            />
            {selectedFile && (
              <div className="form-text mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          <button className="btn btn-success" onClick={handleImport} disabled={!selectedFile || isImporting || !isUploadEnabled}>
            {isImporting ? "Importing..." : "Import MIS"}
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
                {errorRows.length > 0 && (
                  <>
                    <br />
                    <strong>Errors:</strong> {errorRows.length} row(s) must be resolved before you can add commentary to warnings.
                  </>
                )}
                {!hasErrors && warningRows.length > 0 && (
                  <>
                    <br />
                    <strong>Warnings:</strong> {warningRows.length} row(s) — please add commentary below for each warning.
                  </>
                )}
              </div>
            </div>
            {hasErrors && (
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
                    {errorRows.map((row, index) => (
                      <tr key={index}>
                        <td>{row.AssetNumber}</td>
                        <td>{row.AssetName}</td>
                        <td>{row.UnitNumber}</td>
                        <td>{row.Phase}</td>
                        <td>{row.Building}</td>
                        <td>{row.Floor}</td>
                        <td className="text-danger">{row.ValidationErrors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!hasErrors && warningRows.length > 0 && (
              <>
                <div className="mb-3">
                  <button className="btn btn-primary" onClick={handleUpdateCommentary} disabled={!allCommentaryFilled || isUpdatingCommentary}>
                    {isUpdatingCommentary ? "Updating..." : "Update Commentary"}
                  </button>
                  {!allCommentaryFilled && <span className="text-muted ms-2 small">Please fill commentary for all warnings before updating.</span>}
                </div>
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
                        <th>Validation Warnings</th>
                        <th>Commentary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warningRows.map((row) => {
                        const index = importResult.Errors.indexOf(row);
                        return (
                          <tr key={index}>
                            <td>{row.AssetNumber}</td>
                            <td>{row.AssetName}</td>
                            <td>{row.UnitNumber}</td>
                            <td>{row.Phase}</td>
                            <td>{row.Building}</td>
                            <td>{row.Floor}</td>
                            <td className="text-warning">{row.ValidationWarnings || ""}</td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={row.Commentary || ""}
                                onChange={(e) => handleCommentaryChange(index, e.target.value)}
                                placeholder="Enter commentary..."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadSalesMisPage;
