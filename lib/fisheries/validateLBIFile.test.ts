import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSex, validateLbiRows, validateReferenceForApproval } from "./validateLBIFile.ts";

describe("LBI validation", () => {
  it("normalizes Indonesian and English sex aliases", () => {
    assert.equal(normalizeSex("Jantan"), "male");
    assert.equal(normalizeSex("Betina"), "female");
    assert.equal(normalizeSex("Tidak diketahui"), "unknown");
  });
  it("does not require Lm below Lopt", () => {
    const result = validateReferenceForApproval({ linf: 100, lm: 60, lopt: 50 });
    assert.deepEqual(result.errors, []);
    assert.equal(result.warnings.length, 1);
  });
  it("blocks duplicate IDs and dates outside the period but warns above Linf", () => {
    const result = validateLbiRows({
      rows: [
        { id: "A", date: "2026-01-05", len: "130" },
        { id: "A", date: "2025-01-05", len: "25" },
      ],
      mapping: { id: "sample_id", date: "sampling_date", len: "length" },
      metadata: {
        datasetName: "Test", speciesId: "s", biologicalReferenceId: "r", samplingLocation: "x",
        landingSite: "x", samplingStartDate: "2026-01-01", samplingEndDate: "2026-01-31",
        fishingGear: "x", samplingMethod: "random", catchScope: "landing_sample", marketSorting: false,
        collectorName: "x", lengthType: "total_length", lengthUnit: "cm",
      },
      reference: { linf: 100, lm: 20, lopt: 30, lengthType: "total_length", lengthUnit: "cm" },
    });
    assert.equal(result.issues.some((item) => item.code === "above_linf" && item.severity === "warning"), true);
    assert.equal(result.issues.some((item) => item.code === "duplicate_sample_id" && item.severity === "error"), true);
    assert.equal(result.issues.some((item) => item.code === "date_outside_period" && item.severity === "error"), true);
  });
});
