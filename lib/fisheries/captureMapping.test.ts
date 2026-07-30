import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  duplicateMappedTargets,
  normalizeCaptureHeader,
  suggestCaptureMapping,
} from "./captureMapping.ts";
describe("capture column mapping", () => {
  it("normalizes headers safely", () =>
    assert.equal(normalizeCaptureHeader(" Tanggal Pulang "), "tanggal_pulang"));
  it("suggests only role-compatible high-confidence aliases", () => {
    const map = suggestCaptureMapping("trips", [
      "ID Trip",
      "Tgl Pulang",
      "Nama Spesies",
    ]);
    assert.equal(map["ID Trip"], "trip_id");
    assert.equal(map["Tgl Pulang"], "return_at");
    assert.equal(map["Nama Spesies"], "");
  });
  it("detects duplicate targets", () =>
    assert.deepEqual(
      duplicateMappedTargets({ a: "trip_id", b: "trip_id", c: "" }),
      ["trip_id"],
    ));
});
