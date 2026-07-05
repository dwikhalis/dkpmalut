import { supabase } from "@/lib/supabase/supabaseClient";
// import Router from "next/navigation";

export const getNews = async () => {
  const { data, error } = await supabase.from("news").select("*");
  if (error) {
    alert("Get News Gagal!");
    console.error(error);
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id ?? "",
    image: item.image ?? "",
    tag: item.tag ?? "",
    date: item.date ?? "",
    title: item.title ?? "",
    content: item.content ?? "",
    source: item.source ?? "",
  }));
};

export const getGallery = async () => {
  const { data, error } = await supabase.from("gallery").select("*");
  if (error) {
    alert("Get gallery Gagal!");
    console.error(error);
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id ?? "",
    image: item.image ?? "",
    tag: item.tag ?? "",
    title: item.title ?? "",
    date: item.date ?? "",
    description: item.description ?? "",
  }));
};

export const getStaff = async () => {
  const { data, error } = await supabase.from("staff").select("*");

  if (error) {
    alert("Get staff Gagal!");
    console.error(error);
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id ?? "",
    name: item.name ?? "",
    title: item.title ?? "",
    division: item.division ?? "",
    photo: item.photo ?? "",
    gender: item.gender ?? "",
  }));
};

export async function updateDatasetRows<T extends { id: string }>(
  tableName: string,
  rows: T[],
) {
  if (rows.length === 0) return [];

  const results = await Promise.all(
    rows.map(async (row) => {
      const { id, ...values } = row;

      const { data, error } = await supabase
        .from(tableName)
        .update(values)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    }),
  );

  return results;
}

export const getUserEmailList = async (email: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (error) {
    // Optional: check specific error type
    if (error.code === "PGRST116") {
      // No rows found
      return false;
    }

    throw error; // real error (connection, permission, etc.)
  }

  return data.id;
};

export const deleteData = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    alert("Delete staff Gagal!");
    console.error(error);
    throw error;
  }

  return true;
};

export const updateData = async (
  table: string,
  newData: object,
  id: string,
) => {
  const { error } = await supabase.from(table).update(newData).eq("id", id);

  if (error) {
    alert("Update staff Gagal!");
    console.error(error);
    throw error;
  }

  return true;
};

type NeqFilter = {
  column: string;
  value: string | number | boolean;
};

export const getNumOf = async (dataset: string, filters: NeqFilter[] = []) => {
  let query = supabase
    .from(dataset)
    .select("id", { count: "exact", head: true });

  filters.forEach((filter) => {
    query = query.neq(filter.column, filter.value);
  });

  const { count, error } = await query;

  if (error) {
    alert("Fetching numOf Data failed");
    console.error(error);
    throw error;
  }

  return count ?? 0;
};

export const getNumNewMessage = async () => {
  const { count, error } = await supabase
    .from("message")
    .select("id", { count: "exact", head: true })
    .eq("status", "baru");

  if (error) {
    alert("Fetching numOf New Message failed");
    console.error(error);
    throw error;
  }

  return count ?? 0;
};

export const getMessage = async () => {
  const { data, error } = await supabase.from("message").select("*");

  if (error) {
    alert("Fetching messages failed");
    console.error(error);
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id ?? "",
    name: item.name ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    message: item.message ?? "",
    status: item.status ?? "",
    created_at: item.created_at ?? "",
  }));
};

