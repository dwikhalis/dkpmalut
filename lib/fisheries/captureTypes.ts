export const CAPTURE_TEMPLATE_VERSION = "1.0";
export const CAPTURE_CALCULATION_VERSION = "1.0";

export type CaptureTrip = {
  tripId: string;
  returnAt: string;
  departureAt: string;
  vesselKey?: string;
  primaryGear: string;
  wpp?: string;
  village?: string;
  landingLocation: string;
  fishingLocation?: string;
  zoning?: string;
  fishingDurationHours?: number;
  numberOfSettings?: number;
  numberOfHooks?: number;
  netLengthMetres?: number;
};
export type CaptureCatch = {
  tripId: string;
  speciesId: string;
  speciesName: string;
  family?: string;
  speciesGroup?: string;
  catchWeightKg?: number;
  individualCount?: number;
};
export type CaptureLength = {
  tripId: string;
  speciesId: string;
  measurementType: "total_length" | "fork_length";
  lengthCm: number;
};
export type CpueMethod =
  | "kg_per_trip"
  | "individuals_per_trip"
  | "kg_per_hour"
  | "kg_per_setting"
  | "kg_per_100_hooks"
  | "kg_per_100m_net";
