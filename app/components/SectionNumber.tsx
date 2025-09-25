import Image from "next/image";
import React from "react";

export default function SectionTwo() {
  return (
    <>
      {/* //! DESKTOP */}
      <section className="bg-gradient-to-r from-sky-700 to-sky-200">
        <div className="hidden md:block mx-12 pb-12 lg:pt-30 md:pt-15 2xl:px-24 2xl:mx-24 bg-sky-100 rounded-b-4xl">
          <div className="relative bg-white px-12 md:px-0 mx-12 rounded-4xl lg:h-100 md:h-55 shadow-2xl">
            <div className="flex absolute lg:-top-30 md:-top-12 items-start mx-12 md:mx-0">
              <div className="flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6">
                <div className="flex justify-center items-center">
                  <Image
                    src={"/assets/icon_pic_1.png"}
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="lg:h-50 md:h-20 object-contain"
                    priority
                  />
                </div>
                <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">
                  12.300
                </h1>
                <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
                <h5 className="text-center w-[18vw]">
                  Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku
                  Utara
                </h5>
              </div>

              <div className="flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6">
                <div className="flex justify-center items-center">
                  <Image
                    src={"/assets/icon_pic_3.png"}
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="lg:h-50 md:h-20 object-contain"
                    priority
                  />
                </div>
                <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">7</h1>
                <h5 className="font-bold text-center">Kawasan Konservasi</h5>
                <h5 className="text-center w-[18vw]">
                  Menjaga kelestarian ekosistem untuk perikanan berkelanjutan
                </h5>
              </div>

              <div className="flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6">
                <div className="flex justify-center items-center">
                  <Image
                    src={"/assets/icon_pic_2.png"}
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="lg:h-50 md:h-20 object-contain"
                    priority
                  />
                </div>
                <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">
                  1,5 M
                </h1>
                <h5 className="font-bold text-center">Capaian</h5>
                <h5 className="text-center w-[18vw]">
                  Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD)
                  2025
                </h5>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* //! MOBILE */}
      <section className="md:hidden bg-sky-300 pb-10">
        <div className="mx-6 p-6 pt-0 bg-sky-100 rounded-b-4xl shadow-xl">
          <div className="flex justify-center items-start flex-wrap">
            {/* COL 1 */}
            <div className="relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl">
              <Image
                src={"/assets/icon_pic_1.png"}
                width={800}
                height={600}
                alt="nelayan"
                className="absolute h-30 object-contain -top-15"
                priority
              />
              <h1 className="text-sky-600 text-center mt-12">12.300</h1>
              <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
              <h5 className="text-center w-[70%]">
                Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku
                Utara
              </h5>
            </div>

            {/* COL 2 */}
            <div className="relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl">
              <Image
                src={"/assets/icon_pic_3.png"}
                width={800}
                height={600}
                alt="nelayan"
                className="absolute h-30 object-contain -top-15"
                priority
              />
              <h1 className="text-sky-600 text-center mt-12">7</h1>
              <h5 className="font-bold text-center">
                Kawasan Konservasi Daerah
              </h5>
              <h5 className="text-center w-[70%]">
                Menjaga kelestarian ekosistem demi mewujudkan perikanan yang
                berkelanjutan
              </h5>
            </div>

            {/* COL 3 */}
            <div className="relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl">
              <Image
                src={"/assets/icon_pic_2.png"}
                width={800}
                height={600}
                alt="nelayan"
                className="absolute h-30 object-contain -top-15"
                priority
              />
              <h1 className="text-sky-600 text-center mt-12">1,5 M</h1>
              <h5 className="font-bold text-center">Capaian</h5>
              <h5 className="text-center w-[70%]">
                Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
              </h5>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
