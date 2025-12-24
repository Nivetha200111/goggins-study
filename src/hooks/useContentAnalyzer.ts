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

// Extract key concepts from text using simple NLP heuristics
function extractConcepts(text: string): { term: string; definition: string }[] {
  const concepts: { term: string; definition: string }[] = [];
  
  // Pattern matching for definitions
  const definitionPatterns = [
    /(?:^|\. )([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s+(?:is|are|refers to|means|defined as)\s+([^.]+)/gi,
    /(?:^|\. )(?:The\s+)?([A-Z][a-z]+(?:\s+[a-z]+)*)\s*[:]\s*([^.]+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s*\(([^)]+)\)/gi,
  ];

  for (const pattern of definitionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      // Filter out noise
      if (term.length > 2 && term.length < 50 && definition.length > 10 && definition.length < 200) {
        // Check if not already added
        if (!concepts.find((c) => c.term.toLowerCase() === term.toLowerCase())) {
          concepts.push({ term, definition });
        }
      }
    }
  }

  // Also extract capitalized terms that appear frequently
  const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
  const wordFreq = new Map<string, number>();
  
  for (const word of words) {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Add frequent terms without definitions yet
  for (const [word, freq] of wordFreq) {
    if (freq >= 3 && !concepts.find((c) => c.term.toLowerCase() === word.toLowerCase())) {
      concepts.push({ term: word, definition: `Key concept mentioned ${freq} times` });
    }
  }

  return concepts.slice(0, 10); // Limit to 10 concepts per page
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
    addFeedback,
    addConcept,
    computeRelevance,
    learningProgress,
    positiveExamples,
    negativeExamples,
  } = useStudyIntelligenceStore();

  const { isSessionActive, activeTabId } = useGameStore();
  const modelRef = useRef<UseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);

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

  // Analyze page content with enhanced learning
  const analyzeContent = useCallback(
    async (content: PageContent): Promise<AnalysisResult> => {
      setAnalyzing(true);
      setError(null);
      setLastAnalyzedUrl(content.url);

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

        // Use enhanced relevance computation with positive/negative examples
        let relevanceScore = 0.5;
        if (positiveExamples.length > 0 || (topicCentroid && topicConfidence > 0.15)) {
          relevanceScore = computeRelevance(embedding);
        }

        const isRelevant = relevanceScore >= relevanceThreshold;
        const keySentences = extractKeySentences(text);
        
        // Extract and store concepts
        const concepts = extractConcepts(text);
        for (const concept of concepts) {
          addConcept(concept.term, concept.definition);
        }

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
            concepts: concepts.map((c) => c.term),
          });

          // Update topic model with positive example
          updateTopicModel(embedding, true);
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
      positiveExamples,
      relevanceThreshold,
      isSessionActive,
      activeTabId,
      computeEmbedding,
      computeRelevance,
      setAnalyzing,
      setRelevanceScore,
      addStudiedContent,
      updateTopicModel,
      addConcept,
    ]
  );

  // Mark current page as study material (positive user feedback)
  const markAsStudyMaterial = useCallback(
    async (content: PageContent) => {
      if (!activeTabId) return;

      setAnalyzing(true);
      try {
        const text =
          content.text ||
          (content.html ? extractTextFromHtml(content.html) : "");
        const embedding = await computeEmbedding(text);

        // Add positive feedback
        addFeedback(content.url, true, embedding);

        // Extract and store concepts
        const concepts = extractConcepts(text);
        for (const concept of concepts) {
          addConcept(concept.term, concept.definition);
        }

        // Add to studied content
        addStudiedContent({
          url: content.url,
          title: content.title,
          text: text.slice(0, 2000),
          embedding,
          tabId: activeTabId,
          concepts: concepts.map((c) => c.term),
        });

        // Strongly update topic model with positive example
        updateTopicModel(embedding, true);

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
      addFeedback,
      addConcept,
    ]
  );

  // Mark as distraction (negative user feedback)
  const markAsDistraction = useCallback(
    async (content: PageContent) => {
      setAnalyzing(true);
      try {
        const text =
          content.text ||
          (content.html ? extractTextFromHtml(content.html) : "");
        
        let embedding: number[] | undefined;
        try {
          embedding = await computeEmbedding(text);
        } catch {
          // If embedding fails, still record feedback
        }

        // Add negative feedback
        addFeedback(content.url, false, embedding);

        // Update topic model with negative signal
        if (embedding) {
          updateTopicModel(embedding, false);
        }

        // Set low relevance
        setRelevanceScore(content.url, 0);
      } finally {
        setAnalyzing(false);
      }
    },
    [computeEmbedding, addFeedback, updateTopicModel, setRelevanceScore, setAnalyzing]
  );

  // Quick feedback without full analysis
  const quickFeedback = useCallback(
    (url: string, isPositive: boolean) => {
      setRelevanceScore(url, isPositive ? 1.0 : 0);
    },
    [setRelevanceScore]
  );

  return {
    analyzeContent,
    markAsStudyMaterial,
    markAsDistraction,
    quickFeedback,
    computeEmbedding,
    isModelLoaded,
    isAnalyzing,
    error,
    topicConfidence,
    learningProgress,
    lastAnalyzedUrl,
  };
}

