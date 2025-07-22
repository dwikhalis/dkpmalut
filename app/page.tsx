"use client";

import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import SectionFour from "./components/SectionFour";
import SectionOne from "./components/SectionOne";
import SectionThree from "./components/SectionThree";
import SectionTwo from "./components/SectionTwo";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const images = [
  "/assets/pic_img_1.jpg",
  "/assets/pic_img_2.jpg",
  "/assets/pic_card_3.png",
];

export default function Page() {
  return (
    <>
      <Navbar />
      <Hero />
      <SectionOne />
      <SectionTwo />
      <SectionThree />
      <SectionFour />
      <Footer />
    </>
  );
}
