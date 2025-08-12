"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setIsLoggedIn = useAuthStore((state) => state.setIsLoggedIn);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setLoading(false);
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
        setLoading(false);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [setIsLoggedIn, setLoading]);

  return <>{children}</>;
}
