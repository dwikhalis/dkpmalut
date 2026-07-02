"use client";

import { useState } from "react";
import SpinnerLoading from "../components/SpinnerLoading";
import AlertNotif from "./AlertNotif";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  slug: string;
  userRole: string | null;
}

export default function AdminSideMenu({ slug, userRole }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const selected = "bg-sky-100 text-black font-bold p-3";
  const unselected =
    "bg-sky-800 hover:bg-sky-950 text-white cursor-pointer p-3";

  //! LOGOUT Handler
  const handleLogout = async () => {
    setLoading(true);
    if (logoutConfirm) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        router.push("/");
      }
      setLoading(false);
      setShowSideMenu(false);
      setLogoutConfirm([false, "hidden"]);
    }
  };

  //! ========== USER ACCESS NOTES ========== //
  //! 1. Public visitor cannot access Admin function
  //! 2. Public visitor can see data defined as "public" at the Data Page
  //! 3. Data page still show "user" data in the list, but to access it Public visitor needs to Sign Up
  //! 4. After Signed Up, Public visitor becomes "user"
  //! 5. User can see and download "public" and "user" data, IF user email has been verified
  //! 6. Inside Dashboard, "Data" can only be accessed by "partner", "user" needs to apply to be "partner" first

  //! ========== DASHBOARD FEATURE NOTES ========== //
  //! 1. User Info, CRUD Function (username, join date, organization, email (verified / not))
  //! 2. Additional Organization menu only for "partner", with CRU function
  //! 3. Partner Data menu can only see their own data.
  //! 4. Admin can update contact number to be used as main WA number for communication

  const adminMenus = [
    {
      label: "Staff",
      slug: "organisasi",
    },
    {
      label: "Berita",
      slug: "berita",
    },
    {
      label: "Galeri",
      slug: "galeri",
    },
    {
      label: "Pesan",
      slug: "pesan",
    },
    {
      label: "Data",
      slug: "data",
    },
    {
      label: "Pengguna",
      slug: "pengguna",
    },
  ];

  const partnerMenus = [
    {
      label: "Data",
      slug: "data",
    },
  ];

  const userMenus = [
    {
      label: "Data",
      slug: "data",
    },
  ];

  return (
    <div className="flex">
      {/* //! SIDE MENU */}
      <aside
        className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[20vw] w-[45vw] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
          showSideMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-5 bg-sky-800 md:pt-10 pt-20 grow">
          <div className="flex flex-col">
            {userRole === "admin" && (
              <>
                <Link href={`/profile`}>
                  <h5
                    className={`${slug === "home" ? selected : unselected} 2xl:pl-6`}
                  >
                    {"Dashboard"}
                  </h5>
                </Link>
                {adminMenus.map((e, idx) => (
                  <Link key={idx} href={`/profile/${e.slug}`}>
                    <h5
                      className={`${slug === e.slug ? selected : unselected} 2xl:pl-6`}
                    >
                      {e.label}
                    </h5>
                  </Link>
                ))}
              </>
            )}

            {userRole === "partner" && (
              <>
                <Link href={`/profile`}>
                  <h5
                    className={`${slug === "home" ? selected : unselected} 2xl:pl-6`}
                  >
                    {"Profil Akun"}
                  </h5>
                </Link>
                {partnerMenus.map((e, idx) => (
                  <Link key={idx} href={`/profile/${e.slug}`}>
                    <h5
                      className={`${slug === e.slug ? selected : unselected} 2xl:pl-6`}
                    >
                      {e.label}
                    </h5>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* //! LOGOUT */}
          <div
            className={
              "p-3 cursor-pointer text-white bg-sky-800 hover:bg-sky-950 w-full 2xl:pl-6"
            }
            onClick={() => {
              setLogoutConfirm([false, "flex"]);
            }}
          >
            {loading ? (
              <SpinnerLoading size="sm" color="white" />
            ) : (
              <h5>Keluar</h5>
            )}
          </div>
        </div>

        {/* //! RETRACT "❬" BUTTON SIDEMENU */}
        <div className="flex justify-center items-center text-6xl text-stone-300 md:hidden cursor-pointer">
          <div
            className="px-4"
            onClick={() =>
              showSideMenu ? setShowSideMenu(false) : setShowSideMenu(true)
            }
          >
            ❬
          </div>
        </div>
      </aside>

      {/* //! RETRACT "❭" BUTTON SIDEMENU */}
      <div className="flex fixed top-0 justify-center items-center text-6xl text-stone-300 h-[100vh] md:hidden cursor-pointer">
        <div
          className="px-2 py-4"
          onClick={() =>
            showSideMenu ? setShowSideMenu(false) : setShowSideMenu(true)
          }
        >
          ❭
        </div>
      </div>

      {/* //! POP UP FOCUS */}
      <div
        className={`${
          showSideMenu ? "flex" : "hidden"
        } md:hidden fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
        onClick={() => setShowSideMenu(false)}
      ></div>

      {/* //! LOGOUT POPUP CONFIRMATION  */}

      <div className={`${logoutConfirm[1]}`}>
        <AlertNotif
          type="double"
          msg="Apakah anda ingin keluar?"
          yesText="Ok"
          noText="Tidak"
          icon="warning"
          loading={loading}
          confirm={(res) => {
            if (res) {
              setLogoutConfirm([true, "flex"]);
              handleLogout();
            } else {
              setLoading(false);
              setLogoutConfirm([false, "hidden"]);
            }
          }}
        />
      </div>
    </div>
  );
}
