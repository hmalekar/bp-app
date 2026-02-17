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
  NewDueMonth: number;
  NewDueMonthV: string;
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
}

export interface SalesMisImportResult {
  Success: boolean;
  ImportedCount: number;
  Errors: SalesMisRowError[];
}
