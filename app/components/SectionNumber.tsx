import Image from "next/image";
import Reveal from "./Reveal";
import CountUpNumber from "./CountUpNumber";

export default function SectionNumber() {
  return (
    <>
      {/* Desktop */}
      <Reveal
        animation="fade-up"
        className="hidden md:block pb-12 lg:pt-30 md:pt-15 2xl:px-24 bg-sky-100 rounded-b-4xl"
      >
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
                  className="home-float-5 lg:h-50 md:h-20 object-contain"
                  priority
                />
              </div>

              <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">
                <CountUpNumber to={12300} duration={1700} />
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
                  className="home-float-6 lg:h-50 md:h-20 object-contain"
                  priority
                />
              </div>

              <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">
                <CountUpNumber to={7} duration={1300} />
              </h1>

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
                  className="home-float-7 lg:h-50 md:h-20 object-contain"
                  priority
                />
              </div>

              <h1 className="text-sky-600 text-center lg:mt-6 md:mt-3">
                <CountUpNumber
                  to={1.5}
                  decimals={1}
                  suffix=" M"
                  duration={1600}
                />
              </h1>

              <h5 className="font-bold text-center">Capaian</h5>
              <h5 className="text-center w-[18vw]">
                Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
              </h5>
            </Reveal>
          </div>
        </div>
      </Reveal>

      {/* Mobile */}
      <Reveal
        animation="fade-up"
        className="md:hidden p-6 pt-0 bg-sky-100 rounded-b-4xl"
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

            <h1 className="text-sky-600 text-center mt-12">
              <CountUpNumber to={12300} duration={1700} />
            </h1>

            <h5 className="font-bold text-center">Jumlah Nelayan Aktif</h5>
            <h5 className="text-center w-[70%]">
              Nelayan terdaftar dari seluruh kabupaten di Provinsi Maluku Utara
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

            <h1 className="text-sky-600 text-center mt-12">
              <CountUpNumber to={7} duration={1300} />
            </h1>

            <h5 className="font-bold text-center">Kawasan Konservasi Daerah</h5>
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

            <h1 className="text-sky-600 text-center mt-12">
              <CountUpNumber
                to={1.5}
                decimals={1}
                suffix=" M"
                duration={1600}
              />
            </h1>

            <h5 className="font-bold text-center">Capaian</h5>
            <h5 className="text-center w-[70%]">
              Kontribusi DKP Malut terhadap Pendapatan Asli Daerah (PAD) 2025
            </h5>
          </Reveal>
        </div>
      </Reveal>
    </>
  );
}
