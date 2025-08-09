import { supabase } from "@/lib/supabase/supabaseClient";

export const getNews = async () => {
  const { data, error } = await supabase.from("news").select("*");
  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id ?? 0,
    image: item.image ?? "",
    tag: item.tag ?? "",
    date: item.date ?? "",
    title: item.title ?? "",
    content: item.content ?? "",
  }));
};
