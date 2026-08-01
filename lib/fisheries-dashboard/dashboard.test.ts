import { describe, expect, it } from "vitest";
import { DASHBOARD_TAB_ORDER, getTemplateColumns, isDashboardTab, sortDashboardTabs } from "./config";
import { parseAndValidateDashboardCsv, validateTripCsvForTabs } from "./csv";
import { calculateComposition, calculateCpue, calculateLengthFrequency, calculateTotalLanding, type FishTripRow } from "./calculations";

const tripHeader = "trip_id,tanggal,kode_lokasi,alat_utama,zonasi,family,nama_spesies,total_tangkapan";
const tripRows: FishTripRow[] = [
  { trip_id: "a", tanggal: "2026-01-02", wpp: "715", alat_utama: "Pancing", zonasi: "A", family: "Scombridae", nama_spesies: "Tuna", total_tangkapan: 10 },
  { trip_id: "a", tanggal: "2026-01-02", wpp: "715", alat_utama: "Pancing", zonasi: "A", family: "Carangidae", nama_spesies: "Layang", total_tangkapan: 4 },
  { trip_id: "b", tanggal: "2026-01-03", wpp: "715", alat_utama: "Pancing", zonasi: "A", family: "Carangidae", nama_spesies: "Layang", total_tangkapan: 6 },
];

describe("dashboard canonical configuration", () => {
  it("uses canonical ordering and rejects aliases", () => { expect(sortDashboardTabs(["composition", "cpue"])).toEqual(["cpue", "composition"]); expect(isDashboardTab("total-landing")).toBe(false); expect(DASHBOARD_TAB_ORDER).toHaveLength(4); });
  it("generates exact templates", () => { expect(getTemplateColumns("cpue")).toContain("trip_id"); expect(getTemplateColumns("lengthfrequency")).toContain("id_trip"); });
});

describe("CSV validation", () => {
  it("accepts quoted commas and empty trailing rows", () => { const result = parseAndValidateDashboardCsv(`${tripHeader}\nT1,2026-01-01,TTE,Pancing,A,Scombridae,"Tuna, Sirip Kuning",12.5\n,,,,,,,\n`, "cpue"); expect(result.valid).toBe(true); expect(result.totalRows).toBe(1); });
  it("validates one shared trip schema for all compatible dashboards", () => { const csv = `${tripHeader}\nT1,2026-01-01,TTE,Pancing,A,Scombridae,Tuna,2`; const result = validateTripCsvForTabs(csv, ["cpue", "totallanding", "composition"]); expect(result.cpue?.valid).toBe(true); expect(result.composition?.valid).toBe(true); expect(result.totallanding?.valid).toBe(true); });
  it.each([["bad date", `${tripHeader}\nT1,nope,TTE,Pancing,A,F,S,1`, "tanggal"], ["bad number", `${tripHeader}\nT1,2026-01-01,TTE,Pancing,A,F,S,abc`, "total_tangkapan"], ["negative catch", `${tripHeader}\nT1,2026-01-01,TTE,Pancing,A,F,S,-1`, "total_tangkapan"]])("rejects %s", (_name, csv, column) => { expect(parseAndValidateDashboardCsv(csv, "cpue").issues.some((x) => x.column === column && x.severity === "error")).toBe(true); });
  it("requires TL or FL and rejects invalid lengths", () => { const empty = parseAndValidateDashboardCsv("id_trip,tanggal,fishing_ground,alat_tangkap,family,spesies,panjang,fork_length\nA,2026-01-01,Halmahera,Pancing,Scombridae,Tuna,,", "lengthfrequency"); const invalid = parseAndValidateDashboardCsv("id_trip,tanggal,fishing_ground,alat_tangkap,family,spesies,panjang\nA,2026-01-01,Halmahera,Pancing,Scombridae,Tuna,0", "lengthfrequency"); expect(empty.valid).toBe(false); expect(invalid.valid).toBe(false); });
});

describe("fisheries calculations", () => {
  it("uses distinct all-trip CPUE denominator and zero selected catch", () => { const result = calculateCpue(tripRows, { groupBy: "species", selectedGroup: "Tuna" })[0]; expect(result.tripCount).toBe(2); expect(result.cpue).toBe(5); expect(result.standardError).toBe(5); });
  it("returns no CPUE row without eligible trips", () => expect(calculateCpue(tripRows, { wpp: "999" })).toEqual([]));
  it("sums monthly landing with filters", () => expect(calculateTotalLanding(tripRows, { zonasi: "A", groupBy: "family", selectedGroup: "Carangidae" })[0].totalKg).toBe(10));
  it("preserves composition totals and groups small categories", () => { const rows = [...tripRows, { ...tripRows[0], trip_id: "c", nama_spesies: "Tongkol", total_tangkapan: 1 }]; const result = calculateComposition(rows, {}, 10); expect(result.reduce((sum, x) => sum + x.percentage, 0)).toBeCloseTo(100); expect(result.find((x) => x.species === "Lainnya")?.totalKg).toBe(1); });
  it("handles zero composition safely", () => expect(calculateComposition([{ ...tripRows[0], total_tangkapan: 0 }])).toEqual([]));
  it("keeps TL and FL separate and calculates LBI indicators", () => { const rows = [{ id_trip: "a", tanggal: "2026-01-01", spesies: "Tuna", panjang: 10, fork_length: 50 }, { id_trip: "b", tanggal: "2026-01-01", spesies: "Tuna", panjang: 20, fork_length: 60 }]; const tl = calculateLengthFrequency(rows, "TL", 5, { lm_cm: 15, lopt_cm: 18 }); const fl = calculateLengthFrequency(rows, "FL", 10); expect(tl.maximum).toBe(20); expect(fl.minimum).toBe(50); expect(tl.belowLm).toBe(50); expect(tl.aboveLopt).toBe(50); });
});
