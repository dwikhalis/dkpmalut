import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MapConfig } from "@/lib/utils/mapConfig";

type MapVisualizationState = {
  drafts: Record<string, MapConfig>;
  setDraft: (mapDatasetId: string, config: MapConfig) => void;
  clearDraft: (mapDatasetId: string) => void;
};

export const useMapVisualizationStore = create<MapVisualizationState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (mapDatasetId, config) =>
        set((state) => ({
          drafts: { ...state.drafts, [mapDatasetId]: config },
        })),
      clearDraft: (mapDatasetId) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[mapDatasetId];
          return { drafts };
        }),
    }),
    {
      name: "map-visualization-drafts",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
