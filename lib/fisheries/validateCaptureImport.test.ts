import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCaptureImport } from "./validateCaptureImport.ts";
const species = {
  "epinephelus-test": { id: "s1", scientificName: "Epinephelus test" },
};
describe("capture import validation", () => {
  it("requires core files and conditional analysis files", () => {
    const result = validateCaptureImport(
      {},
      {},
      {
        requireEffort: true,
        requireLengths: true,
      },
    );
    assert.deepEqual(
      result.issues.map((item) => item.code),
      [
        "trips_required",
        "catches_required",
        "effort_required",
        "lengths_required",
      ],
    );
  });
  it("validates relationships, dates, quantities, and exact species mappings", () => {
    const result = validateCaptureImport(
      {
        trips: [
          {
            trip_id: "T1",
            departure_at: "2026-01-02",
            return_at: "2026-01-01",
            primary_gear: "line",
            landing_location: "Port",
          },
        ],
        catches: [
          { source_key: "C1", trip_id: "missing", scientific_name: "Unknown" },
        ],
      },
      species,
    );
    assert.equal(
      result.issues.some((x) => x.code === "trip_time_order"),
      true,
    );
    assert.equal(
      result.issues.some((x) => x.code === "unknown_trip"),
      true,
    );
    assert.equal(
      result.issues.some((x) => x.code === "species_unresolved"),
      true,
    );
  });
  it("keeps repeated trip-species catches but warns", () => {
    const input = {
      trips: [
        {
          trip_id: "T1",
          departure_at: "2026-01-01",
          return_at: "2026-01-02",
          primary_gear: "line",
          landing_location: "Port",
        },
      ],
      catches: [
        {
          source_key: "C1",
          trip_id: "T1",
          scientific_name: "Epinephelus-test",
          catch_weight_kg: "1",
        },
        {
          source_key: "C2",
          trip_id: "T1",
          scientific_name: "Epinephelus-test",
          catch_weight_kg: "2",
        },
      ],
    };
    const result = validateCaptureImport(input, species);
    assert.equal(result.normalized.catches.length, 2);
    assert.equal(
      result.issues.some(
        (x) => x.code === "duplicate_trip_species" && x.severity === "warning",
      ),
      true,
    );
  });
  it("separates TL and FL and flags invalid effort", () => {
    const result = validateCaptureImport(
      {
        trips: [
          {
            trip_id: "T1",
            departure_at: "2026-01-01",
            return_at: "2026-01-02",
            primary_gear: "line",
            landing_location: "Port",
          },
        ],
        effort: [{ trip_id: "T1", number_of_hooks: "0" }],
        lengths: [
          {
            catch_source_key: "C1",
            scientific_name: "Epinephelus-test",
            measurement_type: "total_length",
            length_cm: "20",
          },
          {
            catch_source_key: "C1",
            scientific_name: "Epinephelus-test",
            measurement_type: "fork_length",
            length_cm: "18",
          },
        ],
      },
      species,
    );
    assert.equal(result.summary.validTl, 1);
    assert.equal(result.summary.validFl, 1);
    assert.equal(
      result.issues.some((x) => x.code === "invalid_effort"),
      true,
    );
  });
});
