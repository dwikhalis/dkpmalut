import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Card from "../components/Card";
import DummyContent from "@/public/dummyDatabase.json";

const page = () => {
  return (
    <>
      <Navbar />
      <section className="lg:mx-24 my-12 mx-12">
        <div className="flex flex-col gap-3">
          <h2>Kabar Kelautan Perikanan</h2>
          <h5>
            Informasi seputar dunia Kelautan dan Perikanan Provinsi Maluku Utara
          </h5>
        </div>
        {/* //! DESKTOP */}
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          {DummyContent.map((e, idx) => {
            return (
              <div className="w-[30%]" key={idx}>
                <Card type="open" data={DummyContent} id={idx + 1} />
              </div>
            );
          })}
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full mt-10">
          {DummyContent.map((e, idx) => {
            return (
              <Card type="open" data={DummyContent} id={idx + 1} key={idx} />
            );
          })}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default page;
