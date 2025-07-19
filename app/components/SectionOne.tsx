import React from "react";

export default function SectionOne() {
  return (
    <>
      {/* //! DESKTOP */}
      <section className="hidden lg:flex justify-between flex-wrap mx-12 2xl:mx-24 py-20">
        {/* Side Left */}
        <div className="flex flex-col w-[45%] items-center">
          <img
            src="/assets/pic_kadis.png"
            className="object-contain mb-5 w-[30vw]"
            style={{ filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))" }}
            alt="Kepala Dinas"
          />
          <h4 className="font-bold text-center">
            Kepala DKP Provinsi Maluku Utara
          </h4>
          <h4 className="text-center">Fauzi Momole, S.Pi</h4>
        </div>

        {/* Side Right */}
        <div className="flex flex-col w-[50%] gap-6">
          <h2>Maju Bersama Membangun Daerah</h2>
          <h5>
            Kami fokus pada program terpadu bersama Kementerian Kelautan dan
            Perikanan, mengingat luas laut Maluku utara yang sangat besar. Kami
            juga konsen dalam pengawasan sumber daya perikanan
          </h5>
          <div className="flex gap-12">
            {/* VISI */}
            <div className="w-[50%]">
              {/* ICON */}
              <img
                src={"/assets/icon_vision.png"}
                className="w-[5vw] h-[5vw] pb-3"
              />
              <h3 className="font-bold">VISI</h3>
              <h5 className="mb-3">Kami memiliki Visi untuk mewujudkan:</h5>
              <ol>
                <li className="flex">
                  <h5 className="mr-2 w-5">1. </h5>
                  <h5>Visi Pertama</h5>
                </li>
                <li className="flex">
                  <h5 className="mr-2 w-5">2. </h5>
                  <h5>Visi Kedua</h5>
                </li>
                <li className="flex">
                  <h5 className="mr-2 w-5">3. </h5>
                  <h5>Visi Ketiga</h5>
                </li>
              </ol>
            </div>
            {/* MISI */}
            <div className="w-[50%]">
              {/* ICON */}
              <img
                src={"/assets/icon_mission.png"}
                className="w-[5vw] h-[5vw] pb-3"
              />
              <h3 className="font-bold">MISI</h3>
              <h5 className="mb-3">
                Melalui program kerja Dinas Kelautan dan Perikanan
              </h5>
              <ol>
                <li className="flex">
                  <h5 className="mr-2 w-5">1. </h5>
                  <h5>Misi Pertama</h5>
                </li>
                <li className="flex">
                  <h5 className="mr-2 w-5">2. </h5>
                  <h5>Misi Kedua</h5>
                </li>
                <li className="flex">
                  <h5 className="mr-2 w-5">3. </h5>
                  <h5>Misi Ketiga</h5>
                </li>
              </ol>
            </div>
          </div>
          <div className="flex">
            <a href="/Organisasi">
              <h5 className="text-teal-500 hover:text-teal-300 py-3">
                STRUKTUR ORGANISASI &rarr;
              </h5>
            </a>
            <div></div>
          </div>
        </div>
      </section>

      {/* //! TABLET & MOBILE */}
      <section className="lg:hidden mx-10 my-6">
        {/* Top Side */}
        <div className="flex flex-col items-center justify-center mb-12">
          <img
            src="/assets/pic_kadis.png"
            className="object-contain mb-5 w-[55%]"
            style={{ filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))" }}
            alt="Kepala Dinas"
          />
          <h4 className="font-bold text-center">
            Kepala DKP Provinsi Maluku Utara
          </h4>
          <h4 className="text-center">Fauzi Momole, S.Pi</h4>
        </div>

        {/* Bottom Side */}
        <div className="flex flex-col w-full gap-3 mt-6">
          <h2 className="text-center">Maju Bersama Membangun Daerah</h2>
          <h5 className="text-center">
            Kami fokus pada program terpadu bersama Kementerian Kelautan dan
            Perikanan, mengingat luas laut Maluku utara yang sangat besar. Kami
            juga konsen dalam pengawasan sumber daya perikanan
          </h5>

          {/* VISI MISI */}
          <div>
            {/* VISI */}
            <div className="mt-6">
              {/* ICON */}
              <div className="flex justify-center items-center">
                <img
                  src={"/assets/icon_vision.png"}
                  className="w-[8vw] h-[10vw] pb-3"
                />
              </div>
              <h3 className="text-center font-bold">VISI</h3>
              <h5 className="mb-3 text-center">
                Kami memiliki Visi untuk mewujudkan:
              </h5>
              <ol className="text-center">
                <li className="flex justify-center">
                  <h5 className="text-center">Visi Pertama</h5>
                </li>
                <li className="flex justify-center">
                  <h5>Visi Kedua</h5>
                </li>
                <li className="flex justify-center">
                  <h5>Visi Ketiga</h5>
                </li>
              </ol>
            </div>
            {/* MISI */}
            <div className="mt-6">
              {/* ICON */}
              <div className="flex justify-center items-center">
                <img
                  src={"/assets/icon_mission.png"}
                  className="w-[8vw] h-[10vw] pb-3"
                />
              </div>
              <h3 className="text-center font-bold">MISI</h3>
              <h5 className="mb-3 text-center">
                Melalui program kerja Dinas Kelautan dan Perikanan
              </h5>
              <ol>
                <li className="flex justify-center">
                  <h5>Misi Pertama</h5>
                </li>
                <li className="flex justify-center">
                  <h5>Misi Kedua</h5>
                </li>
                <li className="flex justify-center">
                  <h5>Misi Ketiga</h5>
                </li>
              </ol>
            </div>
          </div>
          <div className="flex justify-center">
            <a href="/Organisasi">
              <h5 className="text-teal-500 hover:text-teal-300 py-3">
                STRUKTUR ORGANISASI &rarr;
              </h5>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
