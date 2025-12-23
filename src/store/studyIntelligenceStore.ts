"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StudyContent {
  id: string;
  url: string;
  title: string;
  text: string;
  embedding?: number[];
  timestamp: number;
  tabId: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceContentId: string;
  difficulty: "easy" | "medium" | "hard";
  asked: number;
  correct: number;
}

export interface StudySession {
  contentIds: string[];
  startTime: number;
  endTime?: number;
  topicEmbedding?: number[];
}

interface StudyIntelligenceState {
  // Content storage
  studiedContent: StudyContent[];
  currentSession: StudySession | null;
  
  // Topic model
  topicCentroid: number[] | null;
  topicConfidence: number;
  
  // Quiz state
  quizQuestions: QuizQuestion[];
  pendingQuiz: QuizQuestion | null;
  quizHistory: { questionId: string; correct: boolean; timestamp: number }[];
  
  // Relevance tracking
  relevanceScores: { url: string; score: number; timestamp: number }[];
  
  // Model state
  isModelLoaded: boolean;
  isAnalyzing: boolean;
  
  // Settings
  relevanceThreshold: number;
  quizFrequency: number; // minutes between quizzes
  lastQuizTime: number;
  
  // Actions
  addStudiedContent: (content: Omit<StudyContent, "id" | "timestamp">) => void;
  updateTopicModel: (embedding: number[]) => void;
  setRelevanceScore: (url: string, score: number) => void;
  addQuizQuestion: (question: Omit<QuizQuestion, "id" | "asked" | "correct">) => void;
  triggerQuiz: () => QuizQuestion | null;
  answerQuiz: (questionId: string, correct: boolean) => void;
  dismissQuiz: () => void;
  startStudySession: (tabId: string) => void;
  endStudySession: () => void;
  setModelLoaded: (loaded: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  clearSession: () => void;
  getRelevanceForUrl: (url: string) => number | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Cosine similarity between two embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Update centroid with new embedding (exponential moving average)
function updateCentroid(
  current: number[] | null,
  newEmbedding: number[],
  alpha: number = 0.3
): number[] {
  if (!current) return [...newEmbedding];
  return current.map((val, i) => val * (1 - alpha) + newEmbedding[i] * alpha);
}

export const useStudyIntelligenceStore = create<StudyIntelligenceState>()(
  persist(
    (set, get) => ({
      studiedContent: [],
      currentSession: null,
      topicCentroid: null,
      topicConfidence: 0,
      quizQuestions: [],
      pendingQuiz: null,
      quizHistory: [],
      relevanceScores: [],
      isModelLoaded: false,
      isAnalyzing: false,
      relevanceThreshold: 0.6,
      quizFrequency: 10, // 10 minutes
      lastQuizTime: 0,

      addStudiedContent: (content) => {
        const newContent: StudyContent = {
          ...content,
          id: generateId(),
          timestamp: Date.now(),
        };

        set((state) => {
          const updatedContent = [...state.studiedContent, newContent];
          // Keep only last 100 items
          if (updatedContent.length > 100) {
            updatedContent.shift();
          }

          const updatedSession = state.currentSession
            ? {
                ...state.currentSession,
                contentIds: [...state.currentSession.contentIds, newContent.id],
              }
            : null;

          return {
            studiedContent: updatedContent,
            currentSession: updatedSession,
          };
        });
      },

      updateTopicModel: (embedding) => {
        set((state) => {
          const newCentroid = updateCentroid(state.topicCentroid, embedding);
          const confidence = state.topicCentroid
            ? Math.min(1, state.topicConfidence + 0.1)
            : 0.1;

          return {
            topicCentroid: newCentroid,
            topicConfidence: confidence,
          };
        });
      },

      setRelevanceScore: (url, score) => {
        set((state) => {
          const filtered = state.relevanceScores.filter((r) => r.url !== url);
          return {
            relevanceScores: [
              ...filtered,
              { url, score, timestamp: Date.now() },
            ].slice(-50), // Keep last 50
          };
        });
      },

      addQuizQuestion: (question) => {
        const newQuestion: QuizQuestion = {
          ...question,
          id: generateId(),
          asked: 0,
          correct: 0,
        };

        set((state) => ({
          quizQuestions: [...state.quizQuestions, newQuestion].slice(-50),
        }));
      },

      triggerQuiz: () => {
        const state = get();
        const now = Date.now();

        // Check if enough time has passed
        if (now - state.lastQuizTime < state.quizFrequency * 60 * 1000) {
          return null;
        }

        // Find a question that hasn't been asked recently
        const availableQuestions = state.quizQuestions.filter((q) => {
          const recentHistory = state.quizHistory
            .filter((h) => h.questionId === q.id)
            .slice(-3);
          return recentHistory.length < 3;
        });

        if (availableQuestions.length === 0) return null;

        // Prioritize questions with lower success rates
        const sortedQuestions = availableQuestions.sort((a, b) => {
          const aRate = a.asked > 0 ? a.correct / a.asked : 0.5;
          const bRate = b.asked > 0 ? b.correct / b.asked : 0.5;
          return aRate - bRate; // Lower success rate = higher priority
        });

        const selectedQuestion = sortedQuestions[0];

        set({
          pendingQuiz: selectedQuestion,
          lastQuizTime: now,
        });

        return selectedQuestion;
      },

      answerQuiz: (questionId, correct) => {
        set((state) => ({
          quizQuestions: state.quizQuestions.map((q) =>
            q.id === questionId
              ? { ...q, asked: q.asked + 1, correct: q.correct + (correct ? 1 : 0) }
              : q
          ),
          quizHistory: [
            ...state.quizHistory,
            { questionId, correct, timestamp: Date.now() },
          ].slice(-100),
          pendingQuiz: null,
        }));
      },

      dismissQuiz: () => {
        set({ pendingQuiz: null });
      },

      startStudySession: (tabId) => {
        set({
          currentSession: {
            contentIds: [],
            startTime: Date.now(),
          },
        });
      },

      endStudySession: () => {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, endTime: Date.now() }
            : null,
        }));
      },

      setModelLoaded: (loaded) => set({ isModelLoaded: loaded }),
      setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

      clearSession: () => {
        set({
          currentSession: null,
          topicCentroid: null,
          topicConfidence: 0,
          studiedContent: [],
          relevanceScores: [],
        });
      },

      getRelevanceForUrl: (url) => {
        const state = get();
        const entry = state.relevanceScores.find((r) => r.url === url);
        return entry?.score ?? null;
      },
    }),
    {
      name: "study-intelligence-storage",
      partialize: (state) => ({
        studiedContent: state.studiedContent.slice(-50),
        topicCentroid: state.topicCentroid,
        topicConfidence: state.topicConfidence,
        quizQuestions: state.quizQuestions,
        quizHistory: state.quizHistory.slice(-50),
        relevanceThreshold: state.relevanceThreshold,
        quizFrequency: state.quizFrequency,
      }),
    }
  )
);

export { cosineSimilarity };

