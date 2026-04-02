export type ApiRequestPayload = Record<string, unknown>;

export type ApiResponsePayload<TData = unknown> = {
  data: TData;
  message?: string;
};

export type ApiErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface LoginResponse {
  Email: string;
  Role: string;
  Name: string;
  Designation: string;
  Mobile: string;
  Organization: string;
}

export interface PendingSalesMisRecordDto {
  ProjectNumber: number;
  ProjectName: string;
  BorrowerCode: string;
  BorrowerName: string;
  LastSubmittedMonth: number;
  LastMisMonth: string;
  NewDueMonth: number;
  NewDueMonthV: string;
  IsDueMisUploaded: boolean;
  LatestWorkflowUser: string;
  LatestWorkflowStatus: string;
  LatestWorkflowComments: string;
  LatestWorkflowUserRole: string;
  NextApprovalUserRole: string;
  IsMisApproved: boolean;
}

export interface SalesMisRecordDto {
  YearMonth: number;
  ProjectNumber: number;
  AssetNumber: number;
  AssetName: string;
  Phase: string;
  Building: string;
  Floor: string;
  UnitNumber: string;
  UnitConfiguration: string;
  UnitTypeCode: string;
  SaleableArea: number;
  CarpetArea: number;
  CarpetAreaRera: number;
  UnitUniqueNumber: number;
  UnitOwnerCode: string;
  IsUnitSoldFlag: string;
  IsUnitRegisteredFlag: string;
  UnitRegistrationDate: string | null;
  UnitBookingDate: string | null;
  AllotmentLetterDate: string | null;
  UnitAgreementDate: string | null;
  CustomerName: string;
  CustomerKycAadhaarNumber: number | null;
  CustomerKycPan: string;
  CustomerKycMobile: string;
  CustomerKycEmail: string;
  CustomerKycAddress: string;
  IsNocIssuedFlag: string;
  NocNumber: string;
  SalesBasePrice: number | null;
  SalesStampDutyAmount: number | null;
  SalesRegistrationAmount: number | null;
  SalesOtherChargesAmount: number | null;
  SalesPassThroughCharges: number | null;
  SalesTaxesAmount: number | null;
  SalesTotalAmount: number | null;
  DemandBasePrice: number | null;
  DemandStampDutyAmount: number | null;
  DemandRegistrationAmount: number | null;
  DemandOtherChargesAmount: number | null;
  DemandPassThroughCharges: number | null;
  DemandTaxesAmount: number | null;
  DemandTotalAmount: number | null;
  ReceivedBasePrice: number | null;
  ReceivedStampDutyAmount: number | null;
  ReceivedRegistrationAmount: number | null;
  ReceivedOtherChargesAmount: number | null;
  ReceivedPassThroughCharges: number | null;
  ReceivedTaxesAmount: number | null;
  ReceivedTotalAmount: number | null;
  ModeOfFinanceCode: string;
  FinancialInstitutionName: string;
  PaymentPlanName: string;
  SourceOfCustomerCode: string;
  ChannelPartnerName: string;
  ChannelPartnerMobile: string;
  ChannelPartnerEmail: string;
  BrokerageAmount: number | null;
  ValidationErrors: string;
  Commentary: string;
  CreatedUserId: string;
  CreatedDate: string | null;
  LastModifiedUserId: string;
  LastModifiedDate: string | null;
}

export interface SalesMisRequestPayload {
  YearMonth: number;
  ProjectNumber: number;
  PreviousYearMonth: number;
}

export interface ImportSalesMisRequest {
  ProjectNumber: number;
  YearMonth: number;
  PreviousYearMonth: number;
  Errors: SalesMisRowError[];
}

export interface SalesMisRowError {
  // Period & Project
  YearMonth: number;
  ProjectNumber: number;
  AssetNumber: number;
  AssetName: string;
  // Unit Location
  Phase: string;
  Building: string;
  Floor: string;
  // Unit Details
  UnitNumber: string;
  UnitConfiguration: string;
  UnitTypeCode: string;
  SaleableArea: number;
  CarpetArea: number;
  CarpetAreaRera: number;
  ValidationErrors: string;
  ValidationWarnings: string;
  Commentary: string;
}

export interface SalesMisImportResult {
  Success: boolean;
  ImportedCount: number;
  Errors: SalesMisRowError[];
}

export interface SalesMisWorkflowUpdateRequest {
  YearMonth: number;
  ProjectNumber: number;
  WorkflowStatus: string;
  Comments: string;
}

export interface ValidationResponse {
  IsValid: boolean;
  Message: string;
}

