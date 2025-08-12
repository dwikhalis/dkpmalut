//! Force page to load fresh data each render
export const revalidate = 0;

import React from "react";
import Card from "../components/Card";
import { getNews } from "@/lib/supabase/getHelper";

const page = async () => {
  const fetchedData = await getNews();

  return (
    <>
      <section className="lg:mx-24 my-12 mx-12">
        <div className="flex flex-col gap-3">
          <h2>Kabar Kelautan Perikanan</h2>
          <h5>
            Informasi seputar dunia Kelautan dan Perikanan Provinsi Maluku Utara
          </h5>
        </div>
        {/* //! DESKTOP */}
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          {fetchedData.map((e, idx) => {
            return (
              <div className="w-[30%]" key={idx}>
                <Card type="open" data={fetchedData} id={e.id} />
              </div>
            );
          })}
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full mt-10">
          {fetchedData.map((e, idx) => {
            return <Card type="open" data={fetchedData} id={e.id} key={idx} />;
          })}
        </div>
      </section>
    </>
  );
};

export default page;