export const getColdChain = async () => {
  const { data, error } = await supabase.from("cold_chain").select("*");

  if (error) {
    alert("Fetching cold chain failed");
    console.error(error);
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id ?? "",
    created_at: item.created_at ?? "",
    area: item.area ?? "",
    kab: item.kab ?? "",
    kec: item.kec ?? "",
    kel: item.kel ?? "",
    type: item.type ?? "",
    kodkws: item.kodkws ?? "",
    year: item.year ?? "",
    level: item.level ?? "",
    name: item.name ?? "",
    es_pabrik: item.es_pabrik ?? "",
    es_pabrik_jum_unit: item.es_pabrik_jum_unit ?? "",
    es_pabrik_kondisi: item.es_pabrik_kondisi ?? "",
    es_pabrik_tahun: item.es_pabrik_tahun ?? "",
    abf: item.abf ?? "",
    abf_jum_unit: item.abf_jum_unit ?? "",
    abf_kondisi: item.abf_kondisi ?? "",
    abf_tahun: item.abf_tahun ?? "",
    es_storage: item.es_storage ?? "",
    es_storage_jum_unit: item.es_storage_jum_unit ?? "",
    es_storage_kondisi: item.es_storage_kondisi ?? "",
    es_storage_tahun: item.es_storage_tahun ?? "",
    cs: item.cs ?? "",
    cs_jum_unit: item.cs_jum_unit ?? "",
    cs_kondisi: item.cs_kondisi ?? "",
    cs_tahun: item.cs_tahun ?? "",
    cpf: item.cpf ?? "",
    cpf_jum_unit: item.cpf_jum_unit ?? "",
    cpf_kondisi: item.cpf_kondisi ?? "",
    cpf_tahun: item.cpf_tahun ?? "",
    lon: item.lon ?? "",
    lat: item.lat ?? "",
    desc: item.desc ?? "",
  }));
};

// ! FOR ACTUAL DATA (TANGKAP, BUDIDAYA, COLD_CHAIN, ETC.)

//! GET DATASET (ALL DATA)
export const getDataset = async (dataset: string) => {
  const { data, error } = await supabase.from(dataset).select("*");

  if (error) {
    alert(`Get dataset ${dataset} Gagal!`);
    console.error(error);
    throw error;
  }

  return data || [];
};

//! GET INTERNAL DATASET PAGES
export const getInternalDatasetPages = async () => {
  const { data, error } = await supabase
    .from("datasets")
    .select("id, name, table")
    .order("name", { ascending: true });

  if (error) {
    alert(`Get dataset Internal Gagal!`);
    console.error(error);
    throw error;
  }

  return data || [];
};

//! GET INTERNAL DATASET PAGES
export const getMitraDatasetPages = async (mitraId: string | "all") => {
  let query = supabase
    .from("data_mitra")
    .select("id, label, mitra_id")
    .order("label", { ascending: true });

  if (mitraId !== "all") {
    query = query.eq("mitra_id", mitraId);
  }

  const { data, error } = await query;

  if (error) {
    alert("Get dataset Mitra Gagal!");
    console.error(error);
    throw error;
  }

  return data || [];
};

//! UPDATE
export const updateDataRows = async (
  datasetName: string,
  rows: {
    id: string;
    [key: string]: string | number | null;
  }[],
) => {
  const updates = rows.map(({ id, ...changes }) =>
    supabase.from(datasetName).update(changes).eq("id", id),
  );

  const results = await Promise.all(updates);

  const error = results.find((result) => result.error)?.error;

  if (error) {
    console.error("Update dataset failed:", error);
    throw error;
  }

  return true;
};

//! ADD
export const addDataRows = async (
  datasetName: string,
  rows: Record<string, string | number | null>[],
) => {
  const { data, error } = await supabase
    .from(datasetName)
    .insert(rows)
    .select();

  if (error) {
    console.error("Insert data failed:", error);
    throw error;
  }

  console.log(data);

  return data;
};

//! DELETE
export const deleteDataRows = async (datasetName: string, ids: string[]) => {
  const { error } = await supabase.from(datasetName).delete().in("id", ids);

  if (error) {
    console.error("Delete data failed:", error);
    throw error;
  }

  return true;
};

//! GET DATASET WITH SUPABASE "RPC" TO HANDLE LARGE DATA
type DatasetValue = string | number | boolean | null;

type DatasetRow = {
  id: string;
  [key: string]: DatasetValue;
};

type GetDatasetPageParams = {
  datasetName: string;
  filters: Record<string, string>;
  sortBy: string;
  sortDesc: boolean;
  page: number;
  pageSize: number;
};

//! Pagination
export const getDatasetPage = async ({
  datasetName,
  filters,
  sortBy,
  sortDesc,
  page,
  pageSize,
}: GetDatasetPageParams) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      return value !== "all" && value !== "";
    }),
  );

  const { data, error } = await supabase.rpc("get_data_table_page", {
    p_table: datasetName,
    p_filters: cleanFilters,
    p_sort_by: sortBy,
    p_sort_desc: sortDesc,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("Fetching dataset page failed:", error);
    throw error;
  }

  const rows = (data ?? []) as unknown as {
    row_data: DatasetRow;
    total_count: number;
  }[];

  return {
    data: rows.map((row) => row.row_data),
    count: Number(rows[0]?.total_count ?? 0),
  };
};

