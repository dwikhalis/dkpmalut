import React from "react";

export default function Hero() {
  return (
    <>
      {/* Desktop Hero */}
      <div className="hidden md:flex justify-between items-center mx-12 2xl:mx-24 mt-10 py-10">
        <div className="flex flex-col gap-6 w-[40%]">
          <h1>Mewujudkan Ekonomi Biru</h1>
          <h3>
            Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
            untuk mewujudkan Ekonomi Biru.
          </h3>
          <div className="flex gap-6">
            <button className="px-[2vw] py-2.5 text-[1.5vw] bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
              <a href="/Organisasi">Program</a>
            </button>
            <button className="px-[2vw] py-2.5 text-[1.5vw] bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
              <a href="/Organisasi">Organisasi</a>
            </button>
          </div>
        </div>
        <img src="/assets/hero_1.png" className="w-[50%]" />
      </div>

      {/* Mobile Hero */}
      <div className="md:hidden flex flex-col gap-6 justify-between items-center py-10 mx-12">
        <img src="/assets/hero_1.png" className="w-[100%] mb-3" />
        <h1 className="text-center">Mewujudkan Ekonomi Biru</h1>
        <h3 className="text-center">
          Dinas Kelautan dan Perikanan (DKP) Provinsi Maluku Utara. Bersinergi
          untuk mewujudkan Ekonomi Biru.
        </h3>
        <div className="flex gap-6 justify-center">
          <button className="px-[4vw] py-2.5 bg-black text-white rounded-3xl hover:bg-stone-400 hover:text-black cursor-pointer">
            <h3>Program</h3>
          </button>
          <button className="px-[4vw] py-2.5 bg-black text-white rounded-3xl hover:bg-stone-400 hover:text-black cursor-pointer">
            <h3>Organisasi</h3>
          </button>
        </div>
      </div>
    </>
  );
}
