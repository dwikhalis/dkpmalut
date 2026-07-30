import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLBIMetrics } from "./calculateLBIMetrics.ts";
import { createLengthBins } from "./createLengthBins.ts";

describe("calculateLBIMetrics", () => {
  const reference = { lm: 20, lopt: 30 };
  it("handles empty and invalid arrays", () => {
    assert.equal(calculateLBIMetrics([], reference).sampleSize, 0);
    assert.equal(calculateLBIMetrics([0, -1, Number.NaN], reference).meanLength, null);
  });
  it("calculates odd and even medians", () => {
    assert.equal(calculateLBIMetrics([1, 3, 2], reference).medianLength, 2);
    assert.equal(calculateLBIMetrics([1, 2, 3, 4], reference).medianLength, 2.5);
  });
  it("uses inclusive optimum boundaries and exclusive mega boundary", () => {
    const result = calculateLBIMetrics([20, 27, 33, 33.01], reference);
    assert.equal(result.pmat, 100);
    assert.equal(result.popt, 50);
    assert.equal(result.pmega, 25);
  });
  it("supports decimal lengths and small samples", () => {
    assert.equal(calculateLBIMetrics([1.25], { lm: 1.25, lopt: 2 }, 0.5).pmat, 100);
  });
});

describe("createLengthBins", () => {
  it("allocates exact boundaries into the next interval", () => {
    const bins = createLengthBins([1, 2, 2.5, 3], 1);
    assert.deepEqual(bins.map((bin) => bin.frequency), [1, 2, 1]);
  });
  it("rejects invalid widths and supports empty arrays", () => {
    assert.deepEqual(createLengthBins([], 1), []);
    assert.throws(() => createLengthBins([1], 0));
  });
});
