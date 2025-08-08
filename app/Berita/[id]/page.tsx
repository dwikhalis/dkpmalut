import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";
import Image from "next/image";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import { UUID } from "crypto";

interface Props {
  //! In Next 15, these APIs have been made asynchronous.
  //! You can read more about this in the Next.js 15 Upgrade Guide.
  //! https://nextjs.org/docs/messages/sync-dynamic-apis
  params: Promise<{ id: string }>;
}

interface News {
  id: UUID;
  image: string;
  tag: string;
  date: string;
  title: string;
  content: string;
  source: string;
}

export default async function page({ params }: Props) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("id", id)
    .single<News>();

  if (error || !data) {
    console.error(error);
    redirect("/404");
  } else {
    return (
      <>
        <Navbar />
        <div className="flex flex-col gap-6 mx-12 mt-3 mb-12 p-12">
          <h2>{data.title}</h2>
          <h6>
            {data.tag}/{data.date}
          </h6>
          <div className="flex flex-col mb-6 gap-2">
            <Image
              alt="Gambar"
              src={data.image}
              width={800}
              height={600}
              className="h-[100vh] w-full object-cover"
              quality={100}
            />
            <h6 className="text-right">{data.source}</h6>
          </div>
          <h5 className="whitespace-pre-wrap">{data.content}</h5>
        </div>
        <Footer />
      </>
    );
  }
}
