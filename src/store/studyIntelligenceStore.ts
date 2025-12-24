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
  isPositive: boolean; // User marked as relevant
  concepts?: string[]; // Extracted key concepts
}

export interface LearnedConcept {
  id: string;
  term: string;
  definition: string;
  frequency: number; // How often seen
  lastSeen: number;
  quizPerformance: number; // 0-1 score
}

export interface TopicCluster {
  id: string;
  name: string;
  centroid: number[];
  examples: string[]; // Content IDs
  confidence: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceContentId: string;
  conceptId?: string;
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

export interface FeedbackEntry {
  url: string;
  isPositive: boolean;
  embedding?: number[];
  timestamp: number;
}

interface StudyIntelligenceState {
  // Content storage
  studiedContent: StudyContent[];
  currentSession: StudySession | null;
  
  // Topic model - enhanced with clusters
  topicCentroid: number[] | null;
  topicConfidence: number;
  topicClusters: TopicCluster[];
  
  // Learned concepts
  learnedConcepts: LearnedConcept[];
  
  // User feedback
  feedbackHistory: FeedbackEntry[];
  positiveExamples: number[][]; // Embeddings of positive examples
  negativeExamples: number[][]; // Embeddings of negative examples
  
  // Quiz state
  quizQuestions: QuizQuestion[];
  pendingQuiz: QuizQuestion | null;
  quizHistory: { questionId: string; correct: boolean; timestamp: number }[];
  
  // Relevance tracking
  relevanceScores: { url: string; score: number; timestamp: number }[];
  
  // Model state
  isModelLoaded: boolean;
  isAnalyzing: boolean;
  learningProgress: number; // 0-100 how much the model has learned
  
  // Settings
  relevanceThreshold: number;
  quizFrequency: number; // minutes between quizzes
  lastQuizTime: number;
  adaptiveLearning: boolean; // Enable adaptive learning rate
  
  // Actions
  addStudiedContent: (content: Omit<StudyContent, "id" | "timestamp" | "isPositive">) => void;
  updateTopicModel: (embedding: number[], isPositive?: boolean) => void;
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
  
