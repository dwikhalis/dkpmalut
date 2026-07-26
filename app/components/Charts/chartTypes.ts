export type ChartDataset = {
  label: string;
  values: number[];
  backgroundColor?: string;
  backgroundColors?: string[];
  borderColor?: string;
};

export type BaseChartProps = {
  labels: string[];
  datasets: ChartDataset[];
  chartTitle: string;
  tooltipLabels?: string[];
  datalabel?: boolean;
  unit?: string;
};

export const DEFAULT_CHART_COLORS = [
  "rgba(53, 162, 235, 0.65)",
  "rgba(255, 99, 132, 0.65)",
  "rgba(75, 192, 192, 0.65)",
  "rgba(255, 159, 64, 0.65)",
  "rgba(153, 102, 255, 0.65)",
  "rgba(255, 205, 86, 0.65)",
  "rgba(54, 235, 162, 0.65)",
  "rgba(201, 203, 207, 0.65)",
];

export function formatChartValue(value: unknown, unit?: string) {
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const num = Number(value);

  if (!Number.isFinite(num)) return "0";

  if (unit === "ton") return `${nf.format(num / 1000)} ton`;
  if (unit === "kg") return `${nf.format(num)} kg`;

  return nf.format(num);
}

export function formatAxisValue(value: string | number, unit?: string) {
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const num = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(num)) return String(value);

  if (!unit) {
    if (num >= 1000000000) return `${nf.format(num / 1000000000)}B`;
    if (num >= 1000000) return `${nf.format(num / 1000000)}M`;
    if (num >= 1000) return `${nf.format(num / 1000)}K`;
    return nf.format(num);
  }

  if (unit === "kg") {
    if (num >= 1000000000) return `${nf.format(num / 1000000000)}B kg`;
    if (num >= 1000000) return `${nf.format(num / 1000000)}M kg`;
    if (num >= 1000) return `${nf.format(num / 1000)}K kg`;
    return `${nf.format(num)} kg`;
  }

  if (unit === "ton") {
    if (num >= 1000000000) return `${nf.format(num / 1000000000)}M ton`;
    if (num >= 1000000) return `${nf.format(num / 1000000)}K ton`;
    return `${nf.format(num / 1000)} ton`;
  }

  return nf.format(num);
}
