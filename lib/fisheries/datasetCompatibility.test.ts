import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkAnalysisCompatibility } from "./datasetCompatibility.ts";

describe("reusable fisheries dataset compatibility", () => {
  const inventory = {
    trip_id: { present: true, validCount: 20 },
    landing_date: { present: true, validCount: 20 },
    species: { present: true, validCount: 50 },
    fishing_gear: { present: true, validCount: 20 },
    catch_weight_kg: { present: true, validCount: 50, unit: "kg" },
  };
  it("reuses sufficient fields without requiring a new upload", () => {
    assert.equal(
      checkAnalysisCompatibility("cpue", inventory).compatible,
      true,
    );
  });
  it("reports unsupported conditional methods independently", () => {
    const result = checkAnalysisCompatibility("cpue", inventory);
    assert.equal(
      result.unavailableConditional.some(
        (item) => item.key === "fishing_duration_hours",
      ),
      true,
    );
  });
  it("keeps biological references as an LBI-only configuration dependency", () => {
    const result = checkAnalysisCompatibility("lbi", inventory);
    assert.equal(result.compatible, false);
    assert.equal(
      result.unavailableConditional.some(
        (item) => item.key === "biological_reference",
      ),
      true,
    );
  });
});
