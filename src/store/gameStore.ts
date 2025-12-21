"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, Mood, StudyTab } from "@/types";

const COLORS = ["#ff6b4a", "#4a9fff", "#4aff6b", "#ff4af0", "#ffd24a", "#4afff0"];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mood: "happy",
      isSessionActive: false,
      tabs: [],
      activeTabId: null,
      totalXp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      sessionStart: null,
      lastActivityTime: Date.now(),
      isDemonModeEnabled: true,
      isMonitoringEnabled: true,
      isSoundEnabled: true,

      setMood: (mood: Mood) => set({ mood }),

      toggleDemonMode: () =>
        set((state) => ({ isDemonModeEnabled: !state.isDemonModeEnabled })),

      toggleMonitoring: () =>
        set((state) => ({ isMonitoringEnabled: !state.isMonitoringEnabled })),

      toggleSound: () =>
        set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),

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
        } else {
          set({ isSessionActive: false, sessionStart: null, mood: "happy" });
        }
      },

      addTab: (name: string, color?: string) => {
        const newTab: StudyTab = {
          id: generateId(),
          name,
          color: color || COLORS[get().tabs.length % COLORS.length],
          focusMinutes: 0,
          distractions: 0,
          xp: 0,
          createdAt: Date.now(),
        };
        set((s) => ({
          tabs: [...s.tabs, newTab],
          activeTabId: s.activeTabId || newTab.id,
        }));
      },

      removeTab: (id: string) => {
        set((s) => {
          const newTabs = s.tabs.filter((t) => t.id !== id);
          return {
            tabs: newTabs,
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
        tabs: state.tabs,
        totalXp: state.totalXp,
        level: state.level,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        isDemonModeEnabled: state.isDemonModeEnabled,
        isMonitoringEnabled: state.isMonitoringEnabled,
        isSoundEnabled: state.isSoundEnabled,
      }),
    }
  )
);
