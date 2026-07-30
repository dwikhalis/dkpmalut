import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateCaptureSummary,
  calculateCpue,
  catchComposition,
  landingFrequency,
} from "./calculateCaptureMetrics.ts";
import type { CaptureCatch, CaptureTrip } from "./captureTypes.ts";
const trips: CaptureTrip[] = [
  {
    tripId: "T1",
    departureAt: "2026-01-01",
    returnAt: "2026-01-02",
    primaryGear: "line",
    landingLocation: "A",
    vesselKey: "V1",
    fishingDurationHours: 10,
    numberOfSettings: 2,
    numberOfHooks: 100,
  },
  {
    tripId: "T2",
    departureAt: "2026-01-02",
    returnAt: "2026-01-03",
    primaryGear: "line",
    landingLocation: "A",
    vesselKey: "V1",
    fishingDurationHours: 0,
  },
];
const catches: CaptureCatch[] = [
  {
    tripId: "T1",
    speciesId: "S1",
    speciesName: "A",
    speciesGroup: "Kerapu",
    catchWeightKg: 10,
    individualCount: 5,
  },
  {
    tripId: "T1",
    speciesId: "S1",
    speciesName: "A",
    speciesGroup: "Kerapu",
    catchWeightKg: 5,
    individualCount: 2,
  },
  {
    tripId: "T2",
    speciesId: "S2",
    speciesName: "B",
    speciesGroup: "Kakap",
    catchWeightKg: 20,
    individualCount: 4,
  },
];
describe("capture metrics", () => {
  it("deduplicates trips and vessels and aggregates catches/groups", () =>
    assert.deepEqual(calculateCaptureSummary(trips, catches), {
      tripCount: 2,
      vesselCount: 1,
      totalWeightKg: 35,
      totalIndividuals: 11,
      grouperSpecies: 1,
      snapperSpecies: 1,
    }));
  it("calculates nominal and effort CPUE with exclusions", () => {
    assert.equal(calculateCpue(trips, catches, "kg_per_trip").value, 17.5);
    assert.equal(calculateCpue(trips, catches, "kg_per_hour").value, 1.5);
    assert.equal(calculateCpue(trips, catches, "kg_per_hour").excludedTrips, 1);
    assert.equal(calculateCpue(trips, catches, "kg_per_100_hooks").value, 15);
  });
  it("uses distinct trips for landing frequency", () => {
    const result = landingFrequency(trips, catches);
    assert.equal(
      result.find((item) => item.speciesId === "S1")?.landingTripCount,
      1,
    );
    assert.equal(
      result.find((item) => item.speciesId === "S1")?.landingRecordCount,
      2,
    );
  });
  it("calculates independent composition bases and empty data", () => {
    assert.equal(
      catchComposition(trips, catches, "weight").find(
        (x) => x.speciesId === "S1",
      )?.percentage,
      (15 / 35) * 100,
    );
    assert.deepEqual(landingFrequency([], []), []);
    assert.equal(calculateCpue([], [], "kg_per_trip").value, null);
  });
});
