import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublishDashboard,
  changeSelectedAnalyses,
  createDashboardConfiguration,
  updateAnalysisProgress,
} from "./dashboardOrchestration.ts";
import {
  getAnalysisRequirements,
  mergeAnalysisRequirements,
} from "./analysisRequirements.ts";
describe("dashboard orchestration", () => {
  it("enforces selection cardinality", () => {
    assert.throws(() => createDashboardConfiguration("single", []));
    assert.throws(() => createDashboardConfiguration("multiple", ["cpue"]));
    assert.equal(
      createDashboardConfiguration("single", ["lbi"]).selectedAnalyses.length,
      1,
    );
  });
  it("tracks analyses independently and gates preview/publication", () => {
    let config = createDashboardConfiguration("multiple", [
      "cpue",
      "total-landing",
    ]);
    config = updateAnalysisProgress(config, "cpue", "completed");
    assert.equal(config.previewAvailable, true);
    assert.equal(
      config.analysisProgress["total-landing"].status,
      "not_started",
    );
    assert.equal(canPublishDashboard(config), false);
    config = updateAnalysisProgress(config, "total-landing", "completed");
    assert.equal(canPublishDashboard(config), true);
  });

  it("adds and removes analyses without losing retained progress", () => {
    const initial = updateAnalysisProgress(
      createDashboardConfiguration("multiple", ["cpue", "total-landing"]),
      "cpue",
      "completed",
    );
    const changed = changeSelectedAnalyses(initial, [
      "cpue",
      "catch-composition",
    ]);
    assert.deepEqual(changed.completedAnalyses, ["cpue"]);
    assert.equal(changed.analysisProgress.cpue.status, "completed");
    assert.equal(changed.analysisProgress["total-landing"].selected, false);
    assert.equal(changed.analysisProgress["catch-composition"].selected, true);
  });
});
describe("analysis requirements", () => {
  it("keeps biological references LBI-only", () => {
    assert.equal(
      getAnalysisRequirements("lbi").some(
        (x) => x.key === "biological_reference",
      ),
      true,
    );
    assert.equal(
      getAnalysisRequirements("cpue").some(
        (x) => x.key === "biological_reference",
      ),
      false,
    );
  });
  it("merges duplicate fields and preserves consumers", () => {
    const fields = mergeAnalysisRequirements(["cpue", "total-landing"]);
    const trip = fields.find((x) => x.key === "trip_id");
    assert.deepEqual(trip?.requiredBy.sort(), ["cpue", "total-landing"]);
    assert.equal(fields.filter((x) => x.key === "trip_id").length, 1);
  });
  it("includes conditional CPUE effort fields", () =>
    assert.equal(
      getAnalysisRequirements("cpue").some(
        (x) => x.key === "number_of_hooks" && x.requirement === "conditional",
      ),
      true,
    ));
});
