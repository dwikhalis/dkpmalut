export const LBI_TEMPLATE_VERSION = "1.0";
export const LBI_CALCULATION_VERSION = "1.0";
export const LBI_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const LBI_MAX_ROWS = 25_000;

export type LengthType = "total_length" | "fork_length" | "standard_length";
export type LengthUnit = "cm" | "mm";
export type ReferenceStatus = "draft" | "under_review" | "approved" | "archived";
export type ValidationSeverity = "error" | "warning" | "info";
export type NormalizedSex = "male" | "female" | "unknown";

export type BiologicalReference = {
  id: string;
  speciesId: string;
  linf: number;
  lm: number;
  lopt: number;
  lengthType: LengthType;
  lengthUnit: LengthUnit;
  sexApplicability: "combined" | "male" | "female";
  geographicArea?: string;
  stockName?: string;
  sourceTitle: string;
  sourceAuthors?: string;
  sourceYear?: number;
  sourceUrl?: string;
  doi?: string;
  notes?: string;
  status: ReferenceStatus;
  version: number;
  createdBy: string;
  reviewedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type LBIObservation = {
  sampleId: string;
  samplingDate: string;
  length: number;
  sex: NormalizedSex;
  weight?: number;
  maturityStage?: string;
  notes?: string;
  sourceRowNumber: number;
};

export type LengthBin = {
  binStart: number;
  binEnd: number;
  binMidpoint: number;
  label: string;
  frequency: number;
};

export type LBIMetrics = {
  sampleSize: number;
  minimumLength: number | null;
  maximumLength: number | null;
  meanLength: number | null;
  medianLength: number | null;
  pmat: number | null;
  popt: number | null;
  pmega: number | null;
  bins: LengthBin[];
  binWidth: number;
  calculatedAt: string;
};

export type ValidationIssue = {
  rowNumber?: number;
  column?: string;
  originalValue?: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  suggestedAction: string;
};

export type LBIValidationResult = {
  issues: ValidationIssue[];
  validRows: LBIObservation[];
  excludedRows: number;
  totalRows: number;
  duplicateSampleIds: number;
  summary: {
    validRows: number;
    rowsWithErrors: number;
    rowsWithWarnings: number;
    minimumLength: number | null;
    maximumLength: number | null;
    meanLength: number | null;
  };
};

export type LBIMetadata = {
  datasetName: string;
  speciesId: string;
  biologicalReferenceId: string;
  samplingLocation: string;
  latitude?: number;
  longitude?: number;
  landingSite: string;
  samplingStartDate: string;
  samplingEndDate: string;
  fishingGear: string;
  samplingMethod: "random" | "systematic" | "opportunistic" | "census" | "unknown";
  catchScope: "retained_catch" | "total_catch" | "landing_sample" | "market_sample" | "other";
  marketSorting: boolean;
  collectorName: string;
  collectorOrganization?: string;
  notes?: string;
  lengthType: LengthType;
  lengthUnit: LengthUnit;
};

