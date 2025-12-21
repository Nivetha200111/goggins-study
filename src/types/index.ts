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
  // Companion state
  mood: Mood;
  isSessionActive: boolean;

  // Study tabs
  tabs: StudyTab[];
  activeTabId: string | null;

  // Stats
  totalXp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;

  // Session tracking
  sessionStart: number | null;
  lastActivityTime: number;

  // Actions
  setMood: (mood: Mood) => void;
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
