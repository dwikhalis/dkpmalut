"use client";

import { useEffect, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/supabaseClient";
import { useAuthStore } from "@/app/Stores/authStores";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useAuthStore((state) => state.setAuth);

  const setProfile = useAuthStore((state) => state.setProfile);

  const clearAuth = useAuthStore((state) => state.clearAuth);

  const setLoading = useAuthStore((state) => state.setLoading);

  const [profileUserId, setProfileUserId] = useState<string | null | undefined>(
    undefined,
  );

  /*
   * Session listener.
   */
  useEffect(() => {
    let mounted = true;

    const applySession = (session: Session | null) => {
      if (!mounted) return;

      if (!session?.user?.id) {
        clearAuth();
        setProfileUserId(null);
        setLoading(false);
        return;
      }

      setAuth(session);
      setProfileUserId(session.user.id);
    };

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Failed to get session:", error.message);

        clearAuth();
        setProfileUserId(null);
        setLoading(false);
        return;
      }

      applySession(session);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth, clearAuth, setLoading]);

  /*
   * Profile loader.
   */
  useEffect(() => {
    let mounted = true;

    const loadUserProfile = async () => {
      if (profileUserId === undefined) {
        return;
      }

      if (profileUserId === null) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: profile, error } = await supabase
        .from("users")
        .select(
          `
              id,
              username,
              email,
              organization,
              role
            `,
        )
        .eq("id", profileUserId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Failed to load profile:", error.message);

        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profile);
      setLoading(false);
    };

    void loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [profileUserId, setProfile, setLoading]);

  return children;
}
