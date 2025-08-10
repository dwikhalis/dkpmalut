import React from "react";
import { getStaff } from "@/lib/supabase/getHelper";
import StaffList from "../components/StaffList";

const page = async () => {
  const staffs = await getStaff();

  return (
    <>
      <section className="lg:mx-24 my-12 mx-12">
        <div className="flex flex-col gap-3">
          <h2>Organisasi</h2>
          <h5>
            Keorganisasian Dinas Kelautan dan Perikanan Provinsi Maluku Utara
          </h5>
        </div>
        {/* //! DESKTOP */}
        <div className="hidden md:flex flex-wrap lg:gap-10 gap-6 w-full mt-12">
          <StaffList type="regular" data={staffs} />
        </div>

        {/* //! MOBILE */}
        <div className="md:hidden flex flex-col lg:gap-10 gap-6 w-full mt-10">
          <StaffList type="regular" data={staffs} />
        </div>
      </section>
    </>
  );
};

export default page;
