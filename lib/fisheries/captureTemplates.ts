import type { FisheriesAnalysisType } from "./dashboardOrchestration.ts";

export type CaptureTemplateSettings = {
  cpueMethods: Array<
    | "kg_per_trip"
    | "individuals_per_trip"
    | "kg_per_hour"
    | "kg_per_setting"
    | "kg_per_100_hooks"
    | "kg_per_100m_net"
  >;
  compositionBases: Array<"weight" | "individuals" | "trips">;
  lbiMeasurementType?: "total_length" | "fork_length";
};

export type GeneratedCaptureTemplate = {
  role: "trips" | "catches" | "lengths";
  filename: string;
  columns: string[];
  csv: string;
};

const csv = (columns: string[]) =>
  [`# FISHERIES_TEMPLATE_VERSION=1.0`, columns.join(",")].join("\r\n");

export function buildCaptureTemplates(
  analyses: FisheriesAnalysisType[],
  settings: CaptureTemplateSettings,
): GeneratedCaptureTemplate[] {
  const selected = new Set(analyses);
  const nonLbi = analyses.some((item) => item !== "lbi");
  const needsTrip =
    nonLbi ||
    selected.has("cpue") ||
    selected.has("total-landing") ||
    selected.has("landing-frequency") ||
    selected.has("catch-composition");

  const templates: GeneratedCaptureTemplate[] = [];
  if (needsTrip) {
    const columns = new Set([
      "trip_id",
      "departure_at",
      "return_at",
      "landing_location",
      "primary_gear",
    ]);
    if (settings.cpueMethods.includes("kg_per_hour"))
      columns.add("fishing_duration_hours");
    if (settings.cpueMethods.includes("kg_per_setting"))
      columns.add("number_of_settings");
    if (settings.cpueMethods.includes("kg_per_100_hooks"))
      columns.add("number_of_hooks");
    if (settings.cpueMethods.includes("kg_per_100m_net"))
      columns.add("net_length");
    [
      "village",
      "origin_port",
      "wpp",
      "fishing_location",
      "zoning",
      "vessel_code",
      "vessel_name",
    ].forEach((item) => columns.add(item));
    templates.push({
      role: "trips",
      filename: "trips.csv",
      columns: [...columns],
      csv: csv([...columns]),
    });
  }

  if (nonLbi) {
    const columns = new Set([
      "source_key",
      "trip_id",
      "original_species_name",
      "scientific_name",
    ]);
    const needsWeight =
      selected.has("total-landing") ||
      selected.has("cpue") ||
      (selected.has("catch-composition") &&
        settings.compositionBases.includes("weight"));
    const needsIndividuals =
      selected.has("total-landing") ||
      (selected.has("cpue") &&
        settings.cpueMethods.includes("individuals_per_trip")) ||
      (selected.has("catch-composition") &&
        settings.compositionBases.includes("individuals"));
    if (needsWeight) columns.add("catch_weight_kg");
    if (needsIndividuals) columns.add("individual_count");
    templates.push({
      role: "catches",
      filename: "catches.csv",
      columns: [...columns],
      csv: csv([...columns]),
    });
  }

  if (selected.has("lbi")) {
    const columns = [
      "catch_source_key",
      "trip_id",
      "original_species_name",
      "scientific_name",
      "measurement_type",
      "length_cm",
      "fish_sequence",
      "sampling_date",
      "sex",
    ];
    templates.push({
      role: "lengths",
      filename: "length_measurements.csv",
      columns,
      csv: csv(columns),
    });
  }
  return templates;
}