//! Get Distinct Data
export const getDistinctColumnValues = async (
  datasetName: string,
  columnName: string,
) => {
  const { data, error } = await supabase.rpc("get_distinct_filter_values", {
    p_table: datasetName,
    p_column: columnName,
  });

  if (error) {
    console.error("Fetching distinct filter values failed:", error);
    throw error;
  }

  const rows = (data ?? []) as unknown as { value: string }[];

  return rows.map((row) => row.value);
};

// ! DATA MITRA JSONB

type JsonbValue = string | number | boolean | null | undefined;

export type JsonbDatasetRow = {
  id: string;
  [key: string]: JsonbValue;
};

const createRowId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function normalizeMitraRows(value: unknown): JsonbDatasetRow[] {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .filter((row): row is Record<string, JsonbValue> => {
      return typeof row === "object" && row !== null && !Array.isArray(row);
    })
    .map((row) => ({
      ...row,
      id: typeof row.id === "string" && row.id ? row.id : createRowId(),
    }));
}

export const getMitraJsonbRows = async (dataMitraId: string) => {
  const { data, error } = await supabase
    .from("data_mitra")
    .select("id, data")
    .eq("id", dataMitraId)
    .maybeSingle();

  if (error) {
    console.error("Get mitra JSONB rows failed:", error);
    throw error;
  }

  return normalizeMitraRows(data?.data);
};

export const saveMitraJsonbRows = async (
  dataMitraId: string,
  rows: JsonbDatasetRow[],
) => {
  const { error } = await supabase
    .from("data_mitra")
    .update({
      data: rows,
    })
    .eq("id", dataMitraId);

  if (error) {
    console.error("Save mitra JSONB rows failed:", error);
    throw error;
  }
};

//! ========== APP LABELS CMS ========== //

export async function getAppLabelComponent(component: string, locale = "id") {
  const { data, error } = await supabase
    .from("app_labels")
    .select("target, value")
    .eq("component", component)
    .eq("locale", locale)
    .eq("is_active", true);

  if (error) {
    console.error(error.message);
    return {};
  }

  return (data || []).reduce<Record<string, string>>((acc, item) => {
    acc[item.target] = item.value || "";
    return acc;
  }, {});
}

// ! ICON PICKER

const IMAGE_BUCKET = "images";
const ICON_FOLDER = "icon_images";

export type IconImage = {
  name: string;
  path: string;
  url: string;
};

function isImageFile(filename: string) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(filename);
}

async function listImagesRecursive(folderPath: string): Promise<IconImage[]> {
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(folderPath, {
      limit: 500,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (error) {
    throw new Error(error.message);
  }

  const results: IconImage[] = [];

  for (const item of data || []) {
    const path = `${folderPath}/${item.name}`;

    // Supabase folders usually do not have metadata/id like normal files.
    const isLikelyFolder = !item.id && !isImageFile(item.name);

    if (isLikelyFolder) {
      const nestedImages = await listImagesRecursive(path);
      results.push(...nestedImages);
      continue;
    }

    if (!isImageFile(item.name)) continue;

    const { data: publicData } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(path);

    results.push({
      name: item.name,
      path,
      url: publicData.publicUrl,
    });
  }

  return results;
}

export async function getIconImages(): Promise<IconImage[]> {
  return listImagesRecursive(ICON_FOLDER);
}

//! GET IMAGE URL

export function getImagePreviewUrl(value: string) {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  ) {
    return value;
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(value);
  return data.publicUrl;
}

//! DATE FORMAT COVERTER FROM UNIX TO "MMDDYY_HHMMSS"

export function getDateTimeStamp(date: Date | number = new Date()) {
  const parsedDate = typeof date === "number" ? new Date(date) : date;

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const year = String(parsedDate.getFullYear()).slice(-2);

  const hour = String(parsedDate.getHours()).padStart(2, "0");
  const minute = String(parsedDate.getMinutes()).padStart(2, "0");
  const second = String(parsedDate.getSeconds()).padStart(2, "0");

  return `${month}${day}${year}_${hour}${minute}${second}`;
}
