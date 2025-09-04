"use client";

import React, { useState } from "react";
import AdminDashboard from "../components/AdminDashboard";
import AdminPages from "../components/AdminPages";
import AdminData from "../components/AdminData";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import AuthProtect from "../Auth/AuthProtect";
import SpinnerLoading from "../components/SpinnerLoading";
import AlertNotif from "../components/AlertNotif";
import AdminMessage from "../components/AdminMessage";

export default function Page() {
  const router = useRouter();
  const [content, setContent] = useState<string>("Dashboard");
  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const selected = "bg-teal-100 text-black font-bold p-3";
  const unselected =
    "bg-teal-900 hover:bg-teal-800 text-white cursor-pointer p-3";

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

  const handleSelect = (option: string) => {
    setContent(option);
  };

  return (
    <AuthProtect>
      <div className="flex">
        {/* //! SIDE MENU */}
        <aside
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
            <h3
              className={`${content === "Inbox" ? selected : unselected} p-3`}
              onClick={() => setContent("Inbox")}
            >
              Inbox
            </h3>

            {/* SEPARATOR */}
            <div className={"p-3 w-full"}></div>

            {/* //! LOGOUT */}
            <div
              className={
                "p-3 cursor-pointer text-white bg-teal-900 hover:bg-teal-950 w-full"
              }
              onClick={() => {
                setLogoutConfirm([false, "flex"]);
              }}
            >
              {loading ? (
                <SpinnerLoading size="sm" color="white" />
              ) : (
                <h3>Keluar</h3>
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

        {/* //! CONTENT */}
        <div className="h-full w-full lg:mx-12 mx-8 ">
          {content === "Dashboard" ? (
            <AdminDashboard select={handleSelect} />
          ) : null}
          {content === "Berita" ? <AdminPages type="news" /> : null}
          {content === "Galeri" ? <AdminPages type="gallery" /> : null}
          {content === "Organisasi" ? <AdminPages type="staff" /> : null}
          {content === "Data" ? <AdminData /> : null}
          {content === "Inbox" ? <AdminMessage /> : null}
        </div>

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
    </AuthProtect>
  );
}