export interface UnitWarningDto {
  UnitNumber: string;
  UnitUniqueNumber: number;
  Warnings: string;
  Commentary: string;
  HasCommentary: boolean;
}
export interface UnitAnomalyDto {
  UnitNumber: string;
  UnitUniqueNumber: number;
  ChangedFields: string[];
}
export interface UnitAmountChangeDto {
  UnitNumber: string;
  UnitUniqueNumber: number;
  PreviousDemand: number;
  CurrentDemand: number;
  DemandDifference: number;
  PreviousReceived: number;
  CurrentReceived: number;
  ReceivedDifference: number;
}
/* export interface SalesMisComparisonResultDto {
  UnitsSoldThisMonth: number;
  UnitsCancelledThisMonth: number;
  DemandRaisedThisMonth: number;
  DemandIncrease: number;
  DemandDecrease: number;
  ReceivedThisMonth: number;
  CollectionIncrease: number;
  CollectionDecrease: number;
  SalesValueIncrease: number;
  SalesValueDecrease: number;
  NewlySoldUnits: SalesMisRecordDto[];
  CancelledUnits: SalesMisRecordDto[];
  AmountChanges: UnitAmountChangeDto[];
  Anomalies: UnitAnomalyDto[];
  CurrentWarnings: UnitWarningDto[];
  TotalUnitsWithWarnings: number;
  TotalUnitsWithWarningsWithoutCommentary: number;
  TotalUnitsWithWarningsWithCommentary: number;
} */
export interface SalesMisComparisonResultDto {
  UnitsSoldDuringPeriod: number;
  UnitsCancelledDuringPeriod: number;
  NewlySoldUnits: SalesMisRecordDto[];
  CancelledUnits: SalesMisRecordDto[];
  TotalDemandTillDate: number;
  TotalCollectionTillDate: number;
  TotalSalesValueTillDate: number;
  IncrementalDemand: number;
  ReductionInDemand: number;
  IncrementalCollection: number;
  ReductionInCollection: number;
  IncrementalSalesValue: number;
  ReductionInSalesValue: number;
  AmountChanges: UnitAmountChangeDto[];
  UnitsWithWarnings: UnitWarningDto[];
  TotalUnitsWithWarnings: number;
}
export interface SalesCancellationRecordDto {
  YearMonth: number;
  ProjectNumber: number;
  AssetNumber: number;
  AssetName: string;
  Phase: string;
  Building: string;
  Floor: string;
  UnitNumber: string;
  UnitConfiguration: string;
  UnitTypeCode: string;
  SaleableArea: number;
  CarpetArea: number;
  CarpetAreaRera: number;
  UnitUniqueNumber: number;
  BookingDate: string;
  SalesBasePrice: number;
  TotalAmountReceived: number;
  CancellationCharges: number;
  RefundableAmount: number;
  AmountRefunded: number;
  ReasonForCancellation: string;
  Remarks: string;
}
export interface SalesCancellationRequest {
  ProjectNumber: number;
  YearMonth: number;
  CancelledUnits: SalesCancellationRecordDto[];
}
export interface SoldUnitRecordDto {
  AssetNumber: number;
  AssetName: string;
  Phase: string;
  Building: string;
  Floor: string;
  UnitNumber: string;
  UnitConfiguration: string;
  UnitTypeCode: string;
  SaleableArea: number;
  CarpetArea: number;
  CarpetAreaRera: number;
  UnitUniqueNumber: number;
  BookingDate: string;
  SalesBasePrice: number;
  TotalAmountReceived: number;
}
export interface ProjectRecordDto {
  ProjectNumber: number;
  ProjectName: string;
}
export interface CostCategoryMasterDto {
  Category: string;
  SubCategory: string;
  IsPartyAdditionalDataRequired: boolean;
  SkipGstPanValidation: boolean;
  SkipDocumentValidation: boolean;
  IsDebentureCost: boolean;
}
export interface DisbursementRequestCostRecordDto {
  RecordNumber: number;
  AssetNumber: number;
  Phase: string;
  Building: string;
  Category: string;
  SubCategory: string;
  PartyName: string;
  PartyGSTN: string;
  PartyPAN: string;
  PartyEmail: string;
  PartyMobile: string;
  CostReason: string;
  PoWoNumber: string;
  TotalOrderAmount: number;
  DocumentType: string;
  DocumentNumber: string;
  DocumentDate: string | null;
  PayableDays: number;
  DocumentAmount: number;
  GstAmount: number;
  TotalAmount: number;
  TdsAmount: number;
  AdvanceAdjustedAmount: number;
  RetentionAmount: number;
  AnyOtherDeductions: number;
  PayableAmount: number;
  ApprovedAmount: number;
  OutstandingAmount: number;
  SenderAccountNumber: string;
  SenderName: string;
  BeneficiaryAccountNumber: string;
  BeneficiaryAccountName: string;
  BeneficiaryIfsc: string;
  SenderToReceiverInfo: string;
  Status: string;
  ValidationErrors: string;
  AuditRemarks: string;
  Remarks: string;
}
export interface DisbursementRequestImportResult extends ValidationResponse {
  DisbursementRequestNumber: number;
  Records: DisbursementRequestCostRecordDto[];
}
export interface PendingDisbursementRequestDto {
  DrNumber: number;
  ProjectNumber: number;
  ProjectName: string;
  BorrowerCode: string;
  BorrowerName: string;
  LatestWorkflowUser: string;
  LatestWorkflowStatus: string;
  LatestWorkflowComments: string;
  LatestWorkflowUserRole: string;
  NextApprovalUserRole: string;
  Remarks: string;
  CreatedDate: string;
}
/** Per-line update for approved amount, status, and audit remarks (optional; used when approver sets approved amounts). */
export interface DisbursementRequestWorkflowUpdateRecord {
  RecordNumber: number;
  ApprovedAmount: number;
  Status: string;
  AuditRemarks?: string;
  Remarks?: string;
}

