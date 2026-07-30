import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnv(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });
const failures = [];
const describeError = (error) =>
  [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
    error?.name,
    error?.cause?.code,
    error?.cause?.message,
  ]
    .filter(Boolean)
    .join(" · ") || "unknown connection error";
const tables = [
  "fisheries_datasets",
  "fishing_trips",
  "fishing_trip_catches",
  "fishing_trip_effort",
  "fish_length_measurements",
  "fisheries_import_batches",
  "fisheries_source_files",
  "fisheries_import_species_mappings",
  "dashboard_fisheries_sources",
];
for (const table of tables) {
  const { error } = await client
    .from(table)
    .select("*", { head: true, count: "exact" });
  if (error) failures.push(`table ${table}: ${describeError(error)}`);
}

const rpcChecks = [
  [
    "get_private_fisheries_analysis_snapshot",
    { p_fisheries_dataset_id: "00000000-0000-0000-0000-000000000000" },
  ],
  [
    "get_public_fisheries_dashboard_snapshot",
    { p_dashboard_id: "00000000-0000-0000-0000-000000000000" },
  ],
];
for (const [name, parameters] of rpcChecks) {
  const { error } = await client.rpc(name, parameters);
  if (error) failures.push(`rpc ${name}: ${describeError(error)}`);
}

const { data: buckets, error: bucketError } =
  await client.storage.listBuckets();
if (bucketError)
  failures.push(`storage buckets: ${describeError(bucketError)}`);
else if (!buckets?.some((bucket) => bucket.id === "fisheries-source-files"))
  failures.push("bucket fisheries-source-files: missing");

if (failures.length) {
  console.error("Fisheries schema validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(
  `Fisheries schema validation passed (${tables.length} tables, ${rpcChecks.length} RPCs, private bucket).`,
);
