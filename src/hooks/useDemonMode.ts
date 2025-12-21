"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import type { Mood } from "@/types";

interface DemonModeConfig {
  suspiciousThreshold?: number;
  angryThreshold?: number;
  demonThreshold?: number;
}

const DEFAULT_CONFIG: Required<DemonModeConfig> = {
  suspiciousThreshold: 10000,
  angryThreshold: 20000,
  demonThreshold: 30000,
};

const MIN_NOTES_LENGTH = 20;

export function useDemonMode(config: DemonModeConfig = {}) {
  const { suspiciousThreshold, angryThreshold, demonThreshold } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const {
    mood,
    setMood,
    isSessionActive,
    recordActivity,
    addDistraction,
    isDemonModeEnabled,
    isMonitoringEnabled,
    tabs,
    activeTabId,
    notesByTab,
    whitelist,
  } = useGameStore();

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );
  const notes = activeTabId ? notesByTab[activeTabId] ?? "" : "";

  const topicKeywords = useMemo(() => {
    const keywords = new Set<string>();
    if (activeTab?.name) {
      activeTab.name
        .split(/[^a-zA-Z0-9]+/)
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 2)
        .forEach((word) => keywords.add(word));
    }
    whitelist.keywords.forEach((keyword) => {
      const normalized = keyword.trim().toLowerCase();
      if (normalized) {
        keywords.add(normalized);
      }
    });
    return Array.from(keywords);
  }, [activeTab?.name, whitelist.keywords]);

  const isOnTopic = useMemo(() => {
    const normalizedNotes = notes.trim().toLowerCase();
    if (!normalizedNotes || normalizedNotes.length < MIN_NOTES_LENGTH) {
      return true;
    }
    if (topicKeywords.length === 0) {
      return true;
    }
    return topicKeywords.some((keyword) => normalizedNotes.includes(keyword));
  }, [notes, topicKeywords]);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const driftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moodRef = useRef<Mood>(mood);
  const onTopicRef = useRef(isOnTopic);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    onTopicRef.current = isOnTopic;
  }, [isOnTopic]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearDriftTimer = useCallback(() => {
    if (driftTimerRef.current) {
      clearTimeout(driftTimerRef.current);
      driftTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearIdleTimer();
    clearDriftTimer();
  }, [clearIdleTimer, clearDriftTimer]);

  const startIdleTimer = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;
    if (moodRef.current === "demon") return;
    if (!onTopicRef.current) return;

    clearIdleTimer();

    idleTimerRef.current = setTimeout(() => {
      if (moodRef.current === "happy") {
        setMood("suspicious");
      }

      idleTimerRef.current = setTimeout(() => {
        if (moodRef.current === "suspicious") {
          setMood("angry");
        }

        idleTimerRef.current = setTimeout(() => {
          if (moodRef.current === "angry") {
            setMood("demon");
            addDistraction();
          }
        }, demonThreshold - angryThreshold);
      }, angryThreshold - suspiciousThreshold);
    }, suspiciousThreshold);
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    suspiciousThreshold,
    angryThreshold,
    demonThreshold,
    setMood,
    addDistraction,
    clearIdleTimer,
  ]);

  const startDriftTimer = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;
    if (moodRef.current === "demon") return;
    if (onTopicRef.current) return;
    if (driftTimerRef.current) return;

    driftTimerRef.current = setTimeout(() => {
      if (moodRef.current === "happy") {
        setMood("suspicious");
      }

      driftTimerRef.current = setTimeout(() => {
        if (moodRef.current === "suspicious") {
          setMood("angry");
        }

        driftTimerRef.current = setTimeout(() => {
          if (moodRef.current === "angry") {
            setMood("demon");
            addDistraction();
          }
          driftTimerRef.current = null;
        }, demonThreshold - angryThreshold);
      }, angryThreshold - suspiciousThreshold);
    }, suspiciousThreshold);
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    suspiciousThreshold,
    angryThreshold,
    demonThreshold,
    setMood,
    addDistraction,
  ]);

  const handleActivity = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;
    if (moodRef.current === "demon") return;

    recordActivity();
    if (!onTopicRef.current) {
      if (moodRef.current === "happy") {
        setMood("suspicious");
      }
      startDriftTimer();
      return;
    }
    setMood("happy");
    startIdleTimer();
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    recordActivity,
    setMood,
    startIdleTimer,
    startDriftTimer,
  ]);

  const handleVisibilityChange = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;

    if (document.hidden) {
      clearTimers();
      setMood("demon");
      addDistraction();
      document.title = "I SEE YOU";
    }
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    setMood,
    addDistraction,
    clearTimers,
  ]);

  useEffect(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) {
      clearDriftTimer();
      return;
    }
    if (moodRef.current === "demon") return;

    if (!isOnTopic) {
      clearIdleTimer();
      startDriftTimer();
      return;
    }

    clearDriftTimer();
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    isOnTopic,
    clearIdleTimer,
    clearDriftTimer,
    startDriftTimer,
  ]);

  useEffect(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) {
      clearTimers();
      return;
    }

    startIdleTimer();

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    handleActivity,
    handleVisibilityChange,
    startIdleTimer,
    clearTimers,
  ]);

  useEffect(() => {
    if (mood !== "demon") {
      document.title = "Focus Companion";
    }
  }, [mood]);

  return {
    mood,
    isLocked: mood === "demon" && isDemonModeEnabled,
  };
}
