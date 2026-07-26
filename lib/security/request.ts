import crypto from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export function getClientAddress(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rejectOversizedBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
) {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { message: "Request terlalu besar." },
      { status: 413 },
    );
  }

  return null;
}

export async function enforceRateLimit({
  request,
  scope,
  limit,
  windowSeconds,
}: {
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
}) {
  const addressHash = crypto
    .createHash("sha256")
    .update(
      `${process.env.RATE_LIMIT_SALT || "development"}:${getClientAddress(request)}`,
    )
    .digest("hex");

  const { data, error } = await supabaseAdmin.rpc("consume_api_rate_limit", {
    p_limit_key: `${scope}:${addressHash}`,
    p_request_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate-limit backend failed:", { scope, code: error.code });

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "Layanan keamanan sementara tidak tersedia." },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }

    return null;
  }

  if (data !== true) {
    return NextResponse.json(
      {
        message: "Batas permintaan telah tercapai.",
        retryAfterSeconds: windowSeconds,
      },
      { status: 429, headers: { "Retry-After": String(windowSeconds) } },
    );
  }

  return null;
}

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(request: Request, token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret || !token) return false;

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const address = getClientAddress(request);
  if (address !== "unknown") form.set("remoteip", address);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form, cache: "no-store" },
  );

  if (!response.ok) return false;

  const result = (await response.json()) as TurnstileResult;
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
  const allowedHostnames = new Set(
    expectedHostname
      ? [
          expectedHostname,
          expectedHostname.startsWith("www.")
            ? expectedHostname.slice(4)
            : `www.${expectedHostname}`,
        ]
      : [],
  );
  const hostnameMatches =
    process.env.NODE_ENV !== "production" ||
    !expectedHostname ||
    allowedHostnames.has(result.hostname?.toLowerCase() || "");

  if (result.success !== true || !hostnameMatches) {
    console.warn("Turnstile verification rejected:", {
      errors: result["error-codes"] ?? [],
      hostnameMatches,
    });
  }

  return result.success === true && hostnameMatches;
}
