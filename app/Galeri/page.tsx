//! Force page to load fresh data each render
export const revalidate = 0;

import React from "react";
import Gallery from "../components/Gallery";
import { getGallery } from "@/lib/supabase/supabaseHelper";

export default async function Page() {
  const images = await getGallery();

  return (
    <>
      <section className="lg:mx-24 my-12 md:mx-12 mx-8">
        <div className="flex flex-col gap-3">
          <h2>Galeri Kelautan Perikanan</h2>
          <h5>
            Galeri Foto dan Video seputar dunia Kelautan dan Perikanan Provinsi
            Maluku Utara
          </h5>
        </div>
        {/* //! DESKTOP */}
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          {images.map((e, idx) => {
            return (
              <div className="w-[30%]" key={idx}>
                <Gallery type="regular" data={images} id={e.id} />
              </div>
            );
          })}
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full mt-10">
          {images.map((e, idx) => {
            return <Gallery type="regular" data={images} id={e.id} key={idx} />;
          })}
        </div>
      </section>
    </>
  );
}
