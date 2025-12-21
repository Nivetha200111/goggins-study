"use client";

import { useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import type { Mood } from "@/types";

const SHOUT_MESSAGES: Record<Mood, string[]> = {
  happy: [
    "Great job! Keep it up!",
    "You're doing amazing!",
    "Stay focused!",
    "I'm proud of you!",
  ],
  suspicious: [
    "Hey! Are you still there?",
    "I'm watching you!",
    "Don't you dare leave!",
    "Focus! Now!",
  ],
  angry: [
    "GET BACK TO WORK!",
    "STOP WASTING TIME!",
    "FOCUS RIGHT NOW!",
    "I'M GETTING ANGRY!",
    "DON'T MAKE ME MAD!",
  ],
  demon: [
    "YOU BETRAYED ME!",
    "LOOK AT WHAT YOU'VE DONE!",
    "APOLOGIZE NOW!",
    "I TRUSTED YOU!",
    "YOU WILL REGRET THIS!",
  ],
};

export function useVoice() {
  const { isSoundEnabled, mood } = useGameStore();
  const lastSpokenRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback(
    (text: string, isYelling = false) => {
      if (!isSoundEnabled || !synthRef.current) return;

      const now = Date.now();
      if (now - lastSpokenRef.current < 3000) return;
      lastSpokenRef.current = now;

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = isYelling ? 1.3 : 1.0;
      utterance.pitch = isYelling ? 1.4 : 1.0;
      utterance.volume = isYelling ? 1.0 : 0.8;

      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Male")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      synthRef.current.speak(utterance);
    },
    [isSoundEnabled]
  );

  const shout = useCallback(
    (customMessage?: string) => {
      const messages = SHOUT_MESSAGES[mood];
      const message =
        customMessage || messages[Math.floor(Math.random() * messages.length)];
      const isYelling = mood === "angry" || mood === "demon";
      speak(message, isYelling);
    },
    [mood, speak]
  );

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  return { speak, shout, stopSpeaking };
}
