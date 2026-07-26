import { Suspense } from "react";
import Card from "../components/Card";
import SpinnerLoading from "../components/SpinnerLoading";
import { getNews } from "@/lib/supabase/supabaseHelper";
import { PageHeader } from "../components/CmsPageContent";

export const revalidate = 0;

async function NewsList() {
  const fetchedData = await getNews();

  if (fetchedData.length === 0) {
    return <p>Belum ada data terdaftar</p>;
  }

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full">
        {fetchedData.map((news) => (
          <div className="w-[30%]" key={news.id}>
            <Card type="open" data={fetchedData} id={news.id} />
          </div>
        ))}
      </div>

      {/* MOBILE */}
      <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full">
        {fetchedData.map((news) => (
          <Card type="open" data={fetchedData} id={news.id} key={news.id} />
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <PageHeader
        eyebrow="Informasi Publik"
        title="Kabar Kelautan Perikanan"
        subtitle="Informasi seputar dunia Kelautan dan Perikanan Provinsi Maluku Utara."
      />

      <div className="mt-8">
        <Suspense fallback={<SpinnerLoading size="sm" color="black" />}>
          <NewsList />
        </Suspense>
      </div>
    </main>
  );
}
