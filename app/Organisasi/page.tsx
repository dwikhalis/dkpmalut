//! Force page to load fresh data each render
export const revalidate = 0;

import React from "react";
import StaffList from "../components/ListStaff";

export default function Page() {
  return (
    <>
      <section className="lg:mx-24 my-12 mx-12 min-h-[70vh]">
        <div className="flex flex-col gap-3">
          <h2>Organisasi</h2>
          <h5>
            Keorganisasian Dinas Kelautan dan Perikanan Provinsi Maluku Utara
          </h5>
        </div>
        {/* //! DESKTOP */}
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          <StaffList admin={false} />
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full mt-10">
          <StaffList admin={false} />
        </div>
      </section>
    </>
  );
}
