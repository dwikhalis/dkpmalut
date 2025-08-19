import { create } from "zustand";

interface AuthState {
  user: unknown;
  setUser: (user: unknown) => void;
  clearUser: () => void;
  isLoggedIn: boolean;
  loading: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  loading: true, // start as true until we check auth
  isLoggedIn: false,
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setLoading: (loading) => set({ loading }),
}));
