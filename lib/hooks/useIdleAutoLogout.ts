"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";
import { useRouter } from "next/navigation";

interface Props {
  timeout: number;
  onAutoLogout?: (status: boolean) => void;
}

export function useIdleAutoLogout({ timeout, onAutoLogout }: Props) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (!isLoggedIn) return;

    let timer: ReturnType<typeof setTimeout>;
    let isTabVisible = !document.hidden;

    const logout = async () => {
      await supabase.auth.signOut();
      clearUser();
      router.push("/");
      onAutoLogout?.(true);
    };

    const resetTimer = () => {
      if (!isTabVisible) return; // don’t count time while tab is hidden
      if (timer) clearTimeout(timer);
      timer = setTimeout(logout, timeout);
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        resetTimer(); // restart timer when tab becomes visible again
      } else if (timer) {
        clearTimeout(timer); // pause countdown
      }
    };

    const events = ["mousemove", "keydown", "scroll", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetTimer(); // start countdown

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [timeout, clearUser, isLoggedIn, router, onAutoLogout]);
}
