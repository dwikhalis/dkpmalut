import Image from "next/image";
import React from "react";

export default function SectionSix() {
  return (
    <div className="flex flex-col gap-6 py-12 mx-12 mb-12 justify-center items-center">
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

        {/* //! DESKTOP */}
        <div className="hidden md:flex w-full gap-6 justify-center flex-wrap">
          <Image
            alt="Gambar"
            src="./assets/pic_office.png"
            className="w-[30vw] h-[20vw] object-cover"
          />
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1994.7434837073158!2d127.56765096721902!3d0.738430255303257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329cbf3b84025b89%3A0x204563a8ed194488!2sDinas%20Kelautan%20Dan%20Perikanan%20Maluku%20Utara!5e0!3m2!1sen!2sid!4v1753169295546!5m2!1sen!2sid"
            className="flex w-[30vw] h-[20vw]"
            loading="lazy"
          ></iframe>
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex w-full gap-12 justify-center flex-wrap">
          <Image
            alt="Gambar"
            src="./assets/pic_office.png"
            className="w-full h-[50vw] object-cover"
          />
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1994.7434837073158!2d127.56765096721902!3d0.738430255303257!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x329cbf3b84025b89%3A0x204563a8ed194488!2sDinas%20Kelautan%20Dan%20Perikanan%20Maluku%20Utara!5e0!3m2!1sen!2sid!4v1753169295546!5m2!1sen!2sid"
            className="w-full h-[50vw]"
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
