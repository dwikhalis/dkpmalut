import React from "react";
import Carousel from "./Carousel";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const images = ["/assets/pic_img_1.jpg", "/assets/pic_img_2.jpg"];

export default function SectionFour() {
  return (
    <div className="flex flex-col gap-6 py-12 md:px-12 px-6 xl:mx-24 justify-center items-center">
      <div className="flex flex-col mb-3 gap-6">
        <h2 className="text-center">Galeri</h2>
      </div>
      <Carousel images={images} />
      <button className="px-7 py-3 bg-black text-white rounded-full hover:bg-stone-400 hover:text-black cursor-pointer">
        <h5>Lebih Banyak</h5>
      </button>
    </div>
  );
}
