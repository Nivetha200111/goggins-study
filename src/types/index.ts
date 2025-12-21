export type Mood = "happy" | "suspicious" | "angry" | "demon";

export interface StudyTab {
  id: string;
  name: string;
  color: string;
  focusMinutes: number;
  distractions: number;
  xp: number;
  createdAt: number;
}

export interface GameState {
  mood: Mood;
  isSessionActive: boolean;
  tabs: StudyTab[];
  activeTabId: string | null;
  totalXp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  sessionStart: number | null;
  lastActivityTime: number;
  isDemonModeEnabled: boolean;
  isMonitoringEnabled: boolean;
  isSoundEnabled: boolean;

  setMood: (mood: Mood) => void;
  toggleDemonMode: () => void;
  toggleMonitoring: () => void;
  toggleSound: () => void;
  startSession: () => void;
  endSession: () => void;
  addTab: (name: string, color: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  recordActivity: () => void;
  addXp: (amount: number) => void;
  addDistraction: () => void;
  resetToHappy: () => void;
  updateFocusTime: () => void;
}

export interface DemonModeState {
  mood: Mood;
  timeInCurrentMood: number;
  isLocked: boolean;
}

export interface Whitelist {
  domains: string[];
  apps: string[];
  keywords: string[];
}
