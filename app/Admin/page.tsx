"use client";

import React, { useEffect, useState } from "react";
import AdminBerita from "../components/AdminBerita";
import AdminGaleri from "../components/AdminGaleri";
import AdminDashboard from "../components/AdminDashboard";
import AdminOrg from "../components/AdminOrg";
import AdminData from "../components/AdminData";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [content, setContent] = useState<string>("Dashboard");
  const [show, setShow] = useState("hidden");
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const selected = "bg-teal-100 text-black font-bold p-3";
  const unselected =
    "bg-teal-900 hover:bg-teal-800 text-white cursor-pointer p-3";

  //!  CHECK User Login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/404");
      } else {
        setShow("flex");
      }
    });
  }, [router]);

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

  return (
    <>
      <div className={`${show}`}>
        {/* //! SIDE MENU */}
        <div
          className={`flex top-0 md:top-auto md:static fixed z-5 md:z-0 justify-between md:w-[20vw] w-[45vw] md:grow md:h-auto h-[100vh] transition-transform duration-300 md:translate-x-0 ${
            showSideMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col bg-teal-900 md:pt-10 pt-20 grow">
            <h3
              className={`${content === "Dashboard" ? selected : unselected}`}
              onClick={() => setContent("Dashboard")}
            >
              Dashboard
            </h3>
            <h3
              className={`${content === "Organisasi" ? selected : unselected}`}
              onClick={() => setContent("Organisasi")}
            >
              Organisasi
            </h3>
            <h3
              className={`${content === "Berita" ? selected : unselected}`}
              onClick={() => setContent("Berita")}
            >
              Berita
            </h3>
            <h3
              className={`${content === "Galeri" ? selected : unselected}`}
              onClick={() => setContent("Galeri")}
            >
              Galeri
            </h3>
            <h3
              className={`${content === "Data" ? selected : unselected} p-3`}
              onClick={() => setContent("Data")}
            >
              Data
            </h3>

            {/* SEPARATOR */}
            <div className={"p-3 w-full"}></div>

            {/* //! LOGOUT */}
            <h3
              className={
                "p-3 cursor-pointer text-white bg-teal-900 hover:bg-teal-950 w-full"
              }
              onClick={() => setLogoutConfirm([false, "flex"])}
            >
              {loading ? "Logging out..." : "Keluar"}
            </h3>
          </div>

          {/* //! RETRACT "❬" BUTTON SIDEMENU */}
          <div className="flex justify-center items-center text-6xl text-stone-300 md:hidden">
            <div
              className="px-4"
              onClick={() =>
                showSideMenu ? setShowSideMenu(false) : setShowSideMenu(true)
              }
            >
              ❬
            </div>
          </div>
        </div>

        {/* //! RETRACT "❭" BUTTON SIDEMENU */}
        <div className="flex fixed top-0 justify-center items-center text-6xl text-stone-300 h-[100vh] md:hidden">
          <div
            className="px-2 py-4"
            onClick={() =>
              showSideMenu ? setShowSideMenu(false) : setShowSideMenu(true)
            }
          >
            ❭
          </div>
        </div>

        <div
          className={`${
            showSideMenu ? "flex" : "hidden"
          } fixed z-3 inset-0 bg-black/50 w-[100vw] h-[100vh]`}
          onClick={() => setShowSideMenu(false)}
        ></div>

        {/* //! CONTENT */}
        <div className="h-full w-full lg:mr-24 mr-8 ">
          {content === "Dashboard" ? <AdminDashboard /> : null}
          {content === "Berita" ? <AdminBerita /> : null}
          {content === "Galeri" ? <AdminGaleri /> : null}
          {content === "Organisasi" ? <AdminOrg /> : null}
          {content === "Data" ? <AdminData /> : null}
        </div>
      </div>

      {/* //! LOGOUT POPUP CONFIRMATION  */}
      <div
        className={`${logoutConfirm[1]} fixed inset-0 z-10 justify-center items-center bg-black/50 w-[100vw] h-[100vh]`}
      >
        <div className="flex flex-col gap-6 justify-center object-center rounded-2xl bg-stone-100 md:p-12 p-8 md:h-[20vw] md:w-[50vw]">
          <h3 className="text-center">Apakah anda ingin keluar?</h3>
          <div className="flex md:gap-12 gap-3 justify-center object-center">
            {/* YES Logout */}
            <button
              className="bg-sky-600 p-4 md:w-40 w-20 text-white font-bold rounded-2xl hover:bg-sky-700"
              onClick={() => {
                setLogoutConfirm([true, "hidden"]);
                handleLogout();
              }}
            >
              <h3>Ya</h3>
            </button>

            {/* NO Logout */}
            <button
              className="bg-rose-600 p-4 md:w-40 w-20 text-white font-bold rounded-2xl hover:bg-rose-700"
              onClick={() => setLogoutConfirm([false, "hidden"])}
            >
              <h3>Tidak</h3>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
