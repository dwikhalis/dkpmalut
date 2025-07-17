import React from "react";

export default function Card() {
  return (
    <>
      <div className="flex flex-col 2xl:w-[20vw] 2xl:h-[35vw] lg:h-140 w-70 h-120 pt-12 px-6 shadow-2xl hover:shadow-xl justify-between rounded-2xl">
        {/* //! CONTENT */}
        <div className="w-full">
          {/* //! IMAGE */}
          <div className="flex justify-center items-center 2xl:h-70 h-45 mb-3 overflow-hidden">
            <img
              src="/assets/pic_img_1.jpg"
              alt="Gambar"
              className="object-cover w-full h-full"
            />
          </div>

          {/* //! TAG */}
          <h6 className="text-stone-500 mb-1">Artikel</h6>

          {/* //! TITLE */}
          <div className="h-10 2xl:h-40 lg:h-20 overflow-hidden mb-3">
            <h5 className="font-bold">
              Reef Rajawali Menjadi Primadona Bagi Turis Mancanegara dan Lokal
            </h5>
          </div>

          {/* //! HIGHLIGHT */}
          <div className="h-18 2xl:h-47 overflow-hidden">
            <h6>
              Keindahan wisata alam Pulau Guraici menarik untuk dijadikan tempat
              liburan, tentunya bagi yang tertarik dengan pantai dan laut.
              Keindahan wisata alam Pulau Guraici menarik untuk dijadikan tempat
              liburan, tentunya bagi yang tertarik dengan pantai dan laut.
            </h6>
          </div>
          <span>...</span>
        </div>

        {/* //! CTA */}
        <h5 className="text-teal-500 hover:text-teal-300 py-6">
          Selengkapnya &rarr;
        </h5>
      </div>
    </>
  );
}
