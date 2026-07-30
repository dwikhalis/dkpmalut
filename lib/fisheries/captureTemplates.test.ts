import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCaptureTemplates } from "./captureTemplates.ts";

describe("dynamic fisheries templates", () => {
  it("does not require lengths for landing frequency", () => {
    const templates = buildCaptureTemplates(["landing-frequency"], {
      cpueMethods: [],
      compositionBases: [],
    });
    assert.deepEqual(
      templates.map((item) => item.role),
      ["trips", "catches"],
    );
    assert.equal(
      templates
        .find((item) => item.role === "catches")
        ?.columns.includes("catch_weight_kg"),
      false,
    );
  });
  it("includes only selected CPUE denominators", () => {
    const templates = buildCaptureTemplates(["cpue"], {
      cpueMethods: ["kg_per_trip", "kg_per_hour"],
      compositionBases: [],
    });
    const trips = templates.find((item) => item.role === "trips")!;
    assert.equal(trips.columns.includes("fishing_duration_hours"), true);
    assert.equal(trips.columns.includes("number_of_hooks"), false);
  });
  it("adds lengths once for a multiple analysis containing LBI", () => {
    const templates = buildCaptureTemplates(["lbi", "total-landing"], {
      cpueMethods: [],
      compositionBases: [],
      lbiMeasurementType: "fork_length",
    });
    assert.equal(templates.filter((item) => item.role === "lengths").length, 1);
    assert.deepEqual(
      templates.map((item) => item.role),
      ["trips", "catches", "lengths"],
    );
  });
  it("creates the minimal standalone LBI length template", () => {
    assert.deepEqual(
      buildCaptureTemplates(["lbi"], {
        cpueMethods: [],
        compositionBases: [],
      }).map((item) => item.role),
      ["lengths"],
    );
  });
});
