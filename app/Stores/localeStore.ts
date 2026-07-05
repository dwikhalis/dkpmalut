// app/Stores/localeStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "id" | "en";

type LocaleStore = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: "id",

      setLocale: (locale) => set({ locale }),

      toggleLocale: () =>
        set({
          locale: get().locale === "id" ? "en" : "id",
        }),
    }),
    {
      name: "app-locale",
    },
  ),
);
