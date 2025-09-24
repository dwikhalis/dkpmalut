import Image from "next/image";
import Link from "next/link";
import React from "react";
import Button from "./Button";

export default function Hero() {
  return (
    <section>
      {/* Desktop Hero */}
      <div className="hidden relative md:flex justify-between items-center ">
        <div className="flex flex-col lg:w-[50%] md:w-full lg:py-24 md:py-12 px-12 2xl:px-24 gap-6 bg-gradient-to-r from-sky-700 to-sky-400/0">
          <h1 className="text-white">Mewujudkan</h1>
          <h1 className="text-white">Ekonomi</h1>
          <h1 className="text-white">Biru</h1>
          <h3 className="text-white lg:w-full md:w-[50%]">
            Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
            untuk mewujudkan Ekonomi Biru.
          </h3>
          <div className="flex gap-6">
            <Button size="xl" text="Program" link="/Organisasi" />
            <Button size="xl" text="Organisasi" link="/Organisasi" />
          </div>
        </div>
        <div className="absolute flex w-full -z-10 h-full overflow-clip">
          <Image
            alt="Gambar"
            src="/assets/hero_2.svg"
            width={800}
            height={600}
            className="w-full h-full object-cover object-right"
            priority
          />
        </div>
        <div className="absolute -z-20 h-full w-full bg-sky-200"></div>
      </div>

      {/* Mobile Hero */}
      <div className="md:hidden flex flex-col gap-6 justify-between items-center py-10 mx-12">
        <Image
          alt="Gambar"
          src="/assets/hero_2.svg"
          width={800}
          height={600}
          className="w-[100%] mb-3"
          priority
        />
        <h1 className="text-center">Mewujudkan Ekonomi Biru</h1>
        <h3 className="text-center">
          Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
          untuk mewujudkan Ekonomi Biru.
        </h3>
        <div className="flex gap-6 justify-center">
          <button className="px-[4vw] py-2.5 bg-black text-white rounded-3xl hover:bg-stone-400 hover:text-black cursor-pointer">
            <Link href="/Organisasi">Program</Link>
          </button>
          <button className="px-[4vw] py-2.5 bg-black text-white rounded-3xl hover:bg-stone-400 hover:text-black cursor-pointer">
            <Link href="/Organisasi">Organisasi</Link>
          </button>
        </div>
      </div>
    </section>
  );
}
