import assert from "node:assert/strict";
import test from "node:test";

import {
  addOneCalendarMonth,
  createMidtransSignature,
  isSuccessfulMidtransPayment,
  mapMidtransPaymentStatus,
  secureHexEqual,
} from "../lib/tickets/paymentSecurity.ts";

test("validates Midtrans signatures without accepting malformed hex", () => {
  const signature = createMidtransSignature("ORDER-1", "200", "60000.00", "secret");
  assert.equal(secureHexEqual(signature, signature), true);
  assert.equal(secureHexEqual("0".repeat(128), signature), false);
  assert.equal(secureHexEqual("not-hex", signature), false);
});

test("only accepted settlement and capture payments are successful", () => {
  assert.equal(isSuccessfulMidtransPayment({ status_code: "200", transaction_status: "settlement" }), true);
  assert.equal(isSuccessfulMidtransPayment({ status_code: "200", transaction_status: "capture", fraud_status: "accept" }), true);
  assert.equal(isSuccessfulMidtransPayment({ status_code: "200", transaction_status: "capture", fraud_status: "challenge" }), false);
  assert.equal(isSuccessfulMidtransPayment({ status_code: "201", transaction_status: "settlement" }), false);
});

test("maps terminal and delayed Midtrans states", () => {
  assert.equal(mapMidtransPaymentStatus("refund"), "refunded");
  assert.equal(mapMidtransPaymentStatus("expire"), "expired");
  assert.equal(mapMidtransPaymentStatus("unknown"), "pending");
});

test("calendar-month expiry does not overflow month-end", () => {
  assert.equal(addOneCalendarMonth(new Date("2026-01-31T10:00:00Z")).toISOString(), "2026-02-28T10:00:00.000Z");
  assert.equal(addOneCalendarMonth(new Date("2024-01-31T10:00:00Z")).toISOString(), "2024-02-29T10:00:00.000Z");
});
