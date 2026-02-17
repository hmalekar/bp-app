import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet } from "../api/client";
import { API_ENDPOINTS } from "../api/contracts/endpoints";
import type { PendingSalesMisRecordDto, SalesMisRecordDto, SalesMisRequestPayload } from "../api/contracts/types";

const flagToBoolean = (value?: string) => value?.toUpperCase() === "Y";

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

function PendingMisTableDrawerPage() {
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  const selected = selectedIndex !== null ? records[selectedIndex] : null;

  const updateSelected = (updates: Partial<SalesMisRecordDto>) => {
    if (selectedIndex === null) return;
    setRecords((prev) => prev.map((record, index) => (index === selectedIndex ? { ...record, ...updates } : record)));
  };

  if (!resolvedRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Pending MIS Table + Drawer</h2>
          <p className="text-muted">No pending MIS record was provided.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Back to dashboard
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
              <h2 className="h5 mb-1">Pending MIS · Table + Drawer</h2>
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
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Unit</th>
                  <th scope="col">Asset</th>
                  <th scope="col">Area</th>
                  <th scope="col">Sold</th>
                  <th scope="col">Customer</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(({ record, index }) => {
                  const unitLabel = [record.Floor, record.UnitNumber, record.UnitConfiguration].filter(Boolean).join(" / ");
                  return (
                    <tr
                      key={`${record.ProjectNumber}-${record.UnitUniqueNumber}-${index}`}
                      role="button"
                      onClick={() => setSelectedIndex(index)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{unitLabel || "-"}</td>
                      <td>{record.AssetName}</td>
                      <td>
                        <div className="small text-muted">Saleable {record.SaleableArea}</div>
                        <div className="small text-muted">Carpet {record.CarpetArea}</div>
                      </td>
                      <td>{flagToBoolean(record.IsUnitSoldFlag) ? "Sold" : "Unsold"}</td>
                      <td>{record.CustomerName || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`mis-drawer ${selected ? "is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="mis-drawer__backdrop" onClick={() => setSelectedIndex(null)} />
        <div className="mis-drawer__panel">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <div className="text-muted small">Unit details</div>
              <h3 className="h6 mb-0">
                {selected ? [selected.Floor, selected.UnitNumber, selected.UnitConfiguration].filter(Boolean).join(" / ") : "Select a unit"}
              </h3>
            </div>
            <button className="btn-close" onClick={() => setSelectedIndex(null)} aria-label="Close" />
          </div>

          {!selected ? (
            <div className="text-muted">Select a unit row to edit details.</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label">Unit Sold</label>
                  <select
                    className="form-select form-select-sm"
                    value={selected.IsUnitSoldFlag}
                    onChange={(event) => updateSelected({ IsUnitSoldFlag: event.target.value })}
                  >
                    <option value="Y">Sold</option>
                    <option value="N">Unsold</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Customer Name</label>
                  <input
                    className="form-control form-control-sm"
                    value={selected.CustomerName}
                    onChange={(event) => updateSelected({ CustomerName: event.target.value })}
                  />
                </div>
              </div>

              <fieldset disabled={!flagToBoolean(selected.IsUnitSoldFlag)}>
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Mobile</label>
                    <input
                      className="form-control form-control-sm"
                      value={selected.CustomerKycMobile}
                      onChange={(event) => updateSelected({ CustomerKycMobile: event.target.value })}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control form-control-sm"
                      type="email"
                      value={selected.CustomerKycEmail}
                      onChange={(event) => updateSelected({ CustomerKycEmail: event.target.value })}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Booking Date</label>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      value={selected.UnitBookingDate ?? ""}
                      onChange={(event) => updateSelected({ UnitBookingDate: event.target.value })}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Agreement Date</label>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      value={selected.UnitAgreementDate ?? ""}
                      onChange={(event) => updateSelected({ UnitAgreementDate: event.target.value })}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Sales Total</label>
                    <input
                      className="form-control form-control-sm"
                      value={selected.SalesTotalAmount ?? ""}
                      onChange={(event) => updateSelected({ SalesTotalAmount: toNumberOrNull(event.target.value) })}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Demand Total</label>
                    <input
                      className="form-control form-control-sm"
                      value={selected.DemandTotalAmount ?? ""}
                      onChange={(event) => updateSelected({ DemandTotalAmount: toNumberOrNull(event.target.value) })}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Received Total</label>
                    <input
                      className="form-control form-control-sm"
                      value={selected.ReceivedTotalAmount ?? ""}
                      onChange={(event) => updateSelected({ ReceivedTotalAmount: toNumberOrNull(event.target.value) })}
                    />
                  </div>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PendingMisTableDrawerPage;
