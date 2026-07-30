import type { CaptureCatch, CaptureTrip, CpueMethod } from "./captureTypes.ts";

const sum = (values: Array<number | undefined>) =>
  values.reduce<number>(
    (total, value) => total + (Number.isFinite(value) ? Number(value) : 0),
    0,
  );

export function calculateCaptureSummary(
  trips: CaptureTrip[],
  catches: CaptureCatch[],
) {
  const tripIds = new Set(trips.map((trip) => trip.tripId));
  const validCatches = catches.filter((item) => tripIds.has(item.tripId));
  return {
    tripCount: tripIds.size,
    vesselCount: new Set(trips.map((trip) => trip.vesselKey).filter(Boolean))
      .size,
    totalWeightKg: sum(validCatches.map((item) => item.catchWeightKg)),
    totalIndividuals: sum(validCatches.map((item) => item.individualCount)),
    grouperSpecies: new Set(
      validCatches
        .filter((item) => item.speciesGroup === "Kerapu")
        .map((item) => item.speciesId),
    ).size,
    snapperSpecies: new Set(
      validCatches
        .filter((item) => item.speciesGroup === "Kakap")
        .map((item) => item.speciesId),
    ).size,
  };
}

export function calculateCpue(
  trips: CaptureTrip[],
  catches: CaptureCatch[],
  method: CpueMethod,
) {
  const catchByTrip = new Map<string, { kg: number; individuals: number }>();
  catches.forEach((item) => {
    const value = catchByTrip.get(item.tripId) ?? { kg: 0, individuals: 0 };
    value.kg += item.catchWeightKg ?? 0;
    value.individuals += item.individualCount ?? 0;
    catchByTrip.set(item.tripId, value);
  });
  const usable = trips
    .filter((trip) => catchByTrip.has(trip.tripId))
    .filter((trip) => {
      if (method === "kg_per_hour") return (trip.fishingDurationHours ?? 0) > 0;
      if (method === "kg_per_setting") return (trip.numberOfSettings ?? 0) > 0;
      if (method === "kg_per_100_hooks") return (trip.numberOfHooks ?? 0) > 0;
      if (method === "kg_per_100m_net") return (trip.netLengthMetres ?? 0) > 0;
      return true;
    });
  const numerator = sum(
    usable.map((trip) =>
      method === "individuals_per_trip"
        ? catchByTrip.get(trip.tripId)?.individuals
        : catchByTrip.get(trip.tripId)?.kg,
    ),
  );
  const denominator =
    method === "kg_per_hour"
      ? sum(usable.map((t) => t.fishingDurationHours))
      : method === "kg_per_setting"
        ? sum(usable.map((t) => t.numberOfSettings))
        : method === "kg_per_100_hooks"
          ? sum(usable.map((t) => t.numberOfHooks)) / 100
          : method === "kg_per_100m_net"
            ? sum(usable.map((t) => t.netLengthMetres)) / 100
            : usable.length;
  return {
    value: denominator > 0 ? numerator / denominator : null,
    numerator,
    denominator,
    validTrips: usable.length,
    excludedTrips: trips.length - usable.length,
  };
}

export function landingFrequency(
  trips: CaptureTrip[],
  catches: CaptureCatch[],
) {
  const totalTrips = new Set(trips.map((trip) => trip.tripId)).size;
  const groups = new Map<
    string,
    { speciesName: string; trips: Set<string>; records: number }
  >();
  catches.forEach((item) => {
    const current = groups.get(item.speciesId) ?? {
      speciesName: item.speciesName,
      trips: new Set(),
      records: 0,
    };
    current.trips.add(item.tripId);
    current.records += 1;
    groups.set(item.speciesId, current);
  });
  return [...groups.entries()].map(([speciesId, value]) => ({
    speciesId,
    speciesName: value.speciesName,
    landingTripCount: value.trips.size,
    landingRecordCount: value.records,
    landingFrequencyPercentage: totalTrips
      ? (value.trips.size / totalTrips) * 100
      : 0,
  }));
}

export function catchComposition(
  trips: CaptureTrip[],
  catches: CaptureCatch[],
  basis: "weight" | "individuals" | "trips",
) {
  const totalTrips = new Set(trips.map((trip) => trip.tripId)).size;
  const grouped = new Map<
    string,
    { name: string; weight: number; individuals: number; trips: Set<string> }
  >();
  catches.forEach((item) => {
    const current = grouped.get(item.speciesId) ?? {
      name: item.speciesName,
      weight: 0,
      individuals: 0,
      trips: new Set(),
    };
    current.weight += item.catchWeightKg ?? 0;
    current.individuals += item.individualCount ?? 0;
    current.trips.add(item.tripId);
    grouped.set(item.speciesId, current);
  });
  const raw = [...grouped.entries()].map(([speciesId, item]) => ({
    speciesId,
    name: item.name,
    absolute:
      basis === "weight"
        ? item.weight
        : basis === "individuals"
          ? item.individuals
          : item.trips.size,
  }));
  const total =
    basis === "trips" ? totalTrips : sum(raw.map((item) => item.absolute));
  return raw.map((item) => ({
    ...item,
    percentage: total ? (item.absolute / total) * 100 : 0,
  }));
}
