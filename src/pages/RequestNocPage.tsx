import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { ProjectRecordDto, UnitApplicableForNocDto, UnitNocWorkflowUpdateRequest, ValidationResponse } from "../api/contracts/types";
import { SALES_MIS_WORKFLOW_STATUS } from "../constants/salesMisWorkflowStatus";

type NocUnitRowState = {
  applyForNoc: boolean;
  commentary: string;
  attachment: File | null;
};

function RequestNocPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecordDto[]>([]);
  const [selectedProjectNumber, setSelectedProjectNumber] = useState<number | "">("");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitApplicableForNocDto[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<number, NocUnitRowState>>({});
  const [rowActionLoading, setRowActionLoading] = useState<Record<number, boolean>>({});
  const [submittedUnits, setSubmittedUnits] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      setProjectsError(null);
      try {
        const data = await apiGet<ProjectRecordDto[]>(API_ENDPOINTS.COST_PROJECTS);
        if (isMounted) {
          setProjects(data ?? []);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load projects";
        if (isMounted) setProjectsError(message);
      } finally {
        if (isMounted) setProjectsLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (projects.length === 1 && selectedProjectNumber === "") {
      setSelectedProjectNumber(projects[0].ProjectNumber);
    } else if (projects.length > 1 && selectedProjectNumber === "" && projects[0]) {
      setSelectedProjectNumber(projects[0].ProjectNumber);
    }
  }, [projects, selectedProjectNumber]);

  useEffect(() => {
    let isMounted = true;

    const fetchUnits = async () => {
      if (selectedProjectNumber === "") {
        if (isMounted) {
          setUnits([]);
          setUnitsError(null);
          setUnitsLoading(false);
          setRowState({});
          setSubmittedUnits({});
        }
        return;
      }

      setUnitsLoading(true);
      setUnitsError(null);
      try {
        const url = `${API_ENDPOINTS.NOC_APPLICABLE_UNITS}?projectNumber=${encodeURIComponent(selectedProjectNumber)}`;
        const data = await apiGet<UnitApplicableForNocDto[]>(url);
        if (!isMounted) return;
        const resolvedUnits = data ?? [];
        setUnits(resolvedUnits);
        setSubmittedUnits({});
        setRowState(
          resolvedUnits.reduce<Record<number, NocUnitRowState>>((acc, unit) => {
            acc[unit.UnitUniqueNumber] = {
              applyForNoc: false,
              commentary: "",
              attachment: null,
            };
            return acc;
          }, {}),
        );
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load applicable NOC units";
        if (isMounted) {
          setUnitsError(message);
          setUnits([]);
          setRowState({});
          setSubmittedUnits({});
        }
      } finally {
        if (isMounted) {
          setUnitsLoading(false);
        }
      }
    };

    fetchUnits();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectNumber]);

  const updateRowState = (unitUniqueNumber: number, updater: (current: NocUnitRowState) => NocUnitRowState) => {
    setRowState((prev) => {
      const current = prev[unitUniqueNumber] ?? { applyForNoc: false, commentary: "", attachment: null };
      return {
        ...prev,
        [unitUniqueNumber]: updater(current),
      };
    });
  };

  const handleRowWorkflowAction = async (unit: UnitApplicableForNocDto) => {
    const currentRow = rowState[unit.UnitUniqueNumber];
    if (!currentRow?.applyForNoc || selectedProjectNumber === "" || submittedUnits[unit.UnitUniqueNumber]) return;

    if (!currentRow.attachment) {
      setActionError(`Attachment is required for unit ${unit.UnitNumber || unit.UnitUniqueNumber} before submitting for approval.`);
      setActionSuccess(null);
      return;
    }
    const attachmentName = currentRow.attachment?.name ?? "";
    const isZipOrRar = /\.(zip|rar)$/i.test(attachmentName);
    if (!isZipOrRar) {
      setActionError("Only .zip and .rar files are allowed for attachments.");
      setActionSuccess(null);
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setRowActionLoading((prev) => ({ ...prev, [unit.UnitUniqueNumber]: true }));
    try {
      const workflowPayload: UnitNocWorkflowUpdateRequest = {
        YearMonth: unit.YearMonth,
        ProjectNumber: selectedProjectNumber,
        AssetNumber: unit.AssetNumber,
        UnitUniqueNumber: unit.UnitUniqueNumber,
        WorkflowStatus: SALES_MIS_WORKFLOW_STATUS.SUBMITTED_FOR_APPROVAL,
        Comments: currentRow.commentary,
      };

      const workflowResult = await apiPost<ValidationResponse>(API_ENDPOINTS.NOC_WORKFLOW_UPDATE, workflowPayload);
      if (!workflowResult.IsValid) {
        setActionError(workflowResult.Message || "NOC workflow update failed.");
        return;
      }

      if (currentRow.attachment) {
        const formData = new FormData();
        formData.append("file", currentRow.attachment);
        const attachmentUrl = `${API_ENDPOINTS.NOC_ATTACHMENT}?yearMonth=${encodeURIComponent(
          workflowPayload.YearMonth,
        )}&projectNumber=${encodeURIComponent(workflowPayload.ProjectNumber)}&assetNumber=${encodeURIComponent(
          workflowPayload.AssetNumber,
        )}&unitUniqueNumber=${encodeURIComponent(workflowPayload.UnitUniqueNumber)}`;
        await apiPost<{ FileName?: string; Path?: string }>(attachmentUrl, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setSubmittedUnits((prev) => ({ ...prev, [unit.UnitUniqueNumber]: true }));
      updateRowState(unit.UnitUniqueNumber, () => ({
        applyForNoc: false,
        commentary: "",
        attachment: null,
      }));
      setActionSuccess(`Unit ${unit.UnitNumber || unit.UnitUniqueNumber} submitted for approval successfully.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to update NOC workflow";
      setActionError(message);
    } finally {
      setRowActionLoading((prev) => ({ ...prev, [unit.UnitUniqueNumber]: false }));
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
        <h2 className="h5 mb-0">Request for NOC</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/pending-workflow")}>
          Back to Pending Workflow
        </button>
      </div>

      {projectsError ? <div className="alert alert-danger">{projectsError}</div> : null}

      <div className="card">
        <div className="card-body">
          <h3 className="h6 card-title mb-3">Project selection</h3>
          {projectsLoading ? (
            <p className="text-muted mb-0">Loading projects...</p>
          ) : (
            <>
              <div className="mb-3">
                <label htmlFor="noc-project-select" className="form-label">
                  Project
                </label>
                <select
                  id="noc-project-select"
                  className="form-select"
                  value={selectedProjectNumber}
                  onChange={(e) => setSelectedProjectNumber(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.ProjectNumber} value={project.ProjectNumber}>
                      {project.ProjectName} ({project.ProjectNumber})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-muted mb-0">
                Selected project:{" "}
                {selectedProjectNumber === ""
                  ? "—"
                  : (projects.find((project) => project.ProjectNumber === selectedProjectNumber)?.ProjectName ?? selectedProjectNumber)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <h3 className="h6 card-title mb-3">Applicable NOC units</h3>
          {actionError ? <div className="alert alert-danger">{actionError}</div> : null}
          {actionSuccess ? <div className="alert alert-success">{actionSuccess}</div> : null}
          {selectedProjectNumber === "" ? (
            <p className="text-muted mb-0">Select a project to view applicable NOC units.</p>
          ) : unitsLoading ? (
            <p className="text-muted mb-0">Loading applicable NOC units...</p>
          ) : unitsError ? (
            <div className="alert alert-danger mb-0">{unitsError}</div>
          ) : units.length === 0 ? (
            <p className="text-muted mb-0">No applicable units found for the selected project.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Apply</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Sales Base + Other Charges</th>
                    <th scope="col">Stamp Duty</th>
                    <th scope="col">Registration</th>
                    <th scope="col">Pass Through</th>
                    <th scope="col">Taxes</th>
                    <th scope="col">Sales Total</th>
                    <th scope="col">MSP Variance</th>
                    <th scope="col">Commentary</th>
                    <th scope="col">Attachment</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => {
                    const currentRow = rowState[unit.UnitUniqueNumber] ?? { applyForNoc: false, commentary: "", attachment: null };
                    const isSubmitting = rowActionLoading[unit.UnitUniqueNumber] ?? false;
                    const isSubmitted = submittedUnits[unit.UnitUniqueNumber] ?? false;
                    return (
                      <tr key={unit.UnitUniqueNumber}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={currentRow.applyForNoc}
                            disabled={isSubmitted}
                            onChange={(e) =>
                              updateRowState(unit.UnitUniqueNumber, (current) => ({
                                applyForNoc: e.target.checked,
                                commentary: e.target.checked ? current.commentary : "",
                                attachment: e.target.checked ? current.attachment : null,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div>{unit.UnitNumber || "—"}</div>
                          <div className="text-muted small">
                            {unit.Phase || "—"} / {unit.Building || "—"} / {unit.Floor || "—"}
                          </div>
                        </td>
                        <td>
                          <div>{unit.CustomerName || "—"}</div>
                          <div className="text-muted small">{unit.CustomerKycMobile || unit.CustomerKycEmail || "—"}</div>
                        </td>
                        <td>{formatMoney((unit.SalesBasePrice ?? 0) + (unit.SalesOtherChargesAmount ?? 0))}</td>
                        <td>{formatMoney(unit.SalesStampDutyAmount)}</td>
                        <td>{formatMoney(unit.SalesRegistrationAmount)}</td>
                        <td>{formatMoney(unit.SalesPassThroughCharges)}</td>
                        <td>{formatMoney(unit.SalesTaxesAmount)}</td>
                        <td>{formatMoney(unit.SalesTotalAmount)}</td>
                        <td>
                          <span className={`badge ${unit.MspVarianceAmount < 0 ? "text-bg-danger" : "text-bg-success"}`}>
                            {formatMoney(unit.MspVarianceAmount)}
                          </span>
                        </td>
                        <td style={{ minWidth: 240 }}>
                          <textarea
                            className="form-control form-control-sm"
                            value={currentRow.commentary}
                            placeholder="Enter commentary"
                            disabled={!currentRow.applyForNoc || isSubmitted}
                            rows={2}
                            onChange={(e) =>
                              updateRowState(unit.UnitUniqueNumber, (current) => ({
                                ...current,
                                commentary: e.target.value,
                              }))
                            }
                          />
                        </td>
                        <td style={{ minWidth: 260 }}>
                          <input
                            type="file"
                            className="form-control form-control-sm"
                            accept=".zip,.rar,application/zip,application/x-rar-compressed,application/vnd.rar"
                            disabled={!currentRow.applyForNoc || isSubmitted}
                            onChange={(e) =>
                              updateRowState(unit.UnitUniqueNumber, (current) => ({
                                ...current,
                                attachment: e.target.files?.[0] ?? null,
                              }))
                            }
                          />
                          {currentRow.attachment ? <div className="form-text">{currentRow.attachment.name}</div> : null}
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={!currentRow.applyForNoc || isSubmitting || isSubmitted}
                              onClick={() => handleRowWorkflowAction(unit)}
                            >
                              {isSubmitting ? "Submitting..." : isSubmitted ? "Submitted" : "Submit for Approval"}
                            </button>
                          </div>
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
    </div>
  );
}

export default RequestNocPage;