  // New enhanced learning actions
  addFeedback: (url: string, isPositive: boolean, embedding?: number[]) => void;
  addConcept: (term: string, definition: string) => void;
  updateConceptFromQuiz: (conceptId: string, correct: boolean) => void;
  computeRelevance: (embedding: number[]) => number;
  getWeakConcepts: () => LearnedConcept[];
  getStudyStats: () => { 
    totalPages: number; 
    positiveFeedback: number; 
    negativeFeedback: number;
    conceptsLearned: number;
    quizAccuracy: number;
  };
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

// Compute adaptive learning rate based on confidence and feedback
function getAdaptiveLearningRate(
  baseRate: number,
  numPositive: number,
  numNegative: number
): number {
  // Start with higher learning rate, decrease as we get more examples
  const totalExamples = numPositive + numNegative;
  if (totalExamples < 3) return 0.5; // Fast learning initially
  if (totalExamples < 10) return 0.3;
  if (totalExamples < 25) return 0.15;
  return baseRate; // Stable learning
}

// Compute relevance using both positive and negative examples
function computeRelevanceScore(
  embedding: number[],
  centroid: number[] | null,
  positiveExamples: number[][],
  negativeExamples: number[][]
): number {
  if (!centroid && positiveExamples.length === 0) return 0.5; // Neutral
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  // Score against centroid
  if (centroid) {
    positiveScore = cosineSimilarity(embedding, centroid);
  }
  
  // Average similarity to positive examples (recent ones weighted more)
  if (positiveExamples.length > 0) {
    const recentPositive = positiveExamples.slice(-10);
    const posScores = recentPositive.map((ex) => cosineSimilarity(embedding, ex));
    const avgPositive = posScores.reduce((a, b) => a + b, 0) / posScores.length;
    positiveScore = centroid 
      ? (positiveScore * 0.6 + avgPositive * 0.4) 
      : avgPositive;
  }
  
  // Penalize similarity to negative examples
  if (negativeExamples.length > 0) {
    const recentNegative = negativeExamples.slice(-10);
    const negScores = recentNegative.map((ex) => cosineSimilarity(embedding, ex));
    negativeScore = Math.max(...negScores);
  }
  
  // Final score: boost positive, penalize negative
  const finalScore = positiveScore - negativeScore * 0.5;
  return Math.max(0, Math.min(1, (finalScore + 1) / 2)); // Normalize to 0-1
}

export const useStudyIntelligenceStore = create<StudyIntelligenceState>()(
  persist(
    (set, get) => ({
      studiedContent: [],
      currentSession: null,
      topicCentroid: null,
      topicConfidence: 0,
      topicClusters: [],
      learnedConcepts: [],
      feedbackHistory: [],
      positiveExamples: [],
      negativeExamples: [],
      quizQuestions: [],
      pendingQuiz: null,
      quizHistory: [],
      relevanceScores: [],
      isModelLoaded: false,
      isAnalyzing: false,
      learningProgress: 0,
      relevanceThreshold: 0.55, // Slightly lower for better recall
      quizFrequency: 10,
      lastQuizTime: 0,
      adaptiveLearning: true,

      addStudiedContent: (content) => {
        const newContent: StudyContent = {
          ...content,
          id: generateId(),
          timestamp: Date.now(),
          isPositive: true, // Default to positive
        };

        set((state) => {
          const updatedContent = [...state.studiedContent, newContent];
          if (updatedContent.length > 100) {
            updatedContent.shift();
          }

          const updatedSession = state.currentSession
            ? {
                ...state.currentSession,
                contentIds: [...state.currentSession.contentIds, newContent.id],
              }
            : null;

          // Track positive example
          const updatedPositive = content.embedding 
            ? [...state.positiveExamples, content.embedding].slice(-20)
            : state.positiveExamples;

          // Calculate learning progress
          const progress = Math.min(100, 
            (updatedPositive.length * 4) + 
            (state.learnedConcepts.length * 2) +
            (state.feedbackHistory.length)
          );

          return {
            studiedContent: updatedContent,
            currentSession: updatedSession,
            positiveExamples: updatedPositive,
            learningProgress: progress,
          };
        });
      },

      updateTopicModel: (embedding, isPositive = true) => {
        set((state) => {
          // Use adaptive learning rate
          const alpha = state.adaptiveLearning
            ? getAdaptiveLearningRate(0.1, state.positiveExamples.length, state.negativeExamples.length)
            : 0.3;

          // Only update centroid with positive examples
          const newCentroid = isPositive
            ? updateCentroid(state.topicCentroid, embedding, alpha)
            : state.topicCentroid;

          // Confidence increases with positive examples, slightly decreases with negative
          const confidenceDelta = isPositive ? 0.08 : -0.02;
          const confidence = state.topicCentroid
            ? Math.max(0, Math.min(1, state.topicConfidence + confidenceDelta))
            : 0.15;

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
          topicClusters: [],
          studiedContent: [],
          relevanceScores: [],
          positiveExamples: [],
          negativeExamples: [],
          feedbackHistory: [],
          learnedConcepts: [],
          learningProgress: 0,
        });
      },

      getRelevanceForUrl: (url) => {
        const state = get();
        const entry = state.relevanceScores.find((r) => r.url === url);
        return entry?.score ?? null;
      },

      // =================== NEW ENHANCED LEARNING ACTIONS ===================

      addFeedback: (url, isPositive, embedding) => {
        set((state) => {
          const newFeedback: FeedbackEntry = {
            url,
            isPositive,
            embedding,
            timestamp: Date.now(),
          };

          // Update positive/negative examples
          const updatedPositive = isPositive && embedding
            ? [...state.positiveExamples, embedding].slice(-20)
            : state.positiveExamples;
          
          const updatedNegative = !isPositive && embedding
            ? [...state.negativeExamples, embedding].slice(-15)
            : state.negativeExamples;

          // Recalculate learning progress
          const progress = Math.min(100, 
            (updatedPositive.length * 4) + 
            (state.learnedConcepts.length * 2) +
            (state.feedbackHistory.length + 1)
          );

          return {
            feedbackHistory: [...state.feedbackHistory, newFeedback].slice(-100),
            positiveExamples: updatedPositive,
            negativeExamples: updatedNegative,
            learningProgress: progress,
          };
        });
      },

      addConcept: (term, definition) => {
        set((state) => {
          // Check if concept already exists
          const existing = state.learnedConcepts.find(
            (c) => c.term.toLowerCase() === term.toLowerCase()
          );

          if (existing) {
            // Update frequency
            return {
              learnedConcepts: state.learnedConcepts.map((c) =>
                c.id === existing.id
                  ? { ...c, frequency: c.frequency + 1, lastSeen: Date.now() }
                  : c
              ),
            };
          }

          // Add new concept
          const newConcept: LearnedConcept = {
            id: generateId(),
            term,
            definition,
            frequency: 1,
            lastSeen: Date.now(),
            quizPerformance: 0.5, // Start neutral
          };

          return {
            learnedConcepts: [...state.learnedConcepts, newConcept].slice(-100),
          };
        });
      },

      updateConceptFromQuiz: (conceptId, correct) => {
        set((state) => ({
          learnedConcepts: state.learnedConcepts.map((c) =>
            c.id === conceptId
              ? {
                  ...c,
                  quizPerformance: c.quizPerformance * 0.8 + (correct ? 0.2 : 0),
                  lastSeen: Date.now(),
                }
              : c
          ),
        }));
      },

      computeRelevance: (embedding) => {
        const state = get();
        return computeRelevanceScore(
          embedding,
          state.topicCentroid,
          state.positiveExamples,
          state.negativeExamples
        );
      },

      getWeakConcepts: () => {
        const state = get();
        // Return concepts with low quiz performance or not seen recently
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        return state.learnedConcepts
          .filter((c) => c.quizPerformance < 0.6 || now - c.lastSeen > oneDay)
          .sort((a, b) => a.quizPerformance - b.quizPerformance)
          .slice(0, 10);
      },

      getStudyStats: () => {
        const state = get();
        const totalQuizzes = state.quizHistory.length;
        const correctQuizzes = state.quizHistory.filter((h) => h.correct).length;

        return {
          totalPages: state.studiedContent.length,
          positiveFeedback: state.positiveExamples.length,
          negativeFeedback: state.negativeExamples.length,
          conceptsLearned: state.learnedConcepts.length,
          quizAccuracy: totalQuizzes > 0 ? correctQuizzes / totalQuizzes : 0,
        };
      },
    }),
    {
      name: "study-intelligence-storage",
      partialize: (state) => ({
        studiedContent: state.studiedContent.slice(-50),
        topicCentroid: state.topicCentroid,
        topicConfidence: state.topicConfidence,
        topicClusters: state.topicClusters,
        learnedConcepts: state.learnedConcepts.slice(-50),
        feedbackHistory: state.feedbackHistory.slice(-50),
        positiveExamples: state.positiveExamples.slice(-15),
        negativeExamples: state.negativeExamples.slice(-10),
        quizQuestions: state.quizQuestions,
        quizHistory: state.quizHistory.slice(-50),
        relevanceThreshold: state.relevanceThreshold,
        quizFrequency: state.quizFrequency,
        learningProgress: state.learningProgress,
        adaptiveLearning: state.adaptiveLearning,
      }),
    }
  )
);

export { cosineSimilarity, computeRelevanceScore };