export interface DisbursementRequestWorkflowUpdateRequest {
  DrNumber: number;
  WorkflowStatus: string;
  Comments: string;
  /** Optional per-line approved amounts and status (A/R/P). */
  Records?: DisbursementRequestWorkflowUpdateRecord[];
}
export interface DisbursementRequestDto {
  Number: number;
  ProjectNumber: number;
  YearMonth: number;
  Remarks: string;
  ApprovalFlag: string;
  /** Workflow status caption from API (e.g. "Submitted for Approval", "Recalled"). */
  LatestWorkflowStatus?: string;
  Records: DisbursementRequestCostRecordDto[];
}
export interface ExistingSalesMisMonthDto {
  YearMonth: number;
  YearMonthString: string;
}
export interface ApprovedDisbursementRequestDto {
  DrNumber: number;
  ProjectNumber: number;
  ProjectName: string;
  YearMonth: number;
  Remarks: string;
  PayableAmount: number;
  ApprovedAmount: number;
}
export interface PendingNocRequestDto {
  YearMonth: number;
  ProjecNumber: number;
  ProjectName: string;
  AssetNumber: number;
  UnitUniqueNumber: number;
  Phase: string;
  Building: string;
  Floor: string;
  UnitNumber: string;
  UniConfiguration: string;
  UnitType: string;
  Area: number;
  CustomerName: string;
  CustomerKycAadhaarNumber: number | null;
  CustomerKycPan: string;
  CustomerKycMobile: string;
  CustomerKycEmail: string;
  CustomerKycAddress: string;
  SalesBasePrice: number;
  SalesStampDutyAmount: number;
  SalesRegistrationAmount: number;
  SalesOtherChargesAmount: number;
  SalesPassThroughCharges: number;
  SalesTaxesAmount: number;
  SalesTotalAmount: number;
  MspVarianceAmount: number;
  NocNumber: string;
  ApprovalFlag: string;
  LatestWorkflowUser: string;
  LatestWorkflowStatus: string;
  LatestWorkflowComments: string;
  LatestWorkflowUserRole: string;
  NextApprovalUserRole: string;
  Remarks: string;
  AttachmentFileName: string;
}
export interface UnitApplicableForNocDto {
  YearMonth: number;
  AssetNumber: number;
  Phase: string;
  Building: string;
  UnitUniqueNumber: number;
  Floor: string;
  UnitNumber: string;
  UniConfiguration: string;
  UnitType: string;
  Area: number;
  CustomerName: string;
  CustomerKycAadhaarNumber: number | null;
  CustomerKycPan: string;
  CustomerKycMobile: string;
  CustomerKycEmail: string;
  CustomerKycAddress: string;
  SalesBasePrice: number;
  SalesStampDutyAmount: number;
  SalesRegistrationAmount: number;
  SalesOtherChargesAmount: number;
  SalesPassThroughCharges: number;
  SalesTaxesAmount: number;
  SalesTotalAmount: number;
  MspVarianceAmount: number;
}
export interface UnitNocWorkflowUpdateRequest {
  YearMonth: number;
  ProjectNumber: number;
  AssetNumber: number;
  UnitUniqueNumber: number;
  WorkflowStatus: string;
  Comments: string;
}
export interface WorkflowRecordDto {
  SerialNo: number;
  Username: string;
  Role: string;
  StatusFlag: string;
  Comments: string;
  Date: string;
}
