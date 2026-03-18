import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { downloadFile, apiPost, apiGet } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import { SALES_MIS_WORKFLOW_STATUS, getSalesMisStatusBadgeClass } from "../constants/salesMisWorkflowStatus";
import SearchableDropdown, { type SearchableDropdownOption } from "../components/SearchableDropdown";
import type {
  PendingSalesMisRecordDto,
  SalesMisRequestPayload,
  SalesMisImportResult,
  SalesMisRowError,
  ImportSalesMisRequest,
  SalesMisWorkflowUpdateRequest,
  ValidationResponse,
  SoldUnitRecordDto,
  SalesCancellationRecordDto,
  SalesCancellationRequest,
} from "../api/contracts/types";

const formatMonthLabel = (record: PendingSalesMisRecordDto) => record.NewDueMonthV ?? `${record.NewDueMonth}`;

/** Single cancellation row (unit + user-entered fields). */
interface CancellationRowState {
  id: number;
  selectedUnit: SoldUnitRecordDto | null;
  CancellationCharges: number;
  RefundableAmount: number;
  AmountRefunded: number;
  ReasonForCancellation: string;
  Remarks: string;
}

/** Per-field validation errors for a cancellation row. */
interface CancellationRowErrors {
  unitDuplicate?: string;
  cancellationCharges?: string;
  refundableAmount?: string;
  amountRefunded?: string;
  reasonForCancellation?: string;
}

function getCancellationRowErrors(row: CancellationRowState, rowIndex: number, allRows: CancellationRowState[]): CancellationRowErrors {
  const errors: CancellationRowErrors = {};
  const basePrice = row.selectedUnit?.SalesBasePrice ?? 0;

  if (row.selectedUnit) {
    const sameUnitInOtherRow = allRows.some((r, i) => i !== rowIndex && r.selectedUnit?.UnitUniqueNumber === row.selectedUnit?.UnitUniqueNumber);
    if (sameUnitInOtherRow) {
      errors.unitDuplicate = "This unit is already selected in another row.";
    }
  }

  if (row.selectedUnit) {
    if (row.CancellationCharges < 0) {
      errors.cancellationCharges = "Cannot be less than 0.";
    } else if (row.CancellationCharges > basePrice) {
      errors.cancellationCharges = "Cannot exceed sales base price.";
    }

    if (row.RefundableAmount < 0) {
      errors.refundableAmount = "Cannot be less than 0.";
    } else if (row.RefundableAmount > basePrice) {
      errors.refundableAmount = "Cannot exceed sales base price.";
    }

    if (row.AmountRefunded < 0) {
      errors.amountRefunded = "Cannot be less than 0.";
    } else if (row.AmountRefunded > row.RefundableAmount) {
      errors.amountRefunded = "Cannot exceed refundable amount.";
    }
  }

  if (row.selectedUnit && !row.ReasonForCancellation?.trim()) {
    errors.reasonForCancellation = "Reason for cancellation is required.";
  }

  return errors;
}

function buildCancellationDto(row: CancellationRowState, yearMonth: number, projectNumber: number): SalesCancellationRecordDto | null {
  if (!row.selectedUnit) return null;
  const u = row.selectedUnit;
  return {
    YearMonth: yearMonth,
    ProjectNumber: projectNumber,
    AssetNumber: u.AssetNumber,
    AssetName: u.AssetName,
    Phase: u.Phase,
    Building: u.Building,
    Floor: u.Floor,
    UnitNumber: u.UnitNumber,
    UnitConfiguration: u.UnitConfiguration,
    UnitTypeCode: u.UnitTypeCode,
    SaleableArea: u.SaleableArea,
    CarpetArea: u.CarpetArea,
    CarpetAreaRera: u.CarpetAreaRera,
    UnitUniqueNumber: u.UnitUniqueNumber,
    BookingDate: u.BookingDate,
    SalesBasePrice: u.SalesBasePrice,
    TotalAmountReceived: u.TotalAmountReceived,
    CancellationCharges: row.CancellationCharges,
    RefundableAmount: row.RefundableAmount,
    AmountRefunded: row.AmountRefunded,
    ReasonForCancellation: row.ReasonForCancellation,
    Remarks: row.Remarks,
  };
}

