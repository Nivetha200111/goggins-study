"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  useStudyIntelligenceStore,
  cosineSimilarity,
} from "@/store/studyIntelligenceStore";
import { useGameStore } from "@/store/gameStore";

// TensorFlow.js Universal Sentence Encoder types
interface UseModel {
  embed: (sentences: string[]) => Promise<{ arraySync: () => number[][] }>;
}

const MODEL_URL =
  "https://tfhub.dev/google/tfjs-model/universal-sentence-encoder-lite/1/default/1";

// Singleton model instance
let modelInstance: UseModel | null = null;
let modelLoading: Promise<UseModel> | null = null;

async function loadModel(): Promise<UseModel> {
  if (modelInstance) return modelInstance;
  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    try {
      // Dynamic import to avoid SSR issues
      const use = await import("@tensorflow-models/universal-sentence-encoder");
      const model = await use.load();
      modelInstance = model;
      return model;
    } catch (error) {
      console.error("Failed to load USE model:", error);
      throw error;
    }
  })();

  return modelLoading;
}

// Simple text extraction from HTML
function extractTextFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove scripts, styles, and hidden elements
  const elementsToRemove = doc.querySelectorAll(
    "script, style, noscript, iframe, svg, [hidden], [aria-hidden='true']"
  );
  elementsToRemove.forEach((el) => el.remove());

  // Get main content areas
  const mainContent =
    doc.querySelector("main, article, [role='main'], .content, #content") ||
    doc.body;

  // Extract text
  let text = mainContent?.textContent || "";
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  // Limit length
  return text.slice(0, 5000);
}

// Extract key sentences for quiz generation
function extractKeySentences(text: string, maxSentences: number = 10): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300);

  // Prioritize sentences with key learning indicators
  const learningIndicators = [
    "is defined as",
    "means that",
    "refers to",
    "is a",
    "are used for",
    "consists of",
    "is important because",
    "the main",
    "the key",
    "example",
    "for instance",
    "such as",
    "therefore",
    "because",
    "result",
    "cause",
    "effect",
    "process",
    "method",
    "function",
    "purpose",
  ];

  const scored = sentences.map((sentence) => {
    let score = 0;
    const lower = sentence.toLowerCase();
    for (const indicator of learningIndicators) {
      if (lower.includes(indicator)) score += 1;
    }
    // Bonus for sentences with numbers (often factual)
    if (/\d+/.test(sentence)) score += 0.5;
    return { sentence, score };
  });

  // Sort by score and take top sentences
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map((s) => s.sentence);
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  html?: string;
}

export interface AnalysisResult {
  isRelevant: boolean;
  relevanceScore: number;
  keySentences: string[];
  embedding: number[];
}

export function useContentAnalyzer() {
  const {
    addStudiedContent,
    updateTopicModel,
    setRelevanceScore,
    setModelLoaded,
    setAnalyzing,
    topicCentroid,
    topicConfidence,
    isModelLoaded,
    isAnalyzing,
    relevanceThreshold,
    currentSession,
  } = useStudyIntelligenceStore();

  const { isSessionActive, activeTabId } = useGameStore();
  const modelRef = useRef<UseModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load model on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    loadModel()
      .then((model) => {
        modelRef.current = model;
        setModelLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load AI model");
        console.error(err);
      });
  }, [setModelLoaded]);

  // Compute embedding for text
  const computeEmbedding = useCallback(
    async (text: string): Promise<number[]> => {
      if (!modelRef.current) {
        throw new Error("Model not loaded");
      }

      // Truncate text for embedding
      const truncated = text.slice(0, 1000);
      const embeddings = await modelRef.current.embed([truncated]);
      const embeddingArray = embeddings.arraySync()[0];
      return Array.from(embeddingArray);
    },
    []
  );

  // Analyze page content
  const analyzeContent = useCallback(
    async (content: PageContent): Promise<AnalysisResult> => {
      setAnalyzing(true);
      setError(null);

      try {
        const text =
          content.text ||
          (content.html ? extractTextFromHtml(content.html) : "");

        if (!text || text.length < 50) {
          return {
            isRelevant: false,
            relevanceScore: 0,
            keySentences: [],
            embedding: [],
          };
        }

        // Compute embedding
        const embedding = await computeEmbedding(text);

        // Calculate relevance if we have a topic model
        let relevanceScore = 0.5; // Default neutral
        if (topicCentroid && topicConfidence > 0.2) {
          relevanceScore = cosineSimilarity(embedding, topicCentroid);
          // Adjust score based on confidence
          relevanceScore = 0.5 + (relevanceScore - 0.5) * topicConfidence;
        }

        const isRelevant = relevanceScore >= relevanceThreshold;
        const keySentences = extractKeySentences(text);

        // Store relevance score
        setRelevanceScore(content.url, relevanceScore);

        // If relevant and session active, add to studied content
        if (isRelevant && isSessionActive && activeTabId) {
          addStudiedContent({
            url: content.url,
            title: content.title,
            text: text.slice(0, 2000),
            embedding,
            tabId: activeTabId,
          });

          // Update topic model with this content
          updateTopicModel(embedding);
        }

        return {
          isRelevant,
          relevanceScore,
          keySentences,
          embedding,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [
      topicCentroid,
      topicConfidence,
      relevanceThreshold,
      isSessionActive,
      activeTabId,
      computeEmbedding,
      setAnalyzing,
      setRelevanceScore,
      addStudiedContent,
      updateTopicModel,
    ]
  );

  // Mark current page as study material (user feedback)
  const markAsStudyMaterial = useCallback(
    async (content: PageContent) => {
      if (!activeTabId) return;

      setAnalyzing(true);
      try {
        const text =
          content.text ||
          (content.html ? extractTextFromHtml(content.html) : "");
        const embedding = await computeEmbedding(text);

        // Add to studied content
        addStudiedContent({
          url: content.url,
          title: content.title,
          text: text.slice(0, 2000),
          embedding,
          tabId: activeTabId,
        });

        // Strongly update topic model
        updateTopicModel(embedding);

        // Set high relevance
        setRelevanceScore(content.url, 1.0);
      } finally {
        setAnalyzing(false);
      }
    },
    [
      activeTabId,
      computeEmbedding,
      addStudiedContent,
      updateTopicModel,
      setRelevanceScore,
      setAnalyzing,
    ]
  );

  // Mark as distraction (negative feedback)
  const markAsDistraction = useCallback(
    (url: string) => {
      setRelevanceScore(url, 0);
    },
    [setRelevanceScore]
  );

  return {
    analyzeContent,
    markAsStudyMaterial,
    markAsDistraction,
    computeEmbedding,
    isModelLoaded,
    isAnalyzing,
    error,
    topicConfidence,
  };
}

