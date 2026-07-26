import Image from "next/image";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import { UUID } from "crypto";
import TableConfigValue from "@/app/components/TableConfigValue";

interface Props {
  //! In Next 15, these APIs have been made asynchronous.
  //! You can read more about this in the Next.js 15 Upgrade Guide.
  //! https://nextjs.org/docs/messages/sync-dynamic-apis
  params: Promise<{ id: string }>;
}

interface News {
  id: UUID;
  slug?: string | null;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
  source: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function page({ params }: Props) {
  const { id } = await params;

  const query = supabase.from("news").select("*");
  const { data, error } = isUuid(id)
    ? await query.eq("id", id).single<News>()
    : await query.eq("slug", id).single<News>();

  if (error || !data) {
    console.error(error);
    redirect("/404");
  } else {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
        <h1>{data.title}</h1>
        <p className="text-lg leading-relaxed md:text-xl">
          <TableConfigValue table="news" field="tag" value={data.tag} /> {` /
            ${new Date(data.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`}
        </p>
        <div className="flex flex-col mb-6 gap-2">
          <Image
            alt="Gambar"
            src={data.image}
            width={800}
            height={600}
            className="h-[100vh] w-full object-cover"
            quality={100}
          />
          <p className="text-right text-sm">{data.source}</p>
        </div>
        <div className="whitespace-pre-wrap text-base leading-8 md:text-lg">
          {data.content}
        </div>
      </main>
    );
  }
}
