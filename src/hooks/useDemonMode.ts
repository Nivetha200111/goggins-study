"use client";

import { useEffect, useRef, useCallback } from "react";
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
  } = useGameStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moodRef = useRef<Mood>(mood);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;
    if (moodRef.current === "demon") return;

    clearTimers();

    timerRef.current = setTimeout(() => {
      if (moodRef.current === "happy") {
        setMood("suspicious");
      }

      timerRef.current = setTimeout(() => {
        if (moodRef.current === "suspicious") {
          setMood("angry");
        }

        timerRef.current = setTimeout(() => {
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
    clearTimers,
  ]);

  const handleActivity = useCallback(() => {
    if (!isSessionActive || !isDemonModeEnabled || !isMonitoringEnabled) return;
    if (moodRef.current === "demon") return;

    recordActivity();
    setMood("happy");
    startIdleTimer();
  }, [
    isSessionActive,
    isDemonModeEnabled,
    isMonitoringEnabled,
    recordActivity,
    setMood,
    startIdleTimer,
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