/** Convert cancelled-unit DTO to SoldUnitRecordDto for dropdown. */
function cancellationDtoToSoldUnit(dto: SalesCancellationRecordDto): SoldUnitRecordDto {
  return {
    AssetNumber: dto.AssetNumber,
    AssetName: dto.AssetName,
    Phase: dto.Phase,
    Building: dto.Building,
    Floor: dto.Floor,
    UnitNumber: dto.UnitNumber,
    UnitConfiguration: dto.UnitConfiguration,
    UnitTypeCode: dto.UnitTypeCode,
    SaleableArea: dto.SaleableArea,
    CarpetArea: dto.CarpetArea,
    CarpetAreaRera: dto.CarpetAreaRera,
    UnitUniqueNumber: dto.UnitUniqueNumber,
    BookingDate: dto.BookingDate,
    SalesBasePrice: dto.SalesBasePrice,
    TotalAmountReceived: dto.TotalAmountReceived,
  };
}

/** Convert SalesCancellationRecordDto to CancellationRowState. */
function cancellationDtoToRowState(dto: SalesCancellationRecordDto, id: number): CancellationRowState {
  return {
    id,
    selectedUnit: cancellationDtoToSoldUnit(dto),
    CancellationCharges: dto.CancellationCharges,
    RefundableAmount: dto.RefundableAmount,
    AmountRefunded: dto.AmountRefunded,
    ReasonForCancellation: dto.ReasonForCancellation,
    Remarks: dto.Remarks,
  };
}

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

  // Cancellation section: sold units (fetched on first "Add" click) and rows
  const [soldUnits, setSoldUnits] = useState<SoldUnitRecordDto[] | null>(null);
  const [soldUnitsLoading, setSoldUnitsLoading] = useState(false);
  const [soldUnitsError, setSoldUnitsError] = useState<string | null>(null);
  const [cancellationRows, setCancellationRows] = useState<CancellationRowState[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [cancelledUnitsLoading, setCancelledUnitsLoading] = useState(false);
  const [cancelledUnitsLoadError, setCancelledUnitsLoadError] = useState<string | null>(null);

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

  // Load cancelled units when page is available and section is unlocked (same rules as upload)
  useEffect(() => {
    if (!displayRecord || !isUploadEnabled) return;
    let cancelled = false;
    setCancelledUnitsLoadError(null);
    setCancelledUnitsLoading(true);
    apiGet<SalesCancellationRecordDto[]>(API_ENDPOINTS.SALES_CANCELLED_UNITS, {
      params: { YearMonth: displayRecord.NewDueMonth, ProjectNumber: displayRecord.ProjectNumber },
    })
      .then((list) => {
        if (cancelled) return;
        const dtos = Array.isArray(list) ? list : [];
        const rows: CancellationRowState[] = dtos.map((dto, i) => cancellationDtoToRowState(dto, i + 1));
        const units: SoldUnitRecordDto[] = dtos.map(cancellationDtoToSoldUnit);
        setCancellationRows(rows);
        setNextRowId(dtos.length + 1);
        if (units.length > 0) setSoldUnits(units);
      })
      .catch((err) => {
        if (!cancelled) setCancelledUnitsLoadError(err instanceof Error ? err.message : "Failed to load cancelled units");
      })
      .finally(() => {
        if (!cancelled) setCancelledUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayRecord?.ProjectNumber, displayRecord?.NewDueMonth, isUploadEnabled]);

  const handleAddCancellationRow = async () => {
    if (!displayRecord) return;
    setSoldUnitsError(null);
    if (soldUnits === null) {
      setSoldUnitsLoading(true);
      try {
        const yearMonth = displayRecord.LastSubmittedMonth;
        const projectNumber = displayRecord.ProjectNumber;
        const list = await apiGet<SoldUnitRecordDto[]>(API_ENDPOINTS.SALES_SOLD_UNITS, {
          params: { YearMonth: yearMonth, ProjectNumber: projectNumber },
        });
        setSoldUnits(Array.isArray(list) ? list : []);
      } catch (caught) {
        setSoldUnitsError(caught instanceof Error ? caught.message : "Failed to load sold units");
        return;
      } finally {
        setSoldUnitsLoading(false);
      }
    }
    setCancellationRows((prev) => [
      ...prev,
      {
        id: nextRowId,
        selectedUnit: null,
        CancellationCharges: 0,
        RefundableAmount: 0,
        AmountRefunded: 0,
        ReasonForCancellation: "",
        Remarks: "",
      },
    ]);
    setNextRowId((id) => id + 1);
  };

  const updateCancellationRow = (id: number, updates: Partial<CancellationRowState>) => {
    setCancellationRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeCancellationRow = (id: number) => {
    setCancellationRows((prev) => prev.filter((r) => r.id !== id));
  };

  const soldUnitOptions: SearchableDropdownOption<SoldUnitRecordDto>[] = (soldUnits ?? []).map((u) => ({
    value: u,
    label: `${u.AssetName} – ${u.UnitNumber}`.trim(),
  }));

  const cancellationRowErrors = useMemo(
    () => cancellationRows.map((row, i) => getCancellationRowErrors(row, i, cancellationRows)),
    [cancellationRows],
  );

  const hasCancellationRowErrors = cancellationRowErrors.some(
    (e) => e.unitDuplicate ?? e.cancellationCharges ?? e.refundableAmount ?? e.amountRefunded ?? e.reasonForCancellation,
  );

  const completedCancellations: SalesCancellationRecordDto[] = useMemo(() => {
    if (!displayRecord) return [];
    return cancellationRows
      .filter((row, i) => {
        const err = cancellationRowErrors[i];
        const hasError = err.unitDuplicate ?? err.cancellationCharges ?? err.refundableAmount ?? err.amountRefunded ?? err.reasonForCancellation;
        return !hasError && row.selectedUnit != null;
      })
      .map((row) => buildCancellationDto(row, displayRecord.NewDueMonth, displayRecord.ProjectNumber))
      .filter((dto): dto is SalesCancellationRecordDto => dto != null);
  }, [displayRecord, cancellationRows, cancellationRowErrors]);

  const handleUpdateCancellation = async () => {
    if (!displayRecord || completedCancellations.length === 0) return;
    setError(null);
    setSuccessMessage(null);
    setIsSubmittingCancellation(true);
    try {
      const request: SalesCancellationRequest = {
        ProjectNumber: displayRecord.ProjectNumber,
        YearMonth: displayRecord.NewDueMonth,
        CancelledUnits: completedCancellations,
      };
      await apiPost<void, SalesCancellationRequest>(API_ENDPOINTS.SALES_CANCELLATION, request);
      setSuccessMessage("Cancellations updated successfully.");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update cancellations");
      setSuccessMessage(null);
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

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
      {/* Sub-header: actions + back link right */}
      <div className="d-flex flex-wrap justify-content-end align-items-center gap-2">
        <div className="d-flex gap-2">
          {showRecallButton && (
            <button type="button" className="btn btn-warning btn-sm" onClick={handleRecall} disabled={isRecalling || isPendingUpload}>
              {isRecalling ? "Recalling..." : "Recall"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleSubmitForApproval}
            disabled={isSubmittedForApproval || isSubmitting || isPendingUpload}
          >
            {isSubmitting ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/dashboard")}>
          ← Back to dashboard
        </button>
      </div>

      {/* Page title card – Upload Sales MIS with project details and status */}
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
        <div className="alert alert-success mb-0" role="alert">
          {successMessage}
        </div>
      )}

      {/* Report cancellations */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h3 className="h6 mb-3">Report cancellations</h3>
          {!isUploadEnabled && (
            <div className="alert alert-info mb-3">
              Cancellations are disabled. Current status: <strong>{currentStatus}</strong>
            </div>
          )}
          {cancelledUnitsLoadError && <div className="alert alert-danger mb-3">{cancelledUnitsLoadError}</div>}
          {cancelledUnitsLoading && <div className="text-muted small mb-3">Loading cancelled units…</div>}
          {soldUnitsError && <div className="alert alert-danger mb-3">{soldUnitsError}</div>}
          {hasCancellationRowErrors && (
            <div className="alert alert-warning mb-3">
              Some rows have validation errors. Please correct them before submitting. Only rows without errors will be included.
            </div>
          )}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleAddCancellationRow}
              disabled={soldUnitsLoading || cancelledUnitsLoading || !isUploadEnabled}
            >
              {soldUnitsLoading ? "Loading sold units..." : "Add cancellation row"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleUpdateCancellation}
              disabled={completedCancellations.length === 0 || isSubmittingCancellation || !isUploadEnabled}
            >
              {isSubmittingCancellation ? "Updating..." : "Update cancellation"}
            </button>
          </div>
          {cancellationRows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Unit</th>
                    <th>Total amount received</th>
                    <th>Sales base price</th>
                    <th>Cancellation charges</th>
                    <th>Refundable amount</th>
                    <th>Amount refunded</th>
                    <th>Reason for cancellation</th>
                    <th>Remarks</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cancellationRows.map((row, rowIndex) => {
                    const errors = cancellationRowErrors[rowIndex] ?? {};
                    return (
                      <tr key={row.id}>
                        <td style={{ minWidth: 200 }}>
                          <div>
                            <SearchableDropdown<SoldUnitRecordDto>
                              options={soldUnitOptions}
                              value={row.selectedUnit}
                              onChange={(unit) => updateCancellationRow(row.id, { selectedUnit: unit })}
                              placeholder="Search asset + unit..."
                              getOptionKey={(u) => u.UnitUniqueNumber}
                              invalid={Boolean(errors.unitDuplicate)}
                            />
                            {errors.unitDuplicate && <div className="invalid-feedback d-block">{errors.unitDuplicate}</div>}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm bg-light"
                            readOnly
                            value={row.selectedUnit != null ? row.selectedUnit.TotalAmountReceived : ""}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm bg-light"
                            readOnly
                            value={row.selectedUnit != null ? row.selectedUnit.SalesBasePrice : ""}
                          />
                        </td>
                        <td>
                          <div>
                            <input
                              type="number"
                              className={`form-control form-control-sm ${errors.cancellationCharges ? "is-invalid" : ""}`}
                              value={row.CancellationCharges || ""}
                              onChange={(e) =>
                                updateCancellationRow(row.id, {
                                  CancellationCharges: e.target.value === "" ? 0 : Number(e.target.value),
                                })
                              }
                              placeholder="0"
                            />
                            {errors.cancellationCharges && <div className="invalid-feedback d-block">{errors.cancellationCharges}</div>}
                          </div>
                        </td>
                        <td>
                          <div>
                            <input
                              type="number"
                              className={`form-control form-control-sm ${errors.refundableAmount ? "is-invalid" : ""}`}
                              value={row.RefundableAmount || ""}
                              onChange={(e) =>
                                updateCancellationRow(row.id, {
                                  RefundableAmount: e.target.value === "" ? 0 : Number(e.target.value),
                                })
                              }
                              placeholder="0"
                            />
                            {errors.refundableAmount && <div className="invalid-feedback d-block">{errors.refundableAmount}</div>}
                          </div>
                        </td>
                        <td>
                          <div>
                            <input
                              type="number"
                              className={`form-control form-control-sm ${errors.amountRefunded ? "is-invalid" : ""}`}
                              value={row.AmountRefunded || ""}
                              onChange={(e) =>
                                updateCancellationRow(row.id, {
                                  AmountRefunded: e.target.value === "" ? 0 : Number(e.target.value),
                                })
                              }
                              placeholder="0"
                            />
                            {errors.amountRefunded && <div className="invalid-feedback d-block">{errors.amountRefunded}</div>}
                          </div>
                        </td>
                        <td>
                          <div>
                            <input
                              type="text"
                              className={`form-control form-control-sm ${errors.reasonForCancellation ? "is-invalid" : ""}`}
                              value={row.ReasonForCancellation}
                              onChange={(e) => updateCancellationRow(row.id, { ReasonForCancellation: e.target.value })}
                              placeholder="Reason (required)"
                            />
                            {errors.reasonForCancellation && <div className="invalid-feedback d-block">{errors.reasonForCancellation}</div>}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row.Remarks}
                            onChange={(e) => updateCancellationRow(row.id, { Remarks: e.target.value })}
                            placeholder="Remarks"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm py-0 px-1"
                            onClick={() => removeCancellationRow(row.id)}
                            aria-label="Remove row"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {completedCancellations.length > 0 && <div className="mt-2 small text-muted">{completedCancellations.length} cancellation(s) ready.</div>}
        </div>
      </div>

      {/* Upload card: Download MIS Excel + file upload */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h3 className="h6 mb-3">Upload Updated Sales MIS</h3>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? "Downloading..." : "Download MIS Excel"}
            </button>
            <span className="text-muted small">
              Download the MIS Excel, then upload it back once reviewed. If MIS has been updated for the current month. This will download the latest
              MIS Excel.
            </span>
          </div>
          {error ? <div className="alert alert-danger mb-3">{error}</div> : null}
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
