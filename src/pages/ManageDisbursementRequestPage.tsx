import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, downloadFile } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { DisbursementRequestCostRecordDto, DisbursementRequestImportResult, ProjectRecordDto } from "../api/contracts/types";

function ManageDisbursementRequestPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectRecordDto[]>([]);
  const [selectedProjectNumber, setSelectedProjectNumber] = useState<number | "">("");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<DisbursementRequestImportResult | null>(null);

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

  // When projects load and we have exactly one, select it (initial state may be before first set)
  useEffect(() => {
    if (projects.length === 1 && selectedProjectNumber === "") {
      setSelectedProjectNumber(projects[0].ProjectNumber);
    } else if (projects.length > 1 && selectedProjectNumber === "" && projects[0]) {
      setSelectedProjectNumber(projects[0].ProjectNumber);
    }
  }, [projects]);

  const handleDownloadTemplate = async () => {
    if (selectedProjectNumber === "") return;
    setTemplateDownloading(true);
    try {
      await downloadFile(API_ENDPOINTS.COST_DR_EXPORT_TEMPLATE, "disbursement_request_template.xlsx", {
        params: { projectNumber: selectedProjectNumber },
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download template";
      alert(message);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file ?? null);
    setUploadError(null);
    setImportResult(null);
  };

  const uploadSucceeded = Boolean(importResult && (importResult.IsValid || importResult.DisbursementRequestNumber != null));

  const handleUpload = async () => {
    if (uploadSucceeded || selectedProjectNumber === "" || !selectedFile) return;
    setUploadError(null);
    setImportResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const result = await apiPost<DisbursementRequestImportResult>(API_ENDPOINTS.COST_DR_IMPORT, formData, {
        params: { projectNumber: selectedProjectNumber, remarks: remarks || undefined },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setImportResult(result);
      if (result.IsValid) {
        setSelectedFile(null);
        setRemarks("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to upload disbursement request file";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 mb-0">Manage Disbursement Request</h2>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      {projectsError ? <div className="alert alert-danger">{projectsError}</div> : null}

      <div className="card mb-3">
        <div className="card-body">
          <h3 className="h6 card-title mb-3">Project &amp; template</h3>
          {projectsLoading ? (
            <p className="text-muted mb-0">Loading projects...</p>
          ) : (
            <>
              <div className="mb-3">
                <label htmlFor="project-select" className="form-label">
                  Project
                </label>
                <select
                  id="project-select"
                  className="form-select"
                  value={selectedProjectNumber}
                  onChange={(e) => setSelectedProjectNumber(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.ProjectNumber} value={p.ProjectNumber}>
                      {p.ProjectName} ({p.ProjectNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadTemplate}
                  disabled={templateDownloading || selectedProjectNumber === ""}
                >
                  {templateDownloading ? "Downloading..." : "Download disbursement request template"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h3 className="h6 card-title mb-3">Upload disbursement request file</h3>
          {uploadSucceeded && (
            <div className="alert alert-info mb-3">A disbursement request was created. To create another, go back and open this page again.</div>
          )}
          <p className="text-muted small mb-3">Download the template above, fill it in, then upload the completed file here.</p>
          {uploadError ? <div className="alert alert-danger mb-3">{uploadError}</div> : null}
          <div className="mb-3">
            <label htmlFor="dr-file" className="form-label">
              Select file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              className="form-control"
              id="dr-file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading || uploadSucceeded || selectedProjectNumber === ""}
            />
            {selectedFile && (
              <div className="form-text mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          <div className="mb-3">
            <label htmlFor="dr-remarks" className="form-label">
              Remarks
            </label>
            <textarea
              id="dr-remarks"
              className="form-control"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={uploading || uploadSucceeded || selectedProjectNumber === ""}
              placeholder="Optional remarks for this disbursement request"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading || uploadSucceeded || selectedProjectNumber === ""}
          >
            {uploading ? "Uploading..." : "Upload disbursement request"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="card mb-3">
          <div className="card-body">
            <h3 className="h6 card-title mb-3">Import result</h3>
            {importResult.IsValid || importResult.DisbursementRequestNumber != null ? (
              <div className="alert alert-success mb-0">
                {importResult.Message?.trim() ||
                  `Disbursement request file uploaded successfully. Disbursement request number: ${importResult.DisbursementRequestNumber ?? ""}`.trim()}
              </div>
            ) : (
              <>
                <div className="alert alert-danger mb-3">{importResult.Message}</div>
                {importResult.Records && importResult.Records.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered table-striped">
                      <thead className="table-dark">
                        <tr>
                          <th>Row</th>
                          <th>Phase</th>
                          <th>Building</th>
                          <th>Category</th>
                          <th>SubCategory</th>
                          <th>Party Name</th>
                          <th>Document No.</th>
                          <th>Validation errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.Records.map((row: DisbursementRequestCostRecordDto) => (
                          <tr key={row.RecordNumber}>
                            <td>{row.RecordNumber}</td>
                            <td>{row.Phase}</td>
                            <td>{row.Building}</td>
                            <td>{row.Category}</td>
                            <td>{row.SubCategory}</td>
                            <td>{row.PartyName}</td>
                            <td>{row.DocumentNumber}</td>
                            <td className="text-danger">{row.ValidationErrors || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageDisbursementRequestPage;
