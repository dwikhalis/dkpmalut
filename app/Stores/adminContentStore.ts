"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AdminContentType = "news" | "gallery" | "staff";
export type AdminLocale = "id" | "en";

export type AdminStaffDraft = {
  name: string;
  position: string;
  division: string;
  gender: string;
  photo?: string;
};

export type AdminNewsDraft = {
  tag: string;
  date: string;
  title: string;
  content: string;
  source: string;
  image?: string;
};

export type AdminGalleryDraft = {
  tag: string;
  title: string;
  date: string;
  description: string;
  image?: string;
};

type AdminDraft = {
  staffForm: AdminStaffDraft;
  newsForm: AdminNewsDraft;
  galleryForm: AdminGalleryDraft;
  isCustomDivision: boolean;
};

type AdminContentStore = {
  drafts: Record<string, AdminDraft>;
  getDraft: (type: AdminContentType, locale: AdminLocale) => AdminDraft;
  setDraft: (
    type: AdminContentType,
    locale: AdminLocale,
    draft: Partial<AdminDraft>,
  ) => void;
  clearDraft: (type: AdminContentType, locale: AdminLocale) => void;
};

export const emptyStaffDraft: AdminStaffDraft = {
  name: "",
  position: "",
  division: "",
  gender: "",
  photo: "",
};

export const emptyNewsDraft: AdminNewsDraft = {
  tag: "",
  date: "",
  title: "",
  content: "",
  source: "",
  image: "",
};

export const emptyGalleryDraft: AdminGalleryDraft = {
  tag: "",
  title: "",
  date: "",
  description: "",
  image: "",
};

export const emptyAdminDraft: AdminDraft = {
  staffForm: emptyStaffDraft,
  newsForm: emptyNewsDraft,
  galleryForm: emptyGalleryDraft,
  isCustomDivision: false,
};

function getDraftKey(type: AdminContentType, locale: AdminLocale) {
  return `${type}:${locale}`;
}

export const useAdminContentStore = create<AdminContentStore>()(
  persist(
    (set, get) => ({
      drafts: {},

      getDraft: (type, locale) => {
        return get().drafts[getDraftKey(type, locale)] ?? emptyAdminDraft;
      },

      setDraft: (type, locale, draft) => {
        set((state) => {
          const key = getDraftKey(type, locale);
          const currentDraft = state.drafts[key] ?? emptyAdminDraft;

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...currentDraft,
                ...draft,
              },
            },
          };
        });
      },

      clearDraft: (type, locale) => {
        set((state) => {
          const key = getDraftKey(type, locale);
          const { [key]: _removedDraft, ...remainingDrafts } = state.drafts;

          return {
            drafts: remainingDrafts,
          };
        });
      },
    }),
    {
      name: "admin-content-drafts",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        drafts: state.drafts,
      }),
    },
  ),
);
