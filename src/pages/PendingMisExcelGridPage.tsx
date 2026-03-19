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

function PendingMisExcelGridPage() {
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const updateRecord = (index: number, updates: Partial<SalesMisRecordDto>) => {
    setRecords((prev) => prev.map((record, recordIndex) => (recordIndex === index ? { ...record, ...updates } : record)));
  };

  if (!resolvedRecord) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-2">Pending MIS · Excel Grid</h2>
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
              <h2 className="h5 mb-1">Pending MIS · Excel Grid</h2>
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

      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

      {isLoading ? (
        <div className="text-muted">Loading MIS records...</div>
      ) : records.length === 0 ? (
        <div className="text-muted">No MIS records found.</div>
      ) : (
        <div className="excel-grid">
          <table className="table table-bordered align-middle mb-0">
            <thead>
              <tr>
                <th>AssetName</th>
                <th>Floor</th>
                <th>UnitNumber</th>
                <th>UnitConfiguration</th>
                <th>SaleableArea</th>
                <th>CarpetArea</th>
                <th>CarpetAreaRera</th>
                <th>IsUnitSoldFlag</th>
                <th>IsUnitRegisteredFlag</th>
                <th>UnitRegistrationDate</th>
                <th>UnitBookingDate</th>
                <th>AllotmentLetterDate</th>
                <th>UnitAgreementDate</th>
                <th>CustomerName</th>
                <th>CustomerKycAadhaarNumber</th>
                <th>CustomerKycPan</th>
                <th>CustomerKycMobile</th>
                <th>CustomerKycEmail</th>
                <th>CustomerKycAddress</th>
                <th>IsNocIssuedFlag</th>
                <th>NocNumber</th>
                <th>SalesBasePrice</th>
                <th>SalesStampDutyAmount</th>
                <th>SalesRegistrationAmount</th>
                <th>SalesOtherChargesAmount</th>
                <th>SalesPassThroughCharges</th>
                <th>SalesTaxesAmount</th>
                <th>SalesTotalAmount</th>
                <th>DemandBasePrice</th>
                <th>DemandStampDutyAmount</th>
                <th>DemandRegistrationAmount</th>
                <th>DemandOtherChargesAmount</th>
                <th>DemandPassThroughCharges</th>
                <th>DemandTaxesAmount</th>
                <th>DemandTotalAmount</th>
                <th>ReceivedBasePrice</th>
                <th>ReceivedStampDutyAmount</th>
                <th>ReceivedRegistrationAmount</th>
                <th>ReceivedOtherChargesAmount</th>
                <th>ReceivedPassThroughCharges</th>
                <th>ReceivedTaxesAmount</th>
                <th>ReceivedTotalAmount</th>
                <th>ModeOfFinanceCode</th>
                <th>FinancialInstitutionName</th>
                <th>PaymentPlanName</th>
                <th>SourceOfCustomerCode</th>
                <th>ChannelPartnerName</th>
                <th>ChannelPartnerMobile</th>
                <th>ChannelPartnerEmail</th>
                <th>BrokerageAmount</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const isSold = flagToBoolean(record.IsUnitSoldFlag);
                return (
                  <tr key={`${record.ProjectNumber}-${record.UnitUniqueNumber}-${index}`}>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.YearMonth} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.ProjectNumber} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.AssetNumber} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.AssetName} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.Phase} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.Building} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.Floor} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.UnitNumber} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.UnitConfiguration} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.UnitTypeCode} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.SaleableArea} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.CarpetArea} readOnly />
                    </td>
                    <td>
                      <input className="form-control form-control-sm" value={record.CarpetAreaRera} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.UnitUniqueNumber} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.UnitOwnerCode} readOnly />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={flagToBoolean(record.IsUnitSoldFlag)}
                        onChange={(event) => updateRecord(index, { IsUnitSoldFlag: booleanToFlag(event.target.checked) })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={flagToBoolean(record.IsUnitRegisteredFlag)}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { IsUnitRegisteredFlag: booleanToFlag(event.target.checked) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={record.UnitRegistrationDate ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { UnitRegistrationDate: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={record.UnitBookingDate ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { UnitBookingDate: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={record.AllotmentLetterDate ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { AllotmentLetterDate: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={record.UnitAgreementDate ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { UnitAgreementDate: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.CustomerName}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.CustomerKycAadhaarNumber ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerKycAadhaarNumber: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.CustomerKycPan}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerKycPan: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.CustomerKycMobile}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerKycMobile: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="email"
                        value={record.CustomerKycEmail}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerKycEmail: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.CustomerKycAddress}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { CustomerKycAddress: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={flagToBoolean(record.IsNocIssuedFlag)}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { IsNocIssuedFlag: booleanToFlag(event.target.checked) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.NocNumber}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { NocNumber: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesBasePrice ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesBasePrice: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesStampDutyAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesStampDutyAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesRegistrationAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesRegistrationAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesOtherChargesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesOtherChargesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesPassThroughCharges ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesPassThroughCharges: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesTaxesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesTaxesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SalesTotalAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SalesTotalAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandBasePrice ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandBasePrice: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandStampDutyAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandStampDutyAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandRegistrationAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandRegistrationAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandOtherChargesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandOtherChargesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandPassThroughCharges ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandPassThroughCharges: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandTaxesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandTaxesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.DemandTotalAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { DemandTotalAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedBasePrice ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedBasePrice: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedStampDutyAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedStampDutyAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedRegistrationAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedRegistrationAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedOtherChargesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedOtherChargesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedPassThroughCharges ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedPassThroughCharges: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedTaxesAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedTaxesAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ReceivedTotalAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ReceivedTotalAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ModeOfFinanceCode}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ModeOfFinanceCode: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.FinancialInstitutionName}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { FinancialInstitutionName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.PaymentPlanName}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { PaymentPlanName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.SourceOfCustomerCode}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { SourceOfCustomerCode: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ChannelPartnerName}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ChannelPartnerName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.ChannelPartnerMobile}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ChannelPartnerMobile: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="email"
                        value={record.ChannelPartnerEmail}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { ChannelPartnerEmail: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={record.BrokerageAmount ?? ""}
                        disabled={!isSold}
                        onChange={(event) => updateRecord(index, { BrokerageAmount: toNumberOrNull(event.target.value) })}
                      />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.ValidationErrors} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.CreatedUserId} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.CreatedDate ?? ""} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.LastModifiedUserId} readOnly />
                    </td>
                    <td className="d-none">
                      <input className="form-control form-control-sm" value={record.LastModifiedDate ?? ""} readOnly />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PendingMisExcelGridPage;
