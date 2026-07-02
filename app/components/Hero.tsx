import Image from "next/image";
import Button from "./Button";

export default function Hero() {
  return (
    <section>
      {/* Desktop Hero */}
      <div className="hidden relative z-10 md:flex justify-between items-center overflow-hidden">
        <div className="flex flex-col lg:w-[50%] md:w-full lg:py-24 md:py-12 px-12 2xl:px-24 gap-6 bg-gradient-to-r from-sky-700 to-sky-400/0">
          <h1 className="home-animate home-animate-in home-fade-right text-white">
            Mewujudkan
          </h1>

          <h1
            className="home-animate home-animate-in home-fade-right text-white"
            style={{ animationDelay: "120ms" }}
          >
            Ekonomi
          </h1>

          <h1
            className="home-animate home-animate-in home-fade-right text-white"
            style={{ animationDelay: "240ms" }}
          >
            Biru
          </h1>

          <h3
            className="home-animate home-animate-in home-fade-up text-white lg:w-full md:w-[50%]"
            style={{ animationDelay: "360ms" }}
          >
            Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
            untuk mewujudkan Ekonomi Biru.
          </h3>

          <div
            className="home-animate home-animate-in home-fade-up flex gap-6"
            style={{ animationDelay: "520ms" }}
          >
            <Button size="xl" text="Data Perikanan" link="/data" />
          </div>
        </div>

        <div className="absolute flex w-full -z-10 h-full overflow-clip">
          <Image
            alt="Gambar"
            src="/assets/hero_2.svg"
            width={800}
            height={600}
            className="home-soft-zoom w-full h-full object-cover object-right"
            priority
          />
        </div>

        <div className="absolute -z-20 h-full w-full bg-sky-200" />
      </div>

      {/* Mobile Hero */}
      <div className="md:hidden bg-gradient-to-b from-sky-700 via-sky-500 to-sky-300 overflow-hidden">
        <div className="flex flex-col gap-6 justify-between items-center pt-10 pb-6 mx-10">
          <h1 className="home-animate home-animate-in home-fade-up text-center md:text-left text-white">
            Mewujudkan Ekonomi Biru
          </h1>

          <h3
            className="home-animate home-animate-in home-fade-up text-center md:text-left text-white"
            style={{ animationDelay: "140ms" }}
          >
            Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
            untuk mewujudkan Ekonomi Biru.
          </h3>

          <div
            className="home-animate home-animate-in home-fade-up flex gap-6 justify-center md:justify-start w-full"
            style={{ animationDelay: "280ms" }}
          >
            <Button size="mobile-xl" text="Data Perikanan" link="/data" />
          </div>
        </div>

        <Image
          alt="Gambar"
          src="/assets/hero_3.svg"
          width={800}
          height={600}
          className="home-soft-zoom w-full h-auto"
          priority
        />
      </div>
    </section>
  );
}
