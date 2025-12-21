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

// Window info used by Electron overlay and detection
export interface WindowInfo {
  title: string;
  owner: string;
  url?: string;
  path?: string;
  isStudying?: boolean;
}

// Electron preload API surface
export interface ElectronAPI {
  onWindowChanged: (callback: (data: WindowInfo) => void) => void;
  onSessionStarted: (callback: () => void) => void;
  onSessionEnded: (callback: () => void) => void;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  getWhitelist: () => Promise<Whitelist>;
  setWhitelist: (whitelist: Whitelist) => Promise<void>;
  getStudyTopic: () => Promise<string>;
  setStudyTopic: (topic: string) => Promise<void>;
  setOverlayInteractive: (interactive: boolean) => void;
  companionClicked: () => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
