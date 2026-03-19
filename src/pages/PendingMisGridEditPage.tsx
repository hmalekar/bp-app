import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto, SalesMisRecordDto, SalesMisRequestPayload } from "../api/contracts/types";

const flagToBoolean = (value?: string) => value?.toUpperCase() === "Y";
const booleanToFlag = (value: boolean) => (value ? "Y" : "N");

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

function PendingMisGridEditPage() {
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

  const [records, setRecords] = useState<SalesMisRecordDto[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");
  const [soldFilter, setSoldFilter] = useState<"all" | "sold" | "unsold">("all");

  useEffect(() => {
    if (!resolvedRecord) return;
    let isMounted = true;

    const fetchMis = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const payload: SalesMisRequestPayload = {
          YearMonth: resolvedRecord.NewDueMonth,
          ProjectNumber: resolvedRecord.ProjectNumber,
          PreviousYearMonth: resolvedRecord.LastSubmittedMonth,
        };
        const data = await apiGet<SalesMisRecordDto[]>(API_ENDPOINTS.MIS, { params: payload });
        if (isMounted) {
          setRecords(data);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Failed to load MIS";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMis();

    return () => {
      isMounted = false;
    };
  }, [resolvedRecord]);

  const filteredRecords = useMemo(() => {
    const search = unitSearch.trim().toLowerCase();
    return records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => {
        if (soldFilter === "sold" && !flagToBoolean(record.IsUnitSoldFlag)) return false;
        if (soldFilter === "unsold" && flagToBoolean(record.IsUnitSoldFlag)) return false;
        if (!search) return true;
        const unitLabel = [record.Floor, record.UnitNumber, record.UnitConfiguration].filter(Boolean).join(" / ");
        return unitLabel.toLowerCase().includes(search);
      });
  }, [records, soldFilter, unitSearch]);

  const updateRecord = (index: number, updates: Partial<SalesMisRecordDto>) => {
    setRecords((prev) => prev.map((record, recordIndex) => (recordIndex === index ? { ...record, ...updates } : record)));
  };

  const toggleExpanded = (index: number) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!resolvedRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Pending MIS Grid</h2>
          <p className="text-muted">No pending MIS record was provided.</p>
          <button className="btn btn-primary" onClick={() => navigate("/pending-workflow")}>
            Back to Pending Workflow
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4 mis-page">
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h2 className="h5 mb-1">Pending MIS · Grid + Edit Mode</h2>
              <div className="text-muted">
                {resolvedRecord.ProjectName} · {resolvedRecord.BorrowerName}
              </div>
              <div className="text-muted small">
                Project #{resolvedRecord.ProjectNumber} · Borrower {resolvedRecord.BorrowerCode}
              </div>
            </div>
            <div className="text-end">
              <div className="text-muted small">Last submitted</div>
              <div>{resolvedRecord.LastSubmittedMonth}</div>
              <div className="text-muted small mt-2">New due</div>
              <div>{resolvedRecord.NewDueMonthV ?? resolvedRecord.NewDueMonth}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label small">Unit Search</label>
              <input
                className="form-control form-control-sm"
                placeholder="Search by unit / config"
                value={unitSearch}
                onChange={(event) => setUnitSearch(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small">Sold Status</label>
              <select
                className="form-select form-select-sm"
                value={soldFilter}
                onChange={(event) => setSoldFilter(event.target.value as "all" | "sold" | "unsold")}
              >
                <option value="all">All Units</option>
                <option value="sold">Sold Only</option>
                <option value="unsold">Unsold Only</option>
              </select>
            </div>
            <div className="col-12 col-lg-3 text-lg-end">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setUnitSearch("");
                  setSoldFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading MIS records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-muted">No units match the selected filters.</div>
      ) : (
        <div className="mis-grid">
          {filteredRecords.map(({ record, index }) => {
            const unitLabel = [record.Floor, record.UnitNumber, record.UnitConfiguration].filter(Boolean).join(" / ");
            const isExpanded = expandedUnits.has(index);
            return (
              <div key={`${record.ProjectNumber}-${record.UnitUniqueNumber}-${index}`} className="card shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="text-muted small">Unit</div>
                      <div className="fw-semibold">{unitLabel || "-"}</div>
                      <div className="text-muted small">{record.AssetName}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => toggleExpanded(index)}>
                      {isExpanded ? "Collapse" : "Edit"}
                    </button>
                  </div>
                  <div className="row g-2 mt-2">
                    <div className="col-6">
                      <div className="text-muted small">Saleable</div>
                      <div>{record.SaleableArea}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Carpet</div>
                      <div>{record.CarpetArea}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Sold</div>
                      <div>{flagToBoolean(record.IsUnitSoldFlag) ? "Yes" : "No"}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Customer</div>
                      <div>{record.CustomerName || "-"}</div>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 border-top pt-3">
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <label className="form-label">Unit Sold</label>
                          <select
                            className="form-select form-select-sm"
                            value={record.IsUnitSoldFlag}
                            onChange={(event) => updateRecord(index, { IsUnitSoldFlag: booleanToFlag(event.target.value === "Y") })}
                          >
                            <option value="Y">Sold</option>
                            <option value="N">Unsold</option>
                          </select>
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">Customer Name</label>
                          <input
                            className="form-control form-control-sm"
                            value={record.CustomerName}
                            onChange={(event) => updateRecord(index, { CustomerName: event.target.value })}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">Mobile</label>
                          <input
                            className="form-control form-control-sm"
                            value={record.CustomerKycMobile}
                            onChange={(event) => updateRecord(index, { CustomerKycMobile: event.target.value })}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">Email</label>
                          <input
                            className="form-control form-control-sm"
                            type="email"
                            value={record.CustomerKycEmail}
                            onChange={(event) => updateRecord(index, { CustomerKycEmail: event.target.value })}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Sales Total</label>
                          <input
                            className="form-control form-control-sm"
                            value={record.SalesTotalAmount ?? ""}
                            onChange={(event) => updateRecord(index, { SalesTotalAmount: toNumberOrNull(event.target.value) })}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Demand Total</label>
                          <input
                            className="form-control form-control-sm"
                            value={record.DemandTotalAmount ?? ""}
                            onChange={(event) => updateRecord(index, { DemandTotalAmount: toNumberOrNull(event.target.value) })}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Received Total</label>
                          <input
                            className="form-control form-control-sm"
                            value={record.ReceivedTotalAmount ?? ""}
                            onChange={(event) => updateRecord(index, { ReceivedTotalAmount: toNumberOrNull(event.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PendingMisGridEditPage;
