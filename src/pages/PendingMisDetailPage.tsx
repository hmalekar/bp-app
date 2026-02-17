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

function PendingMisDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingRecord = location.state as PendingSalesMisRecordDto | null;

  const [records, setRecords] = useState<SalesMisRecordDto[]>([]);
  const [unitNumberFilter, setUnitNumberFilter] = useState("");
  const [unitConfigFilter, setUnitConfigFilter] = useState("");
  const [soldFilter, setSoldFilter] = useState<"all" | "sold" | "unsold">("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pendingRecord) return;
    let isMounted = true;

    const fetchMis = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const payload: SalesMisRequestPayload = {
          YearMonth: pendingRecord.NewDueMonth,
          ProjectNumber: pendingRecord.ProjectNumber,
          PreviousYearMonth: pendingRecord.LastSubmittedMonth,
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
  }, [pendingRecord]);

  const filteredRecords = useMemo(() => {
    const numberFilter = unitNumberFilter.trim().toLowerCase();
    const configFilter = unitConfigFilter.trim().toLowerCase();

    return records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => {
        if (soldFilter === "sold" && !flagToBoolean(record.IsUnitSoldFlag)) return false;
        if (soldFilter === "unsold" && flagToBoolean(record.IsUnitSoldFlag)) return false;

        if (numberFilter) {
          const unitNumber = record.UnitNumber?.toLowerCase() ?? "";
          const unitUnique = `${record.UnitUniqueNumber ?? ""}`.toLowerCase();
          if (!unitNumber.includes(numberFilter) && !unitUnique.includes(numberFilter)) {
            return false;
          }
        }

        if (configFilter) {
          const unitConfig = record.UnitConfiguration?.toLowerCase() ?? "";
          if (!unitConfig.includes(configFilter)) return false;
        }

        return true;
      });
  }, [records, soldFilter, unitConfigFilter, unitNumberFilter]);

  const groupedRecords = useMemo(() => {
    const grouped = new Map<string, { assetName: string; items: Array<{ record: SalesMisRecordDto; index: number }> }>();

    filteredRecords.forEach(({ record, index }) => {
      const assetName = record.AssetName || "Unassigned Asset";
      const existing = grouped.get(assetName);
      if (existing) {
        existing.items.push({ record, index });
      } else {
        grouped.set(assetName, { assetName, items: [{ record, index }] });
      }
    });

    return Array.from(grouped.values());
  }, [filteredRecords]);

  const updateRecord = (index: number, updates: Partial<SalesMisRecordDto>) => {
    setRecords((prev) => prev.map((record, recordIndex) => (recordIndex === index ? { ...record, ...updates } : record)));
  };

  if (!pendingRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Pending MIS Details</h2>
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
              <h2 className="h5 mb-1">Pending MIS Details</h2>
              <div className="text-muted">
                {pendingRecord.ProjectName} · {pendingRecord.BorrowerName}
              </div>
              <div className="text-muted small">
                Project #{pendingRecord.ProjectNumber} · Borrower {pendingRecord.BorrowerCode}
              </div>
            </div>
            <div className="text-end">
              <div className="text-muted small">Last submitted</div>
              <div>{pendingRecord.LastSubmittedMonth}</div>
              <div className="text-muted small mt-2">New due</div>
              <div>{pendingRecord.NewDueMonthV ?? pendingRecord.NewDueMonth}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small">Unit Number</label>
              <input
                className="form-control form-control-sm"
                placeholder="Search by unit number"
                value={unitNumberFilter}
                onChange={(event) => setUnitNumberFilter(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small">Unit Configuration</label>
              <input
                className="form-control form-control-sm"
                placeholder="Search by config"
                value={unitConfigFilter}
                onChange={(event) => setUnitConfigFilter(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-4 col-lg-3">
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
                  setUnitNumberFilter("");
                  setUnitConfigFilter("");
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

      <div className="mis-scroll-area overflow-auto">
        {isLoading ? (
          <div className="text-muted">Loading MIS records...</div>
        ) : records.length === 0 ? (
          <div className="text-muted">No MIS records found.</div>
        ) : groupedRecords.length === 0 ? (
          <div className="text-muted">No units match the selected filters.</div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {groupedRecords.map((group) => (
              <div key={group.assetName} className="card shadow-sm border-0">
                <div className="card-header bg-white border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small">Asset</div>
                      <h3 className="h6 mb-0">{group.assetName}</h3>
                    </div>
                    <div className="text-muted small">{group.items.length} units</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column">
                    {group.items.map(({ record, index }, unitIndex) => {
                      const isSold = flagToBoolean(record.IsUnitSoldFlag);
                      const unitLabel = [record.Floor, record.UnitNumber, record.UnitConfiguration].filter(Boolean).join(" / ");
                      const unitClasses = unitIndex === 0 ? "" : "border-top pt-3 mt-3";

                      return (
                        <div key={`${record.ProjectNumber}-${record.UnitUniqueNumber}-${index}`} className={unitClasses}>
                          <div className="row g-2 align-items-end">
                            <div className="col-12 col-md-6 col-lg-4">
                              <label className="form-label">Unit</label>
                              <input className="form-control" value={unitLabel || "-"} readOnly />
                            </div>
                            <div className="col-12 col-md-6 col-lg-2">
                              <label className="form-label">Saleable Area</label>
                              <input className="form-control" value={record.SaleableArea} readOnly />
                            </div>
                            <div className="col-12 col-md-6 col-lg-2">
                              <label className="form-label">Carpet Area</label>
                              <input className="form-control" value={record.CarpetArea} readOnly />
                            </div>
                            <div className="col-12 col-md-6 col-lg-2">
                              <label className="form-label">Carpet Area RERA</label>
                              <input className="form-control" value={record.CarpetAreaRera} readOnly />
                            </div>
                            <div className="col-12 col-md-6 col-lg-2">
                              <label className="form-label d-block">Unit Sold</label>
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={isSold}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      IsUnitSoldFlag: booleanToFlag(event.target.checked),
                                    })
                                  }
                                />
                                <label className="form-check-label">Sold</label>
                              </div>
                            </div>
                          </div>

                          <fieldset disabled={!isSold} className="mt-3">
                            <div className="row g-2">
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label d-block">Unit Registered</label>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={flagToBoolean(record.IsUnitRegisteredFlag)}
                                    onChange={(event) =>
                                      updateRecord(index, {
                                        IsUnitRegisteredFlag: booleanToFlag(event.target.checked),
                                      })
                                    }
                                  />
                                  <label className="form-check-label">Registered</label>
                                </div>
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Registration Date</label>
                                <input
                                  className="form-control"
                                  type="date"
                                  value={record.UnitRegistrationDate ?? ""}
                                  onChange={(event) => updateRecord(index, { UnitRegistrationDate: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Booking Date</label>
                                <input
                                  className="form-control"
                                  type="date"
                                  value={record.UnitBookingDate ?? ""}
                                  onChange={(event) => updateRecord(index, { UnitBookingDate: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Allotment Letter Date</label>
                                <input
                                  className="form-control"
                                  type="date"
                                  value={record.AllotmentLetterDate ?? ""}
                                  onChange={(event) => updateRecord(index, { AllotmentLetterDate: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Agreement Date</label>
                                <input
                                  className="form-control"
                                  type="date"
                                  value={record.UnitAgreementDate ?? ""}
                                  onChange={(event) => updateRecord(index, { UnitAgreementDate: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Customer Name</label>
                                <input
                                  className="form-control"
                                  value={record.CustomerName}
                                  onChange={(event) => updateRecord(index, { CustomerName: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Aadhaar Number</label>
                                <input
                                  className="form-control"
                                  value={record.CustomerKycAadhaarNumber ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      CustomerKycAadhaarNumber: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">PAN</label>
                                <input
                                  className="form-control"
                                  value={record.CustomerKycPan}
                                  onChange={(event) => updateRecord(index, { CustomerKycPan: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Mobile</label>
                                <input
                                  className="form-control"
                                  value={record.CustomerKycMobile}
                                  onChange={(event) => updateRecord(index, { CustomerKycMobile: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Email</label>
                                <input
                                  className="form-control"
                                  type="email"
                                  value={record.CustomerKycEmail}
                                  onChange={(event) => updateRecord(index, { CustomerKycEmail: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-6">
                                <label className="form-label">Address</label>
                                <input
                                  className="form-control"
                                  value={record.CustomerKycAddress}
                                  onChange={(event) => updateRecord(index, { CustomerKycAddress: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label d-block">NOC Issued</label>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={flagToBoolean(record.IsNocIssuedFlag)}
                                    onChange={(event) =>
                                      updateRecord(index, {
                                        IsNocIssuedFlag: booleanToFlag(event.target.checked),
                                      })
                                    }
                                  />
                                  <label className="form-check-label">Issued</label>
                                </div>
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">NOC Number</label>
                                <input
                                  className="form-control"
                                  value={record.NocNumber}
                                  onChange={(event) => updateRecord(index, { NocNumber: event.target.value })}
                                />
                              </div>

                              <div className="col-12">
                                <h4 className="h6 mt-2 mb-0">Sales</h4>
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Base Price</label>
                                <input
                                  className="form-control"
                                  value={record.SalesBasePrice ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesBasePrice: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Stamp Duty</label>
                                <input
                                  className="form-control"
                                  value={record.SalesStampDutyAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesStampDutyAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Registration</label>
                                <input
                                  className="form-control"
                                  value={record.SalesRegistrationAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesRegistrationAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Other Charges</label>
                                <input
                                  className="form-control"
                                  value={record.SalesOtherChargesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesOtherChargesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Pass Through</label>
                                <input
                                  className="form-control"
                                  value={record.SalesPassThroughCharges ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesPassThroughCharges: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Taxes</label>
                                <input
                                  className="form-control"
                                  value={record.SalesTaxesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesTaxesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Total</label>
                                <input
                                  className="form-control"
                                  value={record.SalesTotalAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SalesTotalAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>

                              <div className="col-12">
                                <h4 className="h6 mt-2 mb-0">Demand</h4>
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Base Price</label>
                                <input
                                  className="form-control"
                                  value={record.DemandBasePrice ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandBasePrice: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Stamp Duty</label>
                                <input
                                  className="form-control"
                                  value={record.DemandStampDutyAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandStampDutyAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Registration</label>
                                <input
                                  className="form-control"
                                  value={record.DemandRegistrationAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandRegistrationAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Other Charges</label>
                                <input
                                  className="form-control"
                                  value={record.DemandOtherChargesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandOtherChargesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Pass Through</label>
                                <input
                                  className="form-control"
                                  value={record.DemandPassThroughCharges ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandPassThroughCharges: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Taxes</label>
                                <input
                                  className="form-control"
                                  value={record.DemandTaxesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandTaxesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Total</label>
                                <input
                                  className="form-control"
                                  value={record.DemandTotalAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      DemandTotalAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>

                              <div className="col-12">
                                <h4 className="h6 mt-2 mb-0">Received</h4>
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Base Price</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedBasePrice ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedBasePrice: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Stamp Duty</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedStampDutyAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedStampDutyAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Registration</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedRegistrationAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedRegistrationAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Other Charges</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedOtherChargesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedOtherChargesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Pass Through</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedPassThroughCharges ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedPassThroughCharges: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Taxes</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedTaxesAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedTaxesAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-2">
                                <label className="form-label">Total</label>
                                <input
                                  className="form-control"
                                  value={record.ReceivedTotalAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ReceivedTotalAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>

                              <div className="col-12">
                                <h4 className="h6 mt-2 mb-0">Finance</h4>
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Mode of Finance</label>
                                <input
                                  className="form-control"
                                  value={record.ModeOfFinanceCode}
                                  onChange={(event) => updateRecord(index, { ModeOfFinanceCode: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Financial Institution</label>
                                <input
                                  className="form-control"
                                  value={record.FinancialInstitutionName}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      FinancialInstitutionName: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Payment Plan</label>
                                <input
                                  className="form-control"
                                  value={record.PaymentPlanName}
                                  onChange={(event) => updateRecord(index, { PaymentPlanName: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Source of Customer</label>
                                <input
                                  className="form-control"
                                  value={record.SourceOfCustomerCode}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      SourceOfCustomerCode: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Channel Partner</label>
                                <input
                                  className="form-control"
                                  value={record.ChannelPartnerName}
                                  onChange={(event) => updateRecord(index, { ChannelPartnerName: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Channel Partner Mobile</label>
                                <input
                                  className="form-control"
                                  value={record.ChannelPartnerMobile}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      ChannelPartnerMobile: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Channel Partner Email</label>
                                <input
                                  className="form-control"
                                  type="email"
                                  value={record.ChannelPartnerEmail}
                                  onChange={(event) => updateRecord(index, { ChannelPartnerEmail: event.target.value })}
                                />
                              </div>
                              <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label">Brokerage Amount</label>
                                <input
                                  className="form-control"
                                  value={record.BrokerageAmount ?? ""}
                                  onChange={(event) =>
                                    updateRecord(index, {
                                      BrokerageAmount: toNumberOrNull(event.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </fieldset>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PendingMisDetailPage;
