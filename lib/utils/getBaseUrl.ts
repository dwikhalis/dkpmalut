export function getBaseUrl(request?: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const candidate = configuredUrl || (request ? new URL(request.url).origin : "");

  if (!candidate) {
    throw new Error("NEXT_PUBLIC_SITE_URL belum dikonfigurasi.");
  }

  const url = new URL(candidate);
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

  if (process.env.NODE_ENV === "production" && isLocalhost) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL produksi tidak boleh menggunakan localhost.",
    );
  }

  return url.origin;
}
