import Image from "next/image";
import React from "react";

export default function SectionSix() {
  return (
    <>
      {/* //! DESKTOP */}
      <section className="hidden md:block bg-gradient-to-r from-sky-700 to-sky-200 pt-12 pb-12">
        <div className="flex flex-col gap-6 py-12 md:pb-6 mx-12 2xl:mx-24 2xl:pb-24 justify-center items-center bg-sky-100 rounded-4xl shadow-2xl">
          <div className="flex flex-col mb-3 gap-6">
            <h2 className="text-center">KANTOR</h2>
            <h5 className="text-center font-bold">
              Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara <br></br>
              <span className="font-light">
                Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan,
                Provinsi Maluku Utara, Indonesia
              </span>
            </h5>
            <h5 className="text-center"></h5>

            <div className="lg:flex md:hidden w-full gap-6 justify-center flex-wrap">
              <Image
                alt="Gambar"
                src="/assets/pic_office.png"
                width={800}
                height={600}
                className="w-[30vw] h-[20vw] object-cover"
              />
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.4869671137667!2d127.56658608966836!3d0.7384305905514934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329cbf3b84025b89%3A0x204563a8ed194488!2sDinas%20Kelautan%20Dan%20Perikanan%20Maluku%20Utara!5e0!3m2!1sid!2sus!4v1758953632235!5m2!1sid!2sus"
                className="flex w-[30vw] h-[20vw]"
                loading="lazy"
              ></iframe>
            </div>

            <div className="md:flex lg:hidden w-full gap-6 justify-center flex-wrap">
              <div className="bg-white p-3 w-full mx-6 rounded-xl shadow-xl">
                <Image
                  alt="Gambar"
                  src="/assets/pic_office.png"
                  width={800}
                  height={600}
                  className="w-full h-[50vw] object-cover"
                />
              </div>
              <div className="bg-white p-3 w-full mx-6 rounded-xl shadow-xl">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.4869671137667!2d127.56658608966836!3d0.7384305905514934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329cbf3b84025b89%3A0x204563a8ed194488!2sDinas%20Kelautan%20Dan%20Perikanan%20Maluku%20Utara!5e0!3m2!1sid!2sus!4v1758953632235!5m2!1sid!2sus"
                  className="w-full h-[50vw]"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* //! MOBILE */}
      <section className="md:hidden bg-sky-300 pb-6">
        <div className="flex flex-col gap-6 py-6 mx-6 pb-6 justify-center items-center bg-sky-100 rounded-4xl shadow-xl">
          <div className="flex flex-col mb-3 gap-6">
            <h2 className="text-center">KANTOR</h2>
            <h5 className="text-center font-bold mx-6">
              Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara <br></br>
            </h5>
            <h5 className="text-center font-light mx-6">
              Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan,
              Provinsi Maluku Utara, Indonesia
            </h5>
            <h5 className="text-center"></h5>
            <div className="flex w-full gap-6 justify-center flex-wrap">
              <div className="bg-white p-3 w-full mx-6 rounded-xl shadow-xl">
                <Image
                  alt="Gambar"
                  src="/assets/pic_office.png"
                  width={800}
                  height={600}
                  className="w-full h-[50vw] object-cover"
                />
              </div>
              <div className="bg-white p-3 w-full mx-6 rounded-xl shadow-xl">
                <iframe
                  src="https://maps.google.com/maps?q=loc:0.73860,127.56906&z=12&output=embed&hl=id"
                  className="w-full h-[50vw]"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
