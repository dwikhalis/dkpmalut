import { Suspense } from "react";
import Gallery from "../components/Gallery";
import SpinnerLoading from "../components/SpinnerLoading";
import { getGallery } from "@/lib/supabase/supabaseHelper";
import { PageHeader } from "../components/CmsPageContent";

export const revalidate = 0;

async function GalleryList() {
  const images = await getGallery();

  if (!images || images.length === 0) {
    return <p className="mt-10">Belum ada data terdaftar</p>;
  }

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden w-full flex-wrap gap-6 md:flex lg:gap-10">
        {images.map((image) => (
          <div className="w-[30%] hover:cursor-pointer" key={image.id}>
            <Gallery type="regular" data={images} id={image.id} />
          </div>
        ))}
      </div>

      {/* MOBILE */}
      <div className="flex w-full flex-col gap-6 md:hidden lg:gap-10">
        {images.map((image) => (
          <Gallery type="regular" data={images} id={image.id} key={image.id} />
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <PageHeader
        eyebrow="Dokumentasi"
        title="Galeri Kelautan Perikanan"
        subtitle="Galeri foto dan video seputar dunia Kelautan dan Perikanan Provinsi Maluku Utara."
      />

      <div className="mt-8">
        <Suspense fallback={<SpinnerLoading size="sm" color="black" />}>
          <GalleryList />
        </Suspense>
      </div>
    </main>
  );
}
