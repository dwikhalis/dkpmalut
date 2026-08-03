import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "user" | "partner" | "kadis" | "sekdis";

type UserProfile = {
  id: string;
  username: string;
  email: string;
  organization: string;
  role: UserRole;
};

interface AuthState {
  session: Session | null;
  user: User | null;
  userId: string | null;
  profile: UserProfile | null;
  role: UserRole | null;

  isLoggedIn: boolean;
  loading: boolean;

  setAuth: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  userId: null,
  profile: null,
  role: null,

  isLoggedIn: false,
  loading: true,

  setAuth: (session) =>
    set({
      session,
      user: session?.user ?? null,
      userId: session?.user?.id ?? null,
      isLoggedIn: !!session,
    }),

  setProfile: (profile) =>
    set({
      profile,
      role: profile?.role ?? null,
    }),

  clearAuth: () =>
    set({
      session: null,
      user: null,
      userId: null,
      profile: null,
      role: null,
      isLoggedIn: false,
    }),

  setLoading: (loading) => set({ loading }),
}));
