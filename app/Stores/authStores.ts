import { create } from "zustand";

interface AuthState {
  isLoggedIn: boolean;
  loading: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  loading: true, // start as true until we check auth
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setLoading: (loading) => set({ loading }),
}));
