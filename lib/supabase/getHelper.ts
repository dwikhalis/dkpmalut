import { supabase } from "@/lib/supabase/supabaseClient";

export const getNews = async () => {
  const { data, error } = await supabase.from("news").select("*");
  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id ?? "",
    image: item.image ?? "",
    tag: item.tag ?? "",
    date: item.date ?? "",
    title: item.title ?? "",
    content: item.content ?? "",
  }));
};

export const getGallery = async () => {
  const { data, error } = await supabase.from("gallery").select("*");
  if (error) throw error;

  return (data || []).map((item) => ({
    id: item.id ?? "",
    image: item.image ?? "",
    tag: item.tag ?? "",
    title: item.title ?? "",
    date: item.date ?? "",
    description: item.description ?? "",
  }));
};
