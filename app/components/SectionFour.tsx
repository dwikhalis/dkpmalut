import React from "react";
import Carousel from "./Carousel";
import data from "../../public/dummyDatabase.json";
import Link from "next/link";

let images: any = [];
data.forEach((e) => {
  images.push([e.image, e.title]);
});

export default function SectionFour() {
  return (
    <div className="flex flex-col gap-6 py-12 md:px-12 px-6 xl:mx-24 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">GALERI</h2>
        <h5 className="text-center">
          Galeri Kelautan dan Perikanan Maluku Utara
        </h5>
      </div>
      <Carousel images={images} />
      <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
        <Link href="/Galeri">
          <h5>Lainnya</h5>
        </Link>
      </button>
    </div>
  );
}
