import "server-only";

import crypto from "crypto";

const TICKET_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateTicketCode() {
  let value = "";

  for (let index = 0; index < 8; index += 1) {
    value += TICKET_CODE_ALPHABET[
      crypto.randomInt(0, TICKET_CODE_ALPHABET.length)
    ];
  }

  return `MALUT-${value.slice(0, 4)}-${value.slice(4)}`;
}

export function generateQrToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function isTicketCode(value: string) {
  return /^MALUT-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/.test(
    value.toUpperCase(),
  );
}
