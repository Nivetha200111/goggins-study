"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGameStore } from "@/store/gameStore";

type AgentBridgeType =
  | "FOCUS_AGENT_CONFIG_SYNC"
  | "FOCUS_AGENT_START_SESSION"
  | "FOCUS_AGENT_END_SESSION";

function postBridgeMessage(type: AgentBridgeType, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  window.postMessage(
    {
      source: "focus-dashboard",
      type,
      payload,
    },
    window.location.origin
  );
}

export function ChromeAgentSync() {
  const {
    isSessionActive,
    activeTabId,
    tabs,
    whitelist,
    isSoundEnabled,
    sessionGoalMinutes,
    sessionGoalEndsAt,
  } = useGameStore();
  const previousSessionActiveRef = useRef(false);

  const activeTopic = tabs.find((tab) => tab.id === activeTabId)?.name ?? "";
  const config = useMemo(
    () => ({
      topic: activeTopic,
      goalMinutes: sessionGoalMinutes,
      goalEndsAt: sessionGoalEndsAt,
      pinnedTimer: true,
      soundEnabled: isSoundEnabled,
      whitelist,
    }),
    [activeTopic, isSoundEnabled, sessionGoalEndsAt, sessionGoalMinutes, whitelist]
  );

  useEffect(() => {
    postBridgeMessage("FOCUS_AGENT_CONFIG_SYNC", config);
  }, [config]);

  useEffect(() => {
    const previous = previousSessionActiveRef.current;

    if (isSessionActive && !previous) {
      postBridgeMessage("FOCUS_AGENT_START_SESSION", config);
    }

    if (!isSessionActive && previous) {
      postBridgeMessage("FOCUS_AGENT_END_SESSION", {});
    }

    previousSessionActiveRef.current = isSessionActive;
  }, [config, isSessionActive]);

  return null;
}
