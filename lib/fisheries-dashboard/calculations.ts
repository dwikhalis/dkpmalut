export type FishTripRow = { trip_id: string; tanggal: string; wpp?: string | null; alat_utama?: string | null; zonasi?: string | null; family?: string | null; nama_spesies?: string | null; total_tangkapan: number };
export type FishLengthRow = { id_trip: string; tanggal: string; wpp?: string | null; spesies: string; panjang?: number | null; fork_length?: number | null };
export type DashboardFilters = { wpp?: string; gear?: string; zonasi?: string; year?: number; month?: number; groupBy?: "family" | "species"; selectedGroup?: string };

function eligible(row: FishTripRow, filters: DashboardFilters) {
  const date = new Date(row.tanggal);
  return (!filters.wpp || row.wpp === filters.wpp) && (!filters.gear || row.alat_utama === filters.gear) && (!filters.zonasi || row.zonasi === filters.zonasi) && (!filters.year || date.getUTCFullYear() === filters.year) && (!filters.month || date.getUTCMonth() + 1 === filters.month);
}
function selected(row: FishTripRow, filters: DashboardFilters) {
  if (!filters.selectedGroup) return true;
  return filters.groupBy === "family" ? row.family === filters.selectedGroup : row.nama_spesies === filters.selectedGroup;
}
function monthKey(value: string) { const d = new Date(value); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
function sampleStdError(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) / Math.sqrt(values.length);
}

export function calculateCpue(rows: FishTripRow[], filters: DashboardFilters = {}) {
  const months = new Map<string, Map<string, number>>();
  rows.filter((row) => eligible(row, filters)).forEach((row) => {
    const key = monthKey(row.tanggal);
    const trips = months.get(key) ?? new Map<string, number>();
    if (!trips.has(row.trip_id)) trips.set(row.trip_id, 0);
    if (selected(row, filters)) trips.set(row.trip_id, (trips.get(row.trip_id) ?? 0) + Number(row.total_tangkapan || 0));
    months.set(key, trips);
  });
  return Array.from(months, ([month, trips]) => {
    const values = Array.from(trips.values());
    return { month, tripCount: trips.size, catchKg: values.reduce((a, b) => a + b, 0), cpue: values.reduce((a, b) => a + b, 0) / trips.size, standardError: sampleStdError(values) };
  }).sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateTotalLanding(rows: FishTripRow[], filters: DashboardFilters = {}) {
  const totals = new Map<string, number>();
  rows.filter((row) => eligible(row, filters) && selected(row, filters)).forEach((row) => totals.set(monthKey(row.tanggal), (totals.get(monthKey(row.tanggal)) ?? 0) + Number(row.total_tangkapan || 0)));
  return Array.from(totals, ([month, totalKg]) => ({ month, totalKg })).sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateComposition(rows: FishTripRow[], filters: DashboardFilters = {}, threshold = 0) {
  const totals = new Map<string, number>();
  rows.filter((row) => eligible(row, filters)).forEach((row) => { const key = row.nama_spesies || "Tidak diketahui"; totals.set(key, (totals.get(key) ?? 0) + Number(row.total_tangkapan || 0)); });
  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  if (grandTotal <= 0) return [];
  const output: Array<{ species: string; totalKg: number; percentage: number }> = [];
  let other = 0;
  totals.forEach((totalKg, species) => { const percentage = totalKg / grandTotal * 100; if (percentage < threshold) other += totalKg; else output.push({ species, totalKg, percentage }); });
  if (other > 0) output.push({ species: "Lainnya", totalKg: other, percentage: other / grandTotal * 100 });
  return output.sort((a, b) => b.totalKg - a.totalKg);
}

export function calculateLengthFrequency(rows: FishLengthRow[], measurement: "TL" | "FL", binWidth: number, reference?: { lm_cm?: number | null; lopt_cm?: number | null }) {
  const key = measurement === "TL" ? "panjang" : "fork_length";
  const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === "number" && value > 0);
  if (!values.length) return { bins: [], sampleCount: 0, minimum: null, maximum: null, mean: null, median: null, measurement, belowLm: null, betweenLmLopt: null, aboveLopt: null };
  const width = Number.isFinite(binWidth) && binWidth > 0 ? binWidth : 1;
  const minimum = Math.min(...values); const maximum = Math.max(...values); const start = Math.floor(minimum / width) * width;
  const counts = new Map<number, number>(); values.forEach((value) => { const lower = start + Math.floor((value - start) / width) * width; counts.set(lower, (counts.get(lower) ?? 0) + 1); });
  const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const lm = reference?.lm_cm; const lopt = reference?.lopt_cm;
  return { bins: Array.from(counts, ([lower, frequency]) => ({ lower, upper: lower + width, frequency })).sort((a, b) => a.lower - b.lower), sampleCount: values.length, minimum, maximum, mean: values.reduce((a, b) => a + b, 0) / values.length, median, measurement, belowLm: lm == null ? null : values.filter((v) => v < lm).length / values.length * 100, betweenLmLopt: lm == null || lopt == null ? null : values.filter((v) => v >= lm && v <= lopt).length / values.length * 100, aboveLopt: lopt == null ? null : values.filter((v) => v > lopt).length / values.length * 100 };
}
