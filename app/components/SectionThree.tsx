import React from "react";
import Card from "./Card";

export default function SectionThree() {
  return (
    <div className="py-12">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">BERITA TERKINI</h2>
        <h5 className="text-center">
          Kanal Informasi Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>
      <div className="flex flex-wrap gap-6 xl:gap-12 2xl:gap-24 justify-center m-12 2xl:mx-24">
        <Card />
        <Card />
        <Card />
      </div>
    </div>
  );
}
