import crypto from "node:crypto";

export type MidtransStatus = {
  status_code?: string;
  transaction_status?: string;
  fraud_status?: string;
};

export function createMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

export function secureHexEqual(received: string, expected: string) {
  if (!/^[a-f0-9]{128}$/i.test(received) || !/^[a-f0-9]{128}$/i.test(expected)) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function mapMidtransPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string,
) {
  if (transactionStatus === "settlement") return "paid";
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "paid" : "challenge";
  }
  if (transactionStatus === "pending") return "pending";
  if (transactionStatus === "expire") return "expired";
  if (transactionStatus === "cancel") return "cancelled";
  if (transactionStatus === "deny" || transactionStatus === "failure") return "failed";
  if (["refund", "partial_refund", "chargeback"].includes(transactionStatus)) {
    return "refunded";
  }
  return "pending";
}

export function isSuccessfulMidtransPayment(status: MidtransStatus) {
  return (
    status.status_code === "200" &&
    (status.transaction_status === "settlement" ||
      (status.transaction_status === "capture" && status.fraud_status === "accept"))
  );
}

export function addOneCalendarMonth(sourceDate: Date) {
  const result = new Date(sourceDate);
  const originalDate = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDate = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDate, lastDate));
  return result;
}
