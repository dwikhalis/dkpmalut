import { create } from "zustand";

interface MessageState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));
