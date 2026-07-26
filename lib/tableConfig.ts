import { supabase } from "@/lib/supabase/supabaseClient";

export type ConfigLocale = "id" | "en";
export type LocalizedText = Record<ConfigLocale, string>;

export type ConfigItem = {
  key: string;
  short: LocalizedText;
  long: LocalizedText;
};

export type StaffTableConfig = {
  division_name: LocalizedText;
  division_items: ConfigItem[];
  position_name: LocalizedText;
  position_items: ConfigItem[];
  gender_name: LocalizedText;
  gender_items: ConfigItem[];
};

export type TagTableConfig = {
  tag_name: LocalizedText;
  tag_items: ConfigItem[];
};

export type TableConfigMap = {
  staff: StaffTableConfig;
  news: TagTableConfig;
  gallery: TagTableConfig;
};

export type ConfigTable = keyof TableConfigMap;

export async function getTableConfig<T extends ConfigTable>(table: T) {
  const { data, error } = await supabase
    .from("table_config")
    .select("config")
    .eq("table_name", table)
    .maybeSingle();

  if (error) throw error;
  return (data?.config ?? null) as TableConfigMap[T] | null;
}

export function localizedItem(
  items: ConfigItem[] | undefined,
  key: string | undefined,
  locale: ConfigLocale,
  form: "short" | "long" = "short",
) {
  if (!key) return "";
  const item = items?.find((candidate) => candidate.key === key);
  return item?.[form]?.[locale] || item?.short?.[locale] || key;
}
