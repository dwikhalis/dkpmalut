import { RightChevron } from "@/public/icons/iconSets";
import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";

export default function SectionOrg() {
  return (
    <>
      {/* Desktop */}
      <section className="bg-gradient-to-r from-sky-700 to-sky-200">
        <Reveal
          animation="fade-up"
          className="hidden md:flex px-12 mx-12 lg:py-20 md:py-10 2xl:mx-24 bg-sky-100 justify-between flex-wrap rounded-t-4xl"
        >
          <div className="flex flex-col w-[45%] items-center">
            <Reveal animation="scale-in" delay={120}>
              <div className="relative flex justify-center items-center">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full absolute"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="55"
                    fill="currentColor"
                    className="text-sky-300"
                  />
                </svg>

                <Image
                  src="/assets/pic_kadis.png"
                  width={800}
                  height={600}
                  className="home-float object-contain mb-5 w-[30vw]"
                  style={{
                    filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))",
                  }}
                  alt="Kepala Dinas"
                />
              </div>
            </Reveal>

            <Reveal animation="fade-up" delay={220}>
              <h4 className="flex font-bold text-center">
                Kepala DKP Provinsi Maluku Utara
              </h4>
              <h4 className="flex text-center">Fauzi Momole, S.Pi</h4>
            </Reveal>
          </div>

          <div className="flex flex-col w-[50%] gap-6">
            <Reveal animation="fade-left" delay={100}>
              <h2>Maju Bersama Membangun Daerah</h2>
            </Reveal>

            <div className="flex gap-12">
              <Reveal animation="fade-up" delay={220} className="w-[50%]">
                <Image
                  src="/assets/icon_vision.png"
                  width={800}
                  height={600}
                  className="w-[4vw] h-[5vw] pb-3"
                  alt="Gambar"
                />
                <h3 className="font-bold">VISI</h3>
                <h5 className="mb-3">Kami memiliki Visi untuk mewujudkan:</h5>
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
              </Reveal>

              <Reveal animation="fade-up" delay={340} className="w-[50%]">
                <Image
                  src="/assets/icon_mission.png"
                  width={800}
                  height={600}
                  className="w-[4vw] h-[5vw] pb-3"
                  alt="Gambar"
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
              </Reveal>
            </div>

            <Reveal animation="fade-up" delay={460}>
              <Link
                href="/organisasi"
                className="flex items-center gap-1 text-sky-500 hover:text-black"
              >
                <h5 className="py-3">STRUKTUR ORGANISASI</h5>
                <RightChevron className="w-3 h-3" />
              </Link>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* Mobile */}
      <section className="md:hidden bg-sky-300">
        <Reveal
          animation="fade-up"
          className="mx-6 pt-6 bg-sky-100 rounded-t-4xl"
        >
          <div className="relative flex flex-col items-center justify-center mb-6">
            <svg
              viewBox="0 0 30 30"
              className="w-full h-full absolute"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="15"
                cy="13"
                r="10"
                fill="currentColor"
                className="text-sky-300"
              />
            </svg>

            <Image
              src="/assets/pic_kadis.png"
              width={800}
              height={600}
              className="home-float object-contain mb-5 w-[55%] mx-10"
              style={{
                filter: "drop-shadow(-15px 10px 9px rgba(0,0,0,0.3))",
              }}
              alt="Kepala Dinas"
            />

            <h4 className="font-bold text-center mx-3">
              Kepala DKP Provinsi Maluku Utara
            </h4>
            <h4 className="text-center mx-3">Fauzi Momole, S.Pi</h4>
          </div>

          <div className="flex flex-col w-full gap-3">
            <h2 className="text-center mx-3">Maju Bersama Membangun Daerah</h2>

            <div>
              <Reveal
                animation="fade-up"
                delay={120}
                className="home-hover-lift mt-6 bg-white mx-6 p-3 rounded-2xl shadow-xl"
              >
                <div className="flex justify-center items-center">
                  <Image
                    src="/assets/icon_vision.png"
                    width={800}
                    height={600}
                    className="w-[8vw] h-[10vw] pb-3"
                    alt="Gambar"
                  />
                </div>
                <h3 className="text-center font-bold">VISI</h3>
                <h5 className="mb-3 text-center mx-6">
                  Kami memiliki Visi untuk mewujudkan:
                </h5>
                <ol className="text-center">
                  <li className="flex justify-center">
                    <h5 className="text-center mx-6">Visi Pertama</h5>
                  </li>
                  <li className="flex justify-center">
                    <h5 className="mx-6">Visi Kedua</h5>
                  </li>
                  <li className="flex justify-center">
                    <h5 className="mx-6">Visi Ketiga</h5>
                  </li>
                </ol>
              </Reveal>

              <Reveal
                animation="fade-up"
                delay={220}
                className="home-hover-lift mt-6 bg-white mx-6 p-3 rounded-2xl shadow-xl"
              >
                <div className="flex justify-center items-center">
                  <Image
                    src="/assets/icon_mission.png"
                    width={800}
                    height={600}
                    className="w-[8vw] h-[10vw] pb-3"
                    alt="Gambar"
                  />
                </div>
                <h3 className="text-center font-bold">MISI</h3>
                <h5 className="mb-3 text-center mx-6">
                  Melalui program kerja Dinas Kelautan dan Perikanan
                </h5>
                <ol>
                  <li className="flex justify-center">
                    <h5 className="mx-6">Misi Pertama</h5>
                  </li>
                  <li className="flex justify-center">
                    <h5 className="mx-6">Misi Kedua</h5>
                  </li>
                  <li className="flex justify-center">
                    <h5 className="mx-6">Misi Ketiga</h5>
                  </li>
                </ol>
              </Reveal>
            </div>

            <div className="flex justify-center">
              <Link href="/organisasi">
                <h5 className="text-sky-500 hover:text-sky-300 py-3">
                  STRUKTUR ORGANISASI &rarr;
                </h5>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
