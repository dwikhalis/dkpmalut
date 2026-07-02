import Image from "next/image";
import Reveal from "./Reveal";

export default function SectionNumber() {
  return (
    <>
      {/* Desktop */}
      <section className="bg-gradient-to-r from-sky-700 to-sky-200">
        <div className="hidden md:block mx-12 pb-12 lg:pt-30 md:pt-15 2xl:px-24 2xl:mx-24 bg-sky-100 rounded-b-4xl">
          <div className="relative bg-white px-12 md:px-0 mx-12 rounded-4xl lg:h-100 md:h-55 shadow-2xl">
            <div className="flex absolute lg:-top-30 md:-top-12 items-start mx-12 md:mx-0">
              <Reveal
                animation="fade-up"
                delay={80}
                className="home-hover-lift flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6"
              >
                <div className="flex justify-center items-center">
                  <Image
                    src="/assets/icon_pic_1.png"
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="home-float lg:h-50 md:h-20 object-contain"
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
              </Reveal>

              <Reveal
                animation="fade-up"
                delay={200}
                className="home-hover-lift flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6"
              >
                <div className="flex justify-center items-center">
                  <Image
                    src="/assets/icon_pic_3.png"
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="home-float lg:h-50 md:h-20 object-contain"
                    priority
                  />
                </div>
                <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">7</h1>
                <h5 className="font-bold text-center">Kawasan Konservasi</h5>
                <h5 className="text-center w-[18vw]">
                  Menjaga kelestarian ekosistem untuk perikanan berkelanjutan
                </h5>
              </Reveal>

              <Reveal
                animation="fade-up"
                delay={320}
                className="home-hover-lift flex flex-col justify-center items-center gap-6 md:gap-3 px-12 pb-12 md:px-6 md:pb-6"
              >
                <div className="flex justify-center items-center">
                  <Image
                    src="/assets/icon_pic_2.png"
                    width={800}
                    height={600}
                    alt="nelayan"
                    className="home-float lg:h-50 md:h-20 object-contain"
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
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="md:hidden bg-sky-300 pb-10">
        <Reveal
          animation="fade-up"
          className="mx-6 p-6 pt-0 bg-sky-100 rounded-b-4xl shadow-xl"
        >
          <div className="flex justify-center items-start flex-wrap">
            <Reveal
              animation="fade-up"
              delay={80}
              className="home-hover-lift relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl"
            >
              <Image
                src="/assets/icon_pic_1.png"
                width={800}
                height={600}
                alt="nelayan"
                className="home-float absolute h-30 object-contain -top-15"
                priority
              />
              <h1 className="text-sky-600 text-center mt-12">12.300</h1>
              <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
              <h5 className="text-center w-[70%]">
                Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku
                Utara
              </h5>
            </Reveal>

            <Reveal
              animation="fade-up"
              delay={180}
              className="home-hover-lift relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl"
            >
              <Image
                src="/assets/icon_pic_3.png"
                width={800}
                height={600}
                alt="nelayan"
                className="home-float absolute h-30 object-contain -top-15"
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
            </Reveal>

            <Reveal
              animation="fade-up"
              delay={280}
              className="home-hover-lift relative flex flex-col justify-center items-center gap-3 p-6 bg-white rounded-2xl mt-20 shadow-xl"
            >
              <Image
                src="/assets/icon_pic_2.png"
                width={800}
                height={600}
                alt="nelayan"
                className="home-float absolute h-30 object-contain -top-15"
                priority
              />
              <h1 className="text-sky-600 text-center mt-12">1,5 M</h1>
              <h5 className="font-bold text-center">Capaian</h5>
              <h5 className="text-center w-[70%]">
                Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
              </h5>
            </Reveal>
          </div>
        </Reveal>
      </section>
    </>
  );
}
