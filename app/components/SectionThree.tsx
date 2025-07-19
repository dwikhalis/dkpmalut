import React from "react";
import Card from "./Card";
import DummyContent from "@/public/dummyDatabase.json";

export default function SectionThree() {
  return (
    <div className="flex flex-col gap-6 py-12 mx-6 mb-12 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">BERITA TERKINI</h2>
        <h5 className="text-center">
          Kanal Informasi Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>
      <div className="flex flex-wrap gap-6 xl:gap-12 2xl:gap-24 justify-center 2xl:mx-24 mb-12">
        <Card id={1} data={DummyContent} />
        <Card id={3} data={DummyContent} />
        <Card id={4} data={DummyContent} />
      </div>
      <div>
        <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
          <h5>Lebih Banyak</h5>
        </button>
      </div>
    </div>
  );
}
