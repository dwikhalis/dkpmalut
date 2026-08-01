import assert from "node:assert/strict";

import { DEFAULT_CONTACT_CALLING_CODE, contactPhoneCountries, isContactCallingCode } from "@/lib/contact/phoneCountries";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { normalizeSearch } from "@/lib/utils/normalizeSearch";
import {
  createDefaultChartConfig,
  createFiltersFromColumns,
  mergePublishedConfig,
  normalizeChartConfig,
  normalizeTableConfig,
  parsePublishedConfig,
} from "@/lib/utils/publishedConfig";
import { getUploadTimestamp } from "@/lib/utils/uploadTimestamp";

const columns = [
  { key: "district", label: "Kabupaten", inputType: "text" as const },
  { key: "species", label: "Spesies", inputType: "text" as const },
  { key: "catch", label: "Tangkapan", inputType: "number" as const },
];

describe("application utilities", () => {
  it("normalizes search input without losing internal spacing", () => {
    assert.equal(normalizeSearch("  PÉRikanan  Maluku  "), "perikanan  maluku");
  });

  it("resolves configured and request base URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", " https://dkp.example/path ");
    assert.equal(getBaseUrl(), "https://dkp.example");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    assert.equal(getBaseUrl(new Request("https://fallback.example/contact")), "https://fallback.example");
  });

  it("rejects missing and production-local base URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    assert.throws(() => getBaseUrl(), /belum dikonfigurasi/);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    assert.throws(() => getBaseUrl(), /tidak boleh menggunakan localhost/);
  });

  it("produces stable WIT upload timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    assert.equal(getUploadTimestamp(), "01022026_120405");
    vi.useRealTimers();
  });

  it("keeps Indonesia first and validates known calling codes", () => {
    assert.equal(contactPhoneCountries[0].id, "ID");
    assert.equal(contactPhoneCountries[0].code, DEFAULT_CONTACT_CALLING_CODE);
    assert.equal(isContactCallingCode("+62"), true);
    assert.equal(isContactCallingCode("+999999"), false);
  });
});

describe("published dataset configuration", () => {
  const filters = createFiltersFromColumns(columns);

  it("parses persisted JSON defensively", () => {
    assert.deepEqual(parsePublishedConfig('{"snapshotPath":"data.csv"}'), { snapshotPath: "data.csv" });
    assert.deepEqual(parsePublishedConfig("invalid"), {});
    assert.deepEqual(parsePublishedConfig(12), {});
  });

  it("creates filters and removes stale table keys", () => {
    assert.equal(filters[2].sort, "number-desc");
    const normalized = normalizeTableConfig(
      { visibleColumnKeys: ["district", "removed"], filterKeys: ["species", "removed"], sortKeys: ["catch"], sortKey: "removed", sortDirection: "desc" },
      columns,
      filters,
    );
    assert.deepEqual(normalized.visibleColumnKeys, ["district"]);
    assert.deepEqual(normalized.filterKeys, ["species"]);
    assert.equal(normalized.sortKey, "district");
    assert.equal(normalized.sortDirection, "desc");
  });

  it("normalizes chart selections against visible columns", () => {
    const table = normalizeTableConfig(
      { filterKeys: filters.map((filter) => filter.key) },
      columns,
      filters,
    );
    const defaults = createDefaultChartConfig(columns, table);
    assert.equal(defaults.categoryKey, "district");
    assert.equal(defaults.valueKey, "catch");
    const chart = normalizeChartConfig(
      { type: "histogram", valueMode: "sum_column", valueKey: "removed", seriesKey: null, histogramBins: 500, limit: -1, filterKeys: ["district", "removed"] },
      columns,
      table,
    );
    assert.equal(chart.valueKey, "catch");
    assert.equal(chart.seriesKey, null);
    assert.equal(chart.histogramBins, 50);
    assert.equal(chart.limit, 20);
    assert.deepEqual(chart.filterKeys, ["district"]);
  });

  it("merges partial persisted sections without discarding siblings", () => {
    const merged = mergePublishedConfig(
      { table: { sortKey: "species" }, chart: { type: "line" }, snapshotPath: "old.csv" },
      { chart: { type: "pie" } as never },
    );
    assert.equal(merged.table.sortKey, "species");
    assert.equal(merged.chart.type, "pie");
    assert.equal(merged.snapshotPath, "old.csv");
  });
});
