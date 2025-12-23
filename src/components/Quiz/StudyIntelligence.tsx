"use client";

import { useEffect, useCallback, useState } from "react";
import { useContentAnalyzer } from "@/hooks/useContentAnalyzer";
import { useQuizGenerator } from "@/hooks/useQuizGenerator";
import { useStudyIntelligenceStore } from "@/store/studyIntelligenceStore";
import { useGameStore } from "@/store/gameStore";
import { QuizPopup } from "./QuizPopup";

// Listen for page content from extension
interface PageMessage {
  type: string;
  url?: string;
  title?: string;
  text?: string;
  html?: string;
}

export function StudyIntelligence() {
  const {
    analyzeContent,
    markAsStudyMaterial,
    isModelLoaded,
    isAnalyzing,
    topicConfidence,
  } = useContentAnalyzer();

  const {
    generateQuestionsFromContent,
    triggerDistractionQuiz,
    pendingQuiz,
  } = useQuizGenerator();

  const {
    topicCentroid,
    studiedContent,
    currentSession,
    relevanceScores,
    startStudySession,
    endStudySession,
  } = useStudyIntelligenceStore();

  const { isSessionActive, activeTabId, mood } = useGameStore();

  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);
  const [currentRelevance, setCurrentRelevance] = useState<number | null>(null);
  const [showIndicator, setShowIndicator] = useState(false);

  // Start/end study session with main session
  useEffect(() => {
    if (isSessionActive && activeTabId) {
      startStudySession(activeTabId);
    } else {
      endStudySession();
    }
  }, [isSessionActive, activeTabId, startStudySession, endStudySession]);

  // Generate questions periodically
  useEffect(() => {
    if (!isSessionActive || studiedContent.length < 2) return;

    const interval = setInterval(() => {
      generateQuestionsFromContent();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isSessionActive, studiedContent.length, generateQuestionsFromContent]);

  // Trigger quiz on distraction (mood change)
  useEffect(() => {
    if (mood === "suspicious" || mood === "angry") {
      // Small delay before quiz
      const timeout = setTimeout(() => {
        triggerDistractionQuiz();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [mood, triggerDistractionQuiz]);

  // Listen for messages from extension
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window) return;
      
      const message = event.data as PageMessage;
      if (message.type !== "FOCUS_PAGE_CONTENT") return;

      if (!message.url || message.url === lastAnalyzedUrl) return;
      if (!isSessionActive || !isModelLoaded) return;

      setLastAnalyzedUrl(message.url);

      try {
        const result = await analyzeContent({
          url: message.url,
          title: message.title || "",
          text: message.text || "",
          html: message.html,
        });

        setCurrentRelevance(result.relevanceScore);
        setShowIndicator(true);

        // Hide indicator after a few seconds
        setTimeout(() => setShowIndicator(false), 3000);
      } catch (err) {
        console.error("Analysis failed:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [lastAnalyzedUrl, isSessionActive, isModelLoaded, analyzeContent]);

  // Handle manual "This is study material" action
  const handleMarkAsStudy = useCallback(async () => {
    if (!lastAnalyzedUrl) return;

    await markAsStudyMaterial({
      url: lastAnalyzedUrl,
      title: document.title,
      text: document.body.innerText.slice(0, 5000),
    });

    setCurrentRelevance(1.0);
  }, [lastAnalyzedUrl, markAsStudyMaterial]);

  if (!isSessionActive) return null;

  const hasLearned = topicCentroid !== null && topicConfidence > 0.2;
  const contentCount = studiedContent.length;

  return (
    <>
      <QuizPopup />

      {/* Study Intelligence Indicator */}
      <div className={`study-intel ${showIndicator ? "visible" : ""}`}>
        <div className="intel-header">
          <span className="intel-icon">🧠</span>
          <span className="intel-title">Study AI</span>
          {isAnalyzing && <span className="intel-loading">Analyzing...</span>}
        </div>

        {!hasLearned ? (
          <div className="intel-learning">
            <div className="learning-text">
              Learning your topic... ({contentCount}/3 pages)
            </div>
            <div className="learning-bar">
              <div
                className="learning-progress"
                style={{ width: `${Math.min(100, (contentCount / 3) * 100)}%` }}
              />
            </div>
            <button className="mark-study-btn" onClick={handleMarkAsStudy}>
              ✓ This is study material
            </button>
          </div>
        ) : (
          <div className="intel-status">
            <div className="relevance-row">
              <span>Relevance:</span>
              <div className="relevance-bar">
                <div
                  className="relevance-fill"
                  style={{
                    width: `${(currentRelevance ?? 0.5) * 100}%`,
                    background:
                      (currentRelevance ?? 0.5) > 0.6
                        ? "#22c55e"
                        : (currentRelevance ?? 0.5) > 0.4
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
              <span className="relevance-value">
                {((currentRelevance ?? 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="confidence-row">
              <span>Topic confidence: {(topicConfidence * 100).toFixed(0)}%</span>
              <span>•</span>
              <span>{contentCount} pages learned</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .study-intel {
          position: fixed;
          left: 18px;
          bottom: 18px;
          width: 280px;
          background: rgba(16, 9, 10, 0.95);
          border: 1px solid rgba(139, 69, 69, 0.25);
          border-radius: 14px;
          padding: 14px;
          z-index: 9998;
          font-size: 0.8rem;
          color: #f7e7d6;
          backdrop-filter: blur(6px);
          transform: translateY(120%);
          opacity: 0;
          transition: all 0.3s ease;
        }

        .study-intel.visible {
          transform: translateY(0);
          opacity: 1;
        }

        .intel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(139, 69, 69, 0.2);
        }

        .intel-icon {
          font-size: 1.2rem;
        }

        .intel-title {
          font-weight: 700;
          flex: 1;
        }

        .intel-loading {
          font-size: 0.7rem;
          color: #f59e0b;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .intel-learning {
          display: grid;
          gap: 10px;
        }

        .learning-text {
          color: rgba(247, 231, 214, 0.8);
        }

        .learning-bar {
          height: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
          overflow: hidden;
        }

        .learning-progress {
          height: 100%;
          background: linear-gradient(90deg, #dc2626, #f97316);
          transition: width 0.3s ease;
        }

        .mark-study-btn {
          padding: 8px 12px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          color: #22c55e;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mark-study-btn:hover {
          background: rgba(34, 197, 94, 0.3);
        }

        .intel-status {
          display: grid;
          gap: 10px;
        }

        .relevance-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .relevance-bar {
          flex: 1;
          height: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .relevance-fill {
          height: 100%;
          transition: all 0.3s ease;
          border-radius: 4px;
        }

        .relevance-value {
          font-weight: 700;
          min-width: 36px;
          text-align: right;
        }

        .confidence-row {
          display: flex;
          gap: 8px;
          font-size: 0.7rem;
          color: rgba(247, 231, 214, 0.6);
        }
      `}</style>
    </>
  );
}

