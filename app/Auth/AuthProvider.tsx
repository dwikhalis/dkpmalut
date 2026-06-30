"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";
import type { Session } from "@supabase/supabase-js";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setProfile = useAuthStore((state) => state.setProfile);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const loadUserProfile = async (session: Session | null) => {
      setLoading(true);

      if (!session?.user?.id) {
        clearAuth();
        setLoading(false);
        return;
      }

      setAuth(session);

      const { data: profile, error } = await supabase
        .from("users")
        .select("id, username, email, organization, role")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Failed to load user profile:", error.message);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profile);
      setLoading(false);
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await loadUserProfile(session);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserProfile(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuth, setProfile, clearAuth, setLoading]);

  return <>{children}</>;
}
