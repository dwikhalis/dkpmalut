import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type EditDraft = Record<string, unknown>;

type DataEditState = {
  drafts: Record<string, EditDraft>;
  setDraft: (key: string, draft: EditDraft) => void;
  clearDraft: (key: string) => void;
};

export const useDataEditStore = create<DataEditState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (key, draft) =>
        set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
      clearDraft: (key) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[key];
          return { drafts };
        }),
    }),
    {
      name: "data-edit-drafts",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
