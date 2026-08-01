"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeftChevron, RightChevron } from "@/public/icons/iconSets";
import { supabase } from "@/lib/supabase/supabaseClient";
import { getNumUnreadMessages } from "@/lib/supabase/supabaseHelper";
import { useMessageStore } from "@/app/Stores/messageStores";
import AlertNotif from "../AlertNotif";
import SpinnerLoading from "../SpinnerLoading";
import { clearSessionCaches } from "@/lib/utils/sessionCache";
import { invalidateDatasetListCache } from "@/lib/utils/datasetListCache";

interface Props {
  slug: string;
  userRole: string | null;
  overlayMode?: boolean;
}

export default function DashSideMenu({
  slug,
  userRole,
  overlayMode = false,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState([false, "hidden"]);
  const [showMobileSideMenu, setShowMobileSideMenu] = useState(false);
  const [pendingPublicationCount, setPendingPublicationCount] = useState(0);
  const unreadMessageCount = useMessageStore((state) => state.unreadCount);
  const setUnreadMessageCount = useMessageStore(
    (state) => state.setUnreadCount,
  );
  // Desktop navigation is open by default. Starting in the open state prevents
  // its entrance transition from replaying whenever a profile route remounts.
  const [showDesktopSideMenu, setShowDesktopSideMenu] = useState(!overlayMode);
  const showOverlaySideMenu = overlayMode && showMobileSideMenu;

  const selected = "bg-sky-100 text-black font-bold py-1.5 px-3";
  const unselected =
    "bg-sky-800 hover:bg-sky-950 text-white cursor-pointer py-1.5 px-3";

  const adminMenus = [
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
    {
      label: "App CMS",
      slug: "app-cms",
    },
    {
      label: "Log Aktivitas",
      slug: "logs",
    },
  ];

  const partnerMenus = [{ label: "Data", slug: "data" }];

  useEffect(() => {
    const handleClose = () => {
      setShowMobileSideMenu(false);
      setShowDesktopSideMenu(false);
    };

    window.addEventListener("dash-side-menu-close", handleClose);

    return () => {
      window.removeEventListener("dash-side-menu-close", handleClose);
    };
  }, []);

  useEffect(() => {
    if (userRole !== "admin") return;

    let active = true;

    const refreshUnreadMessageCount = async () => {
      const count = await getNumUnreadMessages();
      if (active) setUnreadMessageCount(count);
    };

    void refreshUnreadMessageCount();

    const channel = supabase
      .channel("dash-side-menu:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void refreshUnreadMessageCount(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [setUnreadMessageCount, userRole]);

  useEffect(() => {
    if (userRole !== "admin") {
      setPendingPublicationCount(0);
      return;
    }

    let active = true;

    const refreshPendingPublicationCount = async () => {
      const [datasetResult, mapResult, dashboardResult] = await Promise.all([
        supabase
          .from("datasets")
          .select("id", { count: "exact", head: true })
          .in("kind", ["dataset", "link"])
          .eq("published", "requested"),
        supabase
          .from("map_datasets")
          .select("id", { count: "exact", head: true })
          .eq("published", "requested"),
        supabase
          .from("datasets")
          .select("id", { count: "exact", head: true })
          .eq("kind", "dashboard")
          .eq("published", "requested"),
      ]);

      if (datasetResult.error) {
        console.warn("Gagal menghitung publikasi dataset tertunda:", datasetResult.error);
      }
      if (mapResult.error) {
        console.warn("Gagal menghitung publikasi peta tertunda:", mapResult.error);
      }
      if (dashboardResult.error) console.warn("Gagal menghitung publikasi dashboard tertunda:", dashboardResult.error);

      if (active) {
        setPendingPublicationCount(
          (datasetResult.count ?? 0) + (mapResult.count ?? 0) + (dashboardResult.count ?? 0),
        );
      }
    };

    void refreshPendingPublicationCount();

    const datasetChannel = supabase
      .channel("dash-side-menu:dataset-publications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "datasets" },
        () => void refreshPendingPublicationCount(),
      )
      .subscribe();
    const mapChannel = supabase
      .channel("dash-side-menu:map-publications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_datasets" },
        () => void refreshPendingPublicationCount(),
      )
      .subscribe();
    const dashboardChannel = supabase
      .channel("dash-side-menu:dashboard-publications")
      .on("postgres_changes", { event: "*", schema: "public", table: "datasets" }, () => void refreshPendingPublicationCount())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(datasetChannel);
      void supabase.removeChannel(mapChannel);
      void supabase.removeChannel(dashboardChannel);
    };
  }, [userRole]);

  const handleLogout = async () => {
    setLoading(true);

    if (logoutConfirm) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        clearSessionCaches();
        invalidateDatasetListCache();
        router.push("/");
      }

      setLoading(false);
      setShowMobileSideMenu(false);
      setLogoutConfirm([false, "hidden"]);
    }
  };

  const renderMenuLink = (menu: { label: string; slug: string }) => (
    <Link key={menu.slug} href={`/profile/${menu.slug}`}>
      <span
        className={`flex items-center gap-2 ${slug === menu.slug ? selected : unselected} 2xl:pl-6`}
      >
        {menu.label}
        {menu.slug === "pesan" && unreadMessageCount > 0 && (
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[0.65rem] font-bold leading-none text-white"
            aria-label={`${unreadMessageCount} pesan baru`}
          >
            {unreadMessageCount}
          </span>
        )}
        {userRole === "admin" &&
          menu.slug === "data" &&
          pendingPublicationCount > 0 && (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[0.65rem] font-bold leading-none text-white"
              aria-label={`${pendingPublicationCount} publikasi dataset tertunda`}
            >
              {pendingPublicationCount}
            </span>
          )}
      </span>
    </Link>
  );

  return (
    <div
      className={`flex ${
        overlayMode
          ? "w-0 shrink-0"
          : `md:shrink-0 md:transition-[width] md:duration-500 md:ease-in-out ${
              showDesktopSideMenu ? "md:w-[20vw] lg:w-[18vw]" : "md:w-0 lg:w-0"
            }`
      }`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-[1300] h-dvh w-[45vw] overflow-visible transition-transform duration-300 ease-in-out md:w-[20vw] lg:w-[18vw] ${
          showMobileSideMenu
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none"
        } ${
          overlayMode
            ? ""
            : showDesktopSideMenu
              ? "md:translate-x-0 md:pointer-events-auto"
              : "md:-translate-x-full md:pointer-events-none"
        }`}
      >
        <div className="relative flex h-full w-[45vw] transition-transform duration-300 ease-in-out md:w-[20vw] md:duration-500 lg:w-[18vw]">
          <div className="flex w-full flex-col gap-5 bg-sky-800 pt-[calc(12vw+2rem)] md:pt-[calc(8vw+2rem)] xl:pt-[calc(6vw+2rem)]">
            <div className="flex flex-col">
              {userRole === "admin" && (
                <>
                  <Link href="/profile">
                    <span
                      className={`block ${slug === "home" ? selected : unselected} 2xl:pl-6`}
                    >
                      Dashboard
                    </span>
                  </Link>

                  {adminMenus.map(renderMenuLink)}
                </>
              )}

              {userRole === "partner" && (
                <>
                  <Link href="/profile">
                    <span
                      className={`block ${slug === "home" ? selected : unselected} 2xl:pl-6`}
                    >
                      Profil Akun
                    </span>
                  </Link>

                  {partnerMenus.map(renderMenuLink)}

                </>
              )}

              {userRole === "user" && (
                <>
                  <Link href="/profile">
                    <span
                      className={`block ${slug === "home" ? selected : unselected} 2xl:pl-6`}
                    >
                      Profil Akun
                    </span>
                  </Link>

                </>
              )}
            </div>

            <button
              type="button"
              className="w-full cursor-pointer bg-sky-800 p-3 text-left text-white hover:bg-sky-950 2xl:pl-6"
              onClick={() => setLogoutConfirm([false, "flex"])}
            >
              {loading ? (
                <SpinnerLoading size="sm" color="white" />
              ) : (
                <span>Keluar</span>
              )}
            </button>
          </div>

          <button
            type="button"
            className={`pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 translate-x-full cursor-pointer ${
              overlayMode ? "block" : "md:hidden"
            }`}
            onClick={() =>
              showMobileSideMenu
                ? setShowMobileSideMenu(false)
                : setShowMobileSideMenu(true)
            }
            aria-label={showMobileSideMenu ? "Tutup menu" : "Buka menu"}
          >
            <span className="-translate-x-1 px-0">
              <span
                className={`flex flex-col items-center justify-center rounded-r-md px-1 py-2 transition-colors duration-300 ${
                  showMobileSideMenu ? "bg-sky-800" : "bg-stone-300"
                }`}
              >
                <span className="[writing-mode:vertical-rl] text-sm text-white">
                  Menu
                </span>
                <span className="mt-1">
                  {showMobileSideMenu ? (
                    <LeftChevron className="h-5 w-5" color="white" />
                  ) : (
                    <RightChevron className="h-5 w-5" color="white" />
                  )}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            className={`pointer-events-auto absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-full cursor-pointer ${
              overlayMode ? "" : "md:block"
            }`}
            onClick={() =>
              showDesktopSideMenu
                ? setShowDesktopSideMenu(false)
                : setShowDesktopSideMenu(true)
            }
            aria-label={showDesktopSideMenu ? "Tutup menu" : "Buka menu"}
          >
            <span className="-translate-x-1 px-0">
              <span
                className={`flex flex-col items-center justify-center rounded-r-md px-1 py-2 transition-colors duration-300 ${
                  showDesktopSideMenu ? "bg-sky-800" : "bg-stone-300"
                }`}
              >
                <span className="[writing-mode:vertical-rl] text-sm text-white">
                  Menu
                </span>
                <span className="mt-1">
                  {showDesktopSideMenu ? (
                    <LeftChevron className="h-5 w-5" color="white" />
                  ) : (
                    <RightChevron className="h-5 w-5" color="white" />
                  )}
                </span>
              </span>
            </span>
          </button>
        </div>
      </aside>

      <div
        className={`${
          showMobileSideMenu || showOverlaySideMenu ? "flex" : "hidden"
        } fixed inset-0 z-[1250] bg-black/50 ${overlayMode ? "" : "md:hidden"}`}
        onClick={() => setShowMobileSideMenu(false)}
      />

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
