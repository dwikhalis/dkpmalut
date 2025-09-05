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
  id: string
) => {
  const { error } = await supabase.from(table).update(newData).eq("id", id);

  if (error) {
    alert("Update staff Gagal!");
    console.error(error);
    throw error;
  }

  return true;
};

export const getNumOf = async (dataset: string) => {
  const { count, error } = await supabase
    .from(dataset)
    .select("id", { count: "exact", head: true });

  if (error) {
    alert("Fetching numOf Data failed");
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
