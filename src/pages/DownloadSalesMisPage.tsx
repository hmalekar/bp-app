import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, downloadFile } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { ExistingSalesMisMonthDto, ProjectRecordDto } from "../api/contracts/types";

type MonthsState =
  | { status: "idle" | "loading"; months: ExistingSalesMisMonthDto[]; error: null }
  | { status: "loaded"; months: ExistingSalesMisMonthDto[]; error: null }
  | { status: "error"; months: ExistingSalesMisMonthDto[]; error: string };

function DownloadSalesMisPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectRecordDto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [monthsByProject, setMonthsByProject] = useState<Record<number, MonthsState>>({});
  const [selectedYearMonthByProject, setSelectedYearMonthByProject] = useState<Record<number, number>>({});
  const [downloadingByProject, setDownloadingByProject] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      setProjectsError(null);
      setProjectsLoading(true);
      try {
        const data = await apiGet<ProjectRecordDto[]>(API_ENDPOINTS.COST_PROJECTS);
        if (!isMounted) return;
        setProjects(data ?? []);
      } catch (caught) {
        if (!isMounted) return;
        setProjectsError(caught instanceof Error ? caught.message : "Failed to load projects");
      } finally {
        if (!isMounted) return;
        setProjectsLoading(false);
      }
    };

    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    let isMounted = true;

    const fetchMonthsForProjects = async () => {
      // mark all as loading
      setMonthsByProject((prev) => {
        const next: Record<number, MonthsState> = { ...prev };
        for (const p of projects) {
          const existing = next[p.ProjectNumber];
          next[p.ProjectNumber] = existing?.status === "loaded"
            ? existing
            : { status: "loading", months: existing?.months ?? [], error: null };
        }
        return next;
      });

      await Promise.all(
        projects.map(async (p) => {
          try {
            const months = await apiGet<ExistingSalesMisMonthDto[]>(API_ENDPOINTS.EXISTING_SALES_MIS_MONTHS, {
              params: { projectNumber: p.ProjectNumber },
            });

            if (!isMounted) return;

            const normalized = (months ?? []).slice();
            setMonthsByProject((prev) => ({
              ...prev,
              [p.ProjectNumber]: { status: "loaded", months: normalized, error: null },
            }));

            if (normalized[0] && selectedYearMonthByProject[p.ProjectNumber] == null) {
              setSelectedYearMonthByProject((prev) => ({
                ...prev,
                [p.ProjectNumber]: normalized[0].YearMonth,
              }));
            }
          } catch (caught) {
            if (!isMounted) return;
            const message = caught instanceof Error ? caught.message : "Failed to load months";
            setMonthsByProject((prev) => ({
              ...prev,
              [p.ProjectNumber]: { status: "error", months: prev[p.ProjectNumber]?.months ?? [], error: message },
            }));
          }
        })
      );
    };

    fetchMonthsForProjects();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const anyMonthsLoading = useMemo(() => {
    if (projects.length === 0) return false;
    return projects.some((p) => monthsByProject[p.ProjectNumber]?.status === "loading");
  }, [monthsByProject, projects]);

  const handleDownload = async (project: ProjectRecordDto) => {
    const projectNumber = project.ProjectNumber;
    const yearMonth = selectedYearMonthByProject[projectNumber];
    if (!yearMonth) return;

    setDownloadingByProject((prev) => ({ ...prev, [projectNumber]: true }));
    try {
      const displayMonth = monthsByProject[projectNumber]?.months.find((m) => m.YearMonth === yearMonth)?.YearMonthString ?? `${yearMonth}`;
      const safeMonth = displayMonth.replace(/[\s/]+/g, "-");
      const fileName = `sales-mis-${projectNumber}-${safeMonth}.xlsx`;

      await downloadFile(API_ENDPOINTS.SALES_MIS_EXPORT, fileName, {
        params: {
          yearMonth,
          projectNumber,
          previousYearMonth: 0,
        },
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to download MIS";
      alert(message);
    } finally {
      setDownloadingByProject((prev) => ({ ...prev, [projectNumber]: false }));
    }
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="h5 mb-1">Download Sales MIS</h2>
          <div className="text-muted small">Download any previously uploaded Sales MIS for your accessible projects.</div>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/dashboard")}>
          ← Back to dashboard
        </button>
      </div>

      {projectsError ? <div className="alert alert-danger">{projectsError}</div> : null}

      {projectsLoading ? (
        <div className="text-muted">Loading projects...</div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body">
            {anyMonthsLoading ? <div className="text-muted small mb-2">Loading available months...</div> : null}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: 120, whiteSpace: "nowrap" }}>
                      Project #
                    </th>
                    <th scope="col">Project</th>
                    <th scope="col" style={{ width: 240 }}>
                      Month
                    </th>
                    <th scope="col" style={{ width: 160 }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No accessible projects found.
                      </td>
                    </tr>
                  ) : (
                    projects.map((p) => {
                      const state = monthsByProject[p.ProjectNumber];
                      const months = state?.months ?? [];
                      const selected = selectedYearMonthByProject[p.ProjectNumber] ?? (months[0]?.YearMonth ?? 0);
                      const isDownloading = Boolean(downloadingByProject[p.ProjectNumber]);
                      const isDisabled = months.length === 0 || state?.status === "loading" || isDownloading;

                      return (
                        <tr key={p.ProjectNumber}>
                          <td style={{ whiteSpace: "nowrap" }}>{p.ProjectNumber}</td>
                          <td>{p.ProjectName}</td>
                          <td>
                            <div>
                              <select
                                className="form-select form-select-sm"
                                value={selected || ""}
                                onChange={(e) =>
                                  setSelectedYearMonthByProject((prev) => ({
                                    ...prev,
                                    [p.ProjectNumber]: Number(e.target.value),
                                  }))
                                }
                                disabled={state?.status === "loading" || months.length === 0}
                              >
                                {months.length === 0 ? <option value="">No MIS available</option> : null}
                                {months.map((m) => (
                                  <option key={m.YearMonth} value={m.YearMonth}>
                                    {m.YearMonthString}
                                  </option>
                                ))}
                              </select>
                              {state?.status === "error" ? <div className="text-danger small mt-1">{state.error}</div> : null}
                            </div>
                          </td>
                          <td>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => handleDownload(p)} disabled={isDisabled}>
                              {isDownloading ? "Downloading..." : "Download"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DownloadSalesMisPage;

