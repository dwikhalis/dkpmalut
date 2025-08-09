import React from "react";

export default function SectionTwo() {
  return (
    <>
      {/* //! DESKTOP */}
      <section className="hidden lg:block m-12 2xl:mx-24">
        <div className="flex flex-col mb-3 gap-6">
          <h2 className="text-center">DKP MALUT DALAM ANGKA</h2>
          <h5 className="text-center">
            Menjaga akuntabilitas dan profesionalisme demi kelautan dan
            derikanan daerah yang lebih maju
          </h5>
        </div>
        <div className="flex justify-between items-start mx-12">
          {/* COL 1 */}
          <div className="flex flex-col justify-center items-center gap-6 p-12">
            <h1 className="text-teal-600 text-center">12.300</h1>
            <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
            <h5 className="text-center w-[18vw]">
              Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku Utara
            </h5>
          </div>
          {/* COL 2 */}
          <div className="flex flex-col justify-center items-center gap-6 p-12">
            <h1 className="text-teal-600 text-center">1,5 M</h1>
            <h5 className="font-bold text-center">Capaian</h5>
            <h5 className="text-center w-[18vw]">
              Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
            </h5>
          </div>
          {/* COL 3 */}
          <div className="flex flex-col justify-center items-center gap-6 p-12">
            <h1 className="text-teal-600 text-center">7</h1>
            <h5 className="font-bold text-center">Kawasan Konservasi Daerah</h5>
            <h5 className="text-center w-[18vw]">
              Menjaga kelestarian ekosistem demi mewujudkan perikanan yang
              berkelanjutan
            </h5>
          </div>
        </div>
      </section>

      {/* //! MOBILE */}
      <section className="lg:hidden mb-12">
        <div className="mb-3">
          <h2 className="text-center pb-3 mx-12">DKP MALUT DALAM ANGKA</h2>
          <h5 className="text-center mx-12">
            Menjaga akuntabilitas dan profesionalisme demi kelautan dan
            derikanan daerah yang lebih maju
          </h5>
        </div>
        <div className="flex justify-center items-start flex-wrap">
          {/* COL 1 */}
          <div className="flex flex-col justify-center items-center gap-6 p-6">
            <h1 className="text-teal-600 text-center">12.300</h1>
            <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
            <h5 className="text-center w-[70%]">
              Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku Utara
            </h5>
          </div>
          {/* COL 2 */}
          <div className="flex flex-col justify-center items-center gap-6 p-6">
            <h1 className="text-teal-600 text-center">1,5 M</h1>
            <h5 className="font-bold text-center">Capaian</h5>
            <h5 className="text-center w-[70%]">
              Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
            </h5>
          </div>
          {/* COL 3 */}
          <div className="flex flex-col justify-center items-center gap-6 p-6">
            <h1 className="text-teal-600 text-center">7</h1>
            <h5 className="font-bold text-center">Kawasan Konservasi Daerah</h5>
            <h5 className="text-center w-[70%]">
              Menjaga kelestarian ekosistem demi mewujudkan perikanan yang
              berkelanjutan
            </h5>
          </div>
        </div>
      </section>
    </>
  );
}
