import type { LengthBin } from "./lbiTypes.ts";

const tidy = (value: number) => Number(value.toFixed(6));

export function createLengthBins(values: readonly number[], binWidth = 1): LengthBin[] {
  if (!Number.isFinite(binWidth) || binWidth <= 0) {
    throw new Error("Bin width must be greater than zero.");
  }
  const lengths = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!lengths.length) return [];

  const minimum = Math.min(...lengths);
  const maximum = Math.max(...lengths);
  const start = Math.floor(minimum / binWidth) * binWidth;
  const binCount = Math.max(1, Math.floor((maximum - start) / binWidth) + 1);
  const bins = Array.from({ length: binCount }, (_, index) => {
    const binStart = tidy(start + index * binWidth);
    const binEnd = tidy(binStart + binWidth);
    return {
      binStart,
      binEnd,
      binMidpoint: tidy(binStart + binWidth / 2),
      label: `${binStart}–${binEnd}`,
      frequency: 0,
    };
  });

  lengths.forEach((value) => {
    const index = Math.min(Math.floor((value - start) / binWidth), bins.length - 1);
    bins[index].frequency += 1;
  });
  return bins;
}
