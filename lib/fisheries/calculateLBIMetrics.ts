import type { LBIMetrics } from "./lbiTypes.ts";
import { createLengthBins } from "./createLengthBins.ts";

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validLengths(values: readonly number[]) {
  return values.filter((value) => Number.isFinite(value) && value > 0);
}

export function calculateLBIMetrics(
  input: readonly number[],
  reference: { lm: number; lopt: number },
  binWidth = 1,
): LBIMetrics {
  const lengths = validLengths(input).sort((a, b) => a - b);
  const count = lengths.length;
  const middle = Math.floor(count / 2);
  const percentage = (matches: number) => count ? round((matches / count) * 100) : null;

  return {
    sampleSize: count,
    minimumLength: count ? lengths[0] : null,
    maximumLength: count ? lengths[count - 1] : null,
    meanLength: count ? round(lengths.reduce((sum, value) => sum + value, 0) / count) : null,
    medianLength: count
      ? round(count % 2 ? lengths[middle] : (lengths[middle - 1] + lengths[middle]) / 2)
      : null,
    pmat: percentage(lengths.filter((value) => value >= reference.lm).length),
    popt: percentage(
      lengths.filter(
        (value) => value >= 0.9 * reference.lopt && value <= 1.1 * reference.lopt,
      ).length,
    ),
    pmega: percentage(lengths.filter((value) => value > 1.1 * reference.lopt).length),
    bins: createLengthBins(lengths, binWidth),
    binWidth,
    calculatedAt: new Date().toISOString(),
  };
}
