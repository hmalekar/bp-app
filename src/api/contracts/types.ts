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
