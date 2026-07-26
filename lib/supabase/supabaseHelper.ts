import { supabase } from "@/lib/supabase/supabaseClient";

export type Locale = "id" | "en";

export const deleteData = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
};

export const updateData = async (
  table: string,
  newData: object,
  id: string,
) => {
  const { error } = await supabase.from(table).update(newData).eq("id", id);
  if (error) throw error;
  return true;
};

export const getMessage = async () => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id ?? "",
    name: item.name ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    message: item.message ?? "",
    status: item.status ?? "",
    email_delivery_status: item.email_delivery_status ?? "not_attempted",
    email_sent_at: item.email_sent_at ?? "",
    email_delivery_error: item.email_delivery_error ?? "",
    created_at: item.created_at ?? "",
  }));
};

export const getDatasetPages = async (ownerId: string | "all") => {
  let query = supabase
    .from("datasets")
    .select("id, label, user_id, published, import_status, draft_expires_at")
    .order("label", { ascending: true });

  if (ownerId !== "all") query = query.eq("user_id", ownerId);

  const { data: datasets, error: datasetError } = await query;
  if (datasetError) throw datasetError;

  let mapQuery = supabase
    .from("map_datasets")
    .select("id, label, user_id, published, import_status, draft_expires_at")
    .order("label", { ascending: true });

  if (ownerId !== "all") mapQuery = mapQuery.eq("user_id", ownerId);

  const { data: maps, error: mapError } = await mapQuery;
  if (mapError) throw mapError;

  return [
    ...(datasets ?? []).map((item) => ({ ...item, kind: "dataset" as const })),
    ...(maps ?? []).map((item) => ({ ...item, kind: "map" as const })),
  ];
};

export async function getAppComponentConfig(
  component: string,
  locale: Locale = "id",
) {
  const { data, error } = await supabase
    .from("app_cms")
    .select("target, value, is_active")
    .eq("component", component)
    .eq("locale", locale);

  if (error) {
    console.error("Fetching App CMS configuration failed:", error.message);
    return {
      values: {} as Record<string, string>,
      visibility: {} as Record<string, boolean>,
    };
  }

  return (data ?? []).reduce(
    (result, row) => {
      result.values[row.target] = row.value ?? "";
      result.visibility[row.target] = row.is_active !== false;
      return result;
    },
    {
      values: {} as Record<string, string>,
      visibility: {} as Record<string, boolean>,
    },
  );
}

export function getImagePreviewUrl(value: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "/assets/image_placeholder.png";
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  return supabase.storage.from("images").getPublicUrl(trimmed).data.publicUrl;
}
