"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Mood, Whitelist } from "@/types";
import {
  supabase,
  getUserTabs,
  createTab,
  updateTab,
  deleteTab,
  type StudyTab as DBStudyTab,
} from "@/lib/supabase";

interface StudyTab {
  id: string;
  name: string;
  color: string;
  focusMinutes: number;
  distractions: number;
  xp: number;
  createdAt: number;
}

interface GameState {
  mood: Mood;
  isSessionActive: boolean;
  tabs: StudyTab[];
  activeTabId: string | null;
  notesByTab: Record<string, string>;
  whitelist: Whitelist;
  totalXp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  sessionStart: number | null;
  lastActivityTime: number;
  isDemonModeEnabled: boolean;
  isMonitoringEnabled: boolean;
  isSoundEnabled: boolean;
  userId: string | null;
  isLoading: boolean;

  setMood: (mood: Mood) => void;
  toggleDemonMode: () => void;
  toggleMonitoring: () => void;
  toggleSound: () => void;
  startSession: () => void;
  endSession: () => void;
  addTab: (name: string, color: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setNotes: (tabId: string, notes: string) => void;
  addWhitelistKeyword: (keyword: string) => void;
  removeWhitelistKeyword: (keyword: string) => void;
  recordActivity: () => void;
  addXp: (amount: number) => void;
  addDistraction: () => void;
  resetToHappy: () => void;
  updateFocusTime: () => void;
  loadUserData: (userId: string) => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const COLORS = ["#ff6b4a", "#4a9fff", "#4aff6b", "#ff4af0", "#ffd24a", "#4afff0"];

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function dbTabToLocal(tab: DBStudyTab): StudyTab {
  return {
    id: tab.id,
    name: tab.name,
    color: tab.color,
    focusMinutes: tab.focus_minutes,
    distractions: tab.distractions,
    xp: tab.xp,
    createdAt: new Date(tab.created_at).getTime(),
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mood: "happy",
      isSessionActive: false,
      tabs: [],
      activeTabId: null,
      notesByTab: {},
      whitelist: { domains: [], apps: [], keywords: [] },
      totalXp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      sessionStart: null,
      lastActivityTime: Date.now(),
      isDemonModeEnabled: true,
      isMonitoringEnabled: true,
      isSoundEnabled: true,
      userId: null,
      isLoading: false,

      setMood: (mood: Mood) => set({ mood }),

      toggleDemonMode: () =>
        set((state) => ({ isDemonModeEnabled: !state.isDemonModeEnabled })),

      toggleMonitoring: () =>
        set((state) => ({ isMonitoringEnabled: !state.isMonitoringEnabled })),

      toggleSound: () =>
        set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),

      loadUserData: async (userId: string) => {
        set({ isLoading: true, userId });

        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (user) {
          const tabs = await getUserTabs(userId);
          set({
            totalXp: user.total_xp || 0,
            level: calculateLevel(user.total_xp || 0),
            streak: user.streak || 0,
            lastActiveDate: user.last_active_date,
            tabs: tabs.map(dbTabToLocal),
            activeTabId: tabs.length > 0 ? tabs[0].id : null,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      },

      syncToCloud: async () => {
        const state = get();
        if (!state.userId) return;

        await supabase
          .from("users")
          .update({
            total_xp: state.totalXp,
            level: state.level,
            streak: state.streak,
            last_active_date: state.lastActiveDate,
          })
          .eq("id", state.userId);

        for (const tab of state.tabs) {
          await updateTab(tab.id, {
            focus_minutes: tab.focusMinutes,
            distractions: tab.distractions,
            xp: tab.xp,
          });
        }
      },

      startSession: () => {
        const today = getToday();
        const { lastActiveDate, streak } = get();

        let newStreak = streak;
        if (lastActiveDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastActiveDate !== today) {
            if (lastActiveDate === yesterdayStr) {
              newStreak = streak + 1;
            } else {
              newStreak = 1;
            }
          }
        } else {
          newStreak = 1;
        }

        set({
          isSessionActive: true,
          sessionStart: Date.now(),
          lastActivityTime: Date.now(),
          mood: "happy",
          streak: newStreak,
          lastActiveDate: today,
        });
      },

      endSession: () => {
        const state = get();
        if (state.sessionStart && state.activeTabId) {
          const focusMinutes = (Date.now() - state.sessionStart) / 60000;
          const xpEarned = Math.floor(focusMinutes * 2);

          set((s) => ({
            isSessionActive: false,
            sessionStart: null,
            mood: "happy",
            totalXp: s.totalXp + xpEarned,
            level: calculateLevel(s.totalXp + xpEarned),
            tabs: s.tabs.map((tab) =>
              tab.id === s.activeTabId
                ? {
                    ...tab,
                    focusMinutes: tab.focusMinutes + focusMinutes,
                    xp: tab.xp + xpEarned,
                  }
                : tab
            ),
          }));

          get().syncToCloud();
        } else {
          set({ isSessionActive: false, sessionStart: null, mood: "happy" });
        }
      },

      addTab: async (name: string, color?: string) => {
        const state = get();
        if (!state.userId) return;

        const tabColor = color || COLORS[state.tabs.length % COLORS.length];
        const dbTab = await createTab(state.userId, name, tabColor);

        if (dbTab) {
          const newTab = dbTabToLocal(dbTab);
          set((s) => ({
            tabs: [...s.tabs, newTab],
            activeTabId: s.activeTabId || newTab.id,
          }));
        }
      },

      removeTab: async (id: string) => {
        await deleteTab(id);
        set((s) => {
          const newTabs = s.tabs.filter((t) => t.id !== id);
          const newNotes = { ...s.notesByTab };
          delete newNotes[id];
          return {
            tabs: newTabs,
            notesByTab: newNotes,
            activeTabId:
              s.activeTabId === id
                ? newTabs.length > 0
                  ? newTabs[0].id
                  : null
                : s.activeTabId,
          };
        });
      },

      setActiveTab: (id: string) => set({ activeTabId: id }),

      setNotes: (tabId: string, notes: string) =>
        set((state) => ({
          notesByTab: {
            ...state.notesByTab,
            [tabId]: notes,
          },
        })),

      addWhitelistKeyword: (keyword: string) =>
        set((state) => {
          const normalized = keyword.trim().toLowerCase();
          if (!normalized || state.whitelist.keywords.includes(normalized)) {
            return state;
          }
          return {
            whitelist: {
              ...state.whitelist,
              keywords: [...state.whitelist.keywords, normalized],
            },
          };
        }),

      removeWhitelistKeyword: (keyword: string) =>
        set((state) => ({
          whitelist: {
            ...state.whitelist,
            keywords: state.whitelist.keywords.filter((item) => item !== keyword),
          },
        })),

      recordActivity: () => set({ lastActivityTime: Date.now() }),

      addXp: (amount: number) =>
        set((s) => ({
          totalXp: s.totalXp + amount,
          level: calculateLevel(s.totalXp + amount),
        })),

      addDistraction: () => {
        const state = get();
        if (state.activeTabId) {
          set((s) => ({
            tabs: s.tabs.map((tab) =>
              tab.id === s.activeTabId
                ? { ...tab, distractions: tab.distractions + 1 }
                : tab
            ),
          }));
        }
      },

      resetToHappy: () => {
        set({ mood: "happy", lastActivityTime: Date.now() });
      },

      updateFocusTime: () => {
        const state = get();
        if (state.sessionStart && state.activeTabId && state.isSessionActive) {
          const focusMinutes = (Date.now() - state.sessionStart) / 60000;
          set((s) => ({
            sessionStart: Date.now(),
            tabs: s.tabs.map((tab) =>
              tab.id === s.activeTabId
                ? { ...tab, focusMinutes: tab.focusMinutes + focusMinutes }
                : tab
            ),
          }));
        }
      },
    }),
    {
      name: "focus-companion-storage",
      partialize: (state) => ({
        isDemonModeEnabled: state.isDemonModeEnabled,
        isMonitoringEnabled: state.isMonitoringEnabled,
        isSoundEnabled: state.isSoundEnabled,
        notesByTab: state.notesByTab,
        whitelist: state.whitelist,
      }),
    }
  )
);
