export const FISHERIES_ANALYSES = [
  "lbi",
  "cpue",
  "total-landing",
  "landing-frequency",
  "catch-composition",
] as const;
export type FisheriesAnalysisType = (typeof FISHERIES_ANALYSES)[number];
export type AnalysisStatus =
  | "not_started"
  | "metadata"
  | "upload"
  | "validation"
  | "preview"
  | "completed";
export type DashboardConfiguration = {
  mode: "single" | "multiple";
  selectedAnalyses: FisheriesAnalysisType[];
  completedAnalyses: FisheriesAnalysisType[];
  activeAnalysis?: FisheriesAnalysisType;
  analysisProgress: Record<
    FisheriesAnalysisType,
    {
      selected: boolean;
      status: AnalysisStatus;
      lastStep?: number;
      completedAt?: string;
      validationStatus: "unknown" | "valid" | "warning" | "invalid";
    }
  >;
  sharedDatasetStatus:
    | "not_started"
    | "requirements_configured"
    | "uploaded"
    | "validated"
    | "imported";
  previewAvailable: boolean;
  calculationVersion: string;
  requirementSettings?: {
    cpueMethods: string[];
    compositionBases: string[];
    lbiMeasurementType?: "total_length" | "fork_length";
  };
};
export function createDashboardConfiguration(
  mode: "single" | "multiple",
  selected: FisheriesAnalysisType[],
): DashboardConfiguration {
  const unique = [...new Set(selected)];
  if (mode === "single" && unique.length !== 1)
    throw new Error("Single mode requires exactly one analysis.");
  if (mode === "multiple" && unique.length < 2)
    throw new Error("Multiple mode requires at least two analyses.");
  if (unique.some((x) => !FISHERIES_ANALYSES.includes(x)))
    throw new Error("Unknown analysis.");
  return {
    mode,
    selectedAnalyses: unique,
    completedAnalyses: [],
    activeAnalysis: unique[0],
    analysisProgress: Object.fromEntries(
      FISHERIES_ANALYSES.map((type) => [
        type,
        {
          selected: unique.includes(type),
          status: "not_started",
          validationStatus: "unknown",
        },
      ]),
    ) as DashboardConfiguration["analysisProgress"],
    sharedDatasetStatus: "not_started",
    previewAvailable: false,
    calculationVersion: "1.0",
    requirementSettings: {
      cpueMethods: unique.includes("cpue") ? ["kg_per_trip"] : [],
      compositionBases: unique.includes("catch-composition") ? ["weight"] : [],
      lbiMeasurementType: unique.includes("lbi") ? "total_length" : undefined,
    },
  };
}
export function updateAnalysisProgress(
  config: DashboardConfiguration,
  type: FisheriesAnalysisType,
  status: AnalysisStatus,
): DashboardConfiguration {
  if (!config.selectedAnalyses.includes(type))
    throw new Error("Analysis is not selected.");
  const completed = status === "completed";
  return {
    ...config,
    completedAnalyses: completed
      ? [...new Set([...config.completedAnalyses, type])]
      : config.completedAnalyses.filter((x) => x !== type),
    previewAvailable: completed || config.completedAnalyses.length > 0,
    analysisProgress: {
      ...config.analysisProgress,
      [type]: {
        ...config.analysisProgress[type],
        status,
        ...(completed ? { completedAt: new Date().toISOString() } : {}),
      },
    },
  };
}
export const canPublishDashboard = (config: DashboardConfiguration) =>
  config.selectedAnalyses.every((x) => config.completedAnalyses.includes(x));

export function changeSelectedAnalyses(
  config: DashboardConfiguration,
  selected: FisheriesAnalysisType[],
): DashboardConfiguration {
  const unique = [...new Set(selected)];
  if (
    !unique.length ||
    unique.some((item) => !FISHERIES_ANALYSES.includes(item))
  )
    throw new Error("At least one known analysis is required.");
  const selectedSet = new Set(unique);
  const completedAnalyses = config.completedAnalyses.filter((item) =>
    selectedSet.has(item),
  );
  return {
    ...config,
    mode: unique.length === 1 ? "single" : "multiple",
    selectedAnalyses: unique,
    completedAnalyses,
    activeAnalysis: selectedSet.has(config.activeAnalysis!)
      ? config.activeAnalysis
      : unique[0],
    previewAvailable: completedAnalyses.length > 0,
    analysisProgress: Object.fromEntries(
      FISHERIES_ANALYSES.map((type) => [
        type,
        {
          ...config.analysisProgress[type],
          selected: selectedSet.has(type),
        },
      ]),
    ) as DashboardConfiguration["analysisProgress"],
  };
}
