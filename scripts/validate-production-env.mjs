import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET",
  "TURNSTILE_EXPECTED_HOSTNAME",
  "RATE_LIMIT_SALT",
  "SMTP_HOST",
  "SMTP_PASSWORD",
  "SMTP_ADMIN_EMAIL",
  "CRON_SECRET",
];

const missing = required.filter((name) => !process.env[name]?.trim());
const errors = [];

if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false") {
  errors.push("SMTP_TLS_REJECT_UNAUTHORIZED must not be false");
}
if (missing.length) errors.push(`Missing: ${missing.join(", ")}`);

if (errors.length) {
  console.error(`Production environment validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Production environment validation passed.");
