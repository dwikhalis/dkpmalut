"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PurchaseType = "individual" | "group";

export type OperatorType = "homestay" | "resort" | "lob" | "other";

export type VisitorGender = "male" | "female" | "prefer_not_to_say";

export type IdentityType = "ktp" | "sim" | "passport" | "kitas" | "kitap";

export type TicketVisitor = {
  visitorName: string;
  country: string;
  gender: VisitorGender | "";
  identityType: IdentityType | "";
  identityNumber: string;
};

export type SelectedConservationArea = {
  id: string;
  slug: string;
  name: string;
  imagePath: string | null;
  ticketPrice: number;
};

export type TicketFormData = {
  purchaseType: PurchaseType | "";

  usesOperator: boolean;
  operatorName: string;
  operatorEmail: string;
  operatorType: OperatorType | "";
  operatorTypeOther: string;

  bringsBoat: boolean;
  boatName: string;

  visitorCount: number;

  buyerName: string;
  buyerEmail: string;

  visitors: TicketVisitor[];
  selectedAreas: SelectedConservationArea[];
};

type TicketStore = {
  currentStep: number;
  formData: TicketFormData;

  bookingId: string | null;
  publicStatusToken: string | null;
  snapToken: string | null;

  setCurrentStep: (step: number) => void;

  setFormData: (
    data:
      | Partial<TicketFormData>
      | ((currentFormData: TicketFormData) => Partial<TicketFormData>),
  ) => void;

  setVisitorCount: (count: number) => void;

  updateVisitor: (visitorIndex: number, data: Partial<TicketVisitor>) => void;

  toggleSelectedArea: (area: SelectedConservationArea) => void;

  setBookingId: (bookingId: string | null) => void;

  setPublicStatusToken: (token: string | null) => void;

  setSnapToken: (token: string | null) => void;

  resetPaymentData: () => void;
  resetTicketStore: () => void;
};

const createEmptyVisitor = (): TicketVisitor => ({
  visitorName: "",
  country: "",
  gender: "",
  identityType: "",
  identityNumber: "",
});

const initialFormData: TicketFormData = {
  purchaseType: "individual",

  usesOperator: false,
  operatorName: "",
  operatorEmail: "",
  operatorType: "",
  operatorTypeOther: "",

  bringsBoat: false,
  boatName: "",

  visitorCount: 1,

  buyerName: "",
  buyerEmail: "",

  visitors: [createEmptyVisitor()],
  selectedAreas: [],
};

export const useTicketStore = create<TicketStore>()(
  persist(
    (set) => ({
      currentStep: 1,
      formData: initialFormData,

      bookingId: null,
      publicStatusToken: null,
      snapToken: null,

      setCurrentStep: (step) => {
        const safeStep = Math.min(Math.max(step, 1), 4);

        set({
          currentStep: safeStep,
        });
      },

      setFormData: (data) => {
        set((state) => {
          const updates =
            typeof data === "function" ? data(state.formData) : data;

          return {
            formData: {
              ...state.formData,
              ...updates,
            },
          };
        });
      },

      setVisitorCount: (count) => {
        const safeCount = Math.min(100, Math.max(1, Math.floor(count)));

        set((state) => {
          const currentVisitors = [...state.formData.visitors];

          if (currentVisitors.length < safeCount) {
            const missingVisitors = safeCount - currentVisitors.length;

            for (let index = 0; index < missingVisitors; index += 1) {
              currentVisitors.push(createEmptyVisitor());
            }
          }

          if (currentVisitors.length > safeCount) {
            currentVisitors.splice(safeCount);
          }

          return {
            /*
             * Any existing payment preparation becomes invalid
             * when checkout details change.
             */
            bookingId: null,
            publicStatusToken: null,
            snapToken: null,

            formData: {
              ...state.formData,
              visitorCount: safeCount,
              visitors: currentVisitors,
            },
          };
        });
      },

      updateVisitor: (visitorIndex, data) => {
        set((state) => {
          if (
            visitorIndex < 0 ||
            visitorIndex >= state.formData.visitors.length
          ) {
            return state;
          }

          const updatedVisitors = state.formData.visitors.map(
            (visitor, index) =>
              index === visitorIndex
                ? {
                    ...visitor,
                    ...data,
                  }
                : visitor,
          );

          return {
            bookingId: null,
            publicStatusToken: null,
            snapToken: null,

            formData: {
              ...state.formData,
              visitors: updatedVisitors,
            },
          };
        });
      },

      toggleSelectedArea: (area) => {
        set((state) => {
          const isSelected = state.formData.selectedAreas.some(
            (selectedArea) => selectedArea.id === area.id,
          );

          const selectedAreas = isSelected
            ? state.formData.selectedAreas.filter(
                (selectedArea) => selectedArea.id !== area.id,
              )
            : [...state.formData.selectedAreas, area];

          return {
            bookingId: null,
            publicStatusToken: null,
            snapToken: null,

            formData: {
              ...state.formData,
              selectedAreas,
            },
          };
        });
      },

      setBookingId: (bookingId) => {
        set({
          bookingId,
        });
      },

      setPublicStatusToken: (token) => {
        set({
          publicStatusToken: token,
        });
      },

      setSnapToken: (token) => {
        set({
          snapToken: token,
        });
      },

      resetPaymentData: () => {
        set({
          bookingId: null,
          publicStatusToken: null,
          snapToken: null,
        });
      },

      resetTicketStore: () => {
        set({
          currentStep: 1,
          formData: {
            ...initialFormData,
            visitors: [createEmptyVisitor()],
            selectedAreas: [],
          },
          bookingId: null,
          publicStatusToken: null,
          snapToken: null,
        });
      },
    }),
    {
      name: "ticket-checkout-storage",

      storage: createJSONStorage(() => sessionStorage),

      /*
       * Persist only actual checkout data.
       * Store actions are not serialized.
       */
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        bookingId: state.bookingId,
        publicStatusToken: state.publicStatusToken,
        snapToken: state.snapToken,
      }),
    },
  ),
);
