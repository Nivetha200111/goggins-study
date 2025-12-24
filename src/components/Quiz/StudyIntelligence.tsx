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

// Sample study content for testing
const SAMPLE_TOPICS = {
  javascript: {
    title: "JavaScript Fundamentals",
    text: `JavaScript is a programming language that enables interactive web pages. 
    Variables are containers for storing data values. In JavaScript, you can declare variables using var, let, or const.
    Functions are blocks of code designed to perform a particular task. A function is defined with the function keyword.
    Arrays are used to store multiple values in a single variable. An array is a special variable which can hold more than one value.
    Objects are collections of properties. A property is an association between a name and a value.
    The DOM (Document Object Model) is a programming interface for HTML documents. It represents the page so that programs can change the document structure, style, and content.
    Event handling allows JavaScript to register different event handlers on elements in an HTML page.
    Promises are used to handle asynchronous operations in JavaScript. A Promise is an object representing the eventual completion or failure of an asynchronous operation.
    Async/await is syntactic sugar for Promises, making asynchronous code easier to write and read.`,
  },
  react: {
    title: "React Framework",
    text: `React is a JavaScript library for building user interfaces. It was developed by Facebook and is maintained by Meta.
    Components are the building blocks of React applications. A component is a self-contained piece of code that renders some output.
    JSX is a syntax extension for JavaScript that looks similar to HTML. It allows you to write HTML-like code in your JavaScript files.
    State is data that changes over time in a React component. When state changes, the component re-renders.
    Props are inputs to React components. They are passed from parent to child components.
    Hooks are functions that let you use state and other React features in functional components. useState and useEffect are the most common hooks.
    Virtual DOM is a lightweight copy of the actual DOM. React uses it to optimize rendering performance.
    React Router is a library for handling navigation in React applications.`,
  },
  python: {
    title: "Python Programming",
    text: `Python is a high-level, interpreted programming language known for its simplicity and readability.
    Variables in Python don't need explicit declaration. Python uses dynamic typing.
    Functions are defined using the def keyword. Python supports both positional and keyword arguments.
    Lists are ordered, mutable collections. They can contain items of different types.
    Dictionaries are key-value pairs. They are unordered and mutable collections.
    Classes are blueprints for creating objects. Python supports object-oriented programming.
    Modules are files containing Python code that can be imported and used in other programs.
    Exception handling in Python uses try, except, and finally blocks.
    List comprehensions provide a concise way to create lists based on existing lists.`,
  },
};

export function StudyIntelligence() {
  const {
    analyzeContent,
    markAsStudyMaterial,
    isModelLoaded,
    isAnalyzing,
    topicConfidence,
    learningProgress,
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
    learnedConcepts,
    getStudyStats,
  } = useStudyIntelligenceStore();

  const { isSessionActive, activeTabId, mood } = useGameStore();

  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState<string | null>(null);
  const [currentRelevance, setCurrentRelevance] = useState<number | null>(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testTopic, setTestTopic] = useState<keyof typeof SAMPLE_TOPICS>("javascript");

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

  // Test: Feed sample content to train the model
  const handleTestLearn = useCallback(async () => {
    const sample = SAMPLE_TOPICS[testTopic];
    
    await markAsStudyMaterial({
      url: `https://test.com/${testTopic}`,
      title: sample.title,
      text: sample.text,
    });

    setShowIndicator(true);
    setCurrentRelevance(1.0);
    setTimeout(() => setShowIndicator(false), 2000);
  }, [testTopic, markAsStudyMaterial]);

  // Test: Analyze a sample page
  const handleTestAnalyze = useCallback(async () => {
    const topics = Object.keys(SAMPLE_TOPICS) as (keyof typeof SAMPLE_TOPICS)[];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const sample = SAMPLE_TOPICS[randomTopic];

    const result = await analyzeContent({
      url: `https://test.com/${randomTopic}-${Date.now()}`,
      title: sample.title,
      text: sample.text,
    });

    setCurrentRelevance(result.relevanceScore);
    setShowIndicator(true);
    setTimeout(() => setShowIndicator(false), 3000);
  }, [analyzeContent]);

  // Test: Trigger a quiz
  const handleTestQuiz = useCallback(() => {
    generateQuestionsFromContent();
    setTimeout(() => {
      triggerDistractionQuiz();
    }, 500);
  }, [generateQuestionsFromContent, triggerDistractionQuiz]);

  if (!isSessionActive) return null;

  const stats = getStudyStats();

  const hasLearned = topicCentroid !== null && topicConfidence > 0.2;
  const contentCount = studiedContent.length;

  return (
    <>
      <QuizPopup />

      {/* Test Panel Toggle Button */}
      <button 
        className="test-toggle"
        onClick={() => setShowTestPanel(!showTestPanel)}
        title="Test Learning Companion"
      >
        🧪
      </button>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="test-panel">
          <div className="test-header">
            <span>🧪 Learning Companion Test</span>
            <button className="test-close" onClick={() => setShowTestPanel(false)}>×</button>
          </div>
          
          <div className="test-section">
            <div className="test-label">Model Status</div>
            <div className="test-status">
              <span className={isModelLoaded ? "good" : "loading"}>
                {isModelLoaded ? "✓ AI Ready" : "⏳ Loading..."}
              </span>
              <span>Progress: {learningProgress ?? 0}%</span>
            </div>
          </div>

          <div className="test-section">
            <div className="test-label">1. Train on a Topic</div>
            <div className="test-row">
              <select 
                value={testTopic} 
                onChange={(e) => setTestTopic(e.target.value as keyof typeof SAMPLE_TOPICS)}
                className="test-select"
              >
                <option value="javascript">JavaScript</option>
                <option value="react">React</option>
                <option value="python">Python</option>
              </select>
              <button className="test-btn primary" onClick={handleTestLearn} disabled={!isModelLoaded}>
                📚 Learn This
              </button>
            </div>
          </div>

          <div className="test-section">
            <div className="test-label">2. Test Relevance</div>
            <button className="test-btn" onClick={handleTestAnalyze} disabled={!isModelLoaded}>
              🔍 Analyze Random Page
            </button>
            {currentRelevance !== null && (
              <div className="test-result">
                Relevance: <strong style={{ color: currentRelevance > 0.6 ? "#22c55e" : currentRelevance > 0.4 ? "#f59e0b" : "#ef4444" }}>
                  {(currentRelevance * 100).toFixed(0)}%
                </strong>
              </div>
            )}
          </div>

          <div className="test-section">
            <div className="test-label">3. Trigger Quiz</div>
            <button 
              className="test-btn" 
              onClick={handleTestQuiz} 
              disabled={studiedContent.length < 1}
            >
              📝 Pop Quiz!
            </button>
            {studiedContent.length < 1 && (
              <div className="test-hint">Learn at least 1 topic first</div>
            )}
          </div>

          <div className="test-section">
            <div className="test-label">Stats</div>
            <div className="test-stats">
              <div>📄 Pages: {stats.totalPages}</div>
              <div>👍 Positive: {stats.positiveFeedback}</div>
              <div>👎 Negative: {stats.negativeFeedback}</div>
              <div>📖 Concepts: {stats.conceptsLearned}</div>
              <div>🎯 Accuracy: {(stats.quizAccuracy * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="test-section">
            <div className="test-label">Concepts Learned</div>
            <div className="concepts-list">
              {learnedConcepts.slice(0, 6).map((c) => (
                <span key={c.id} className="concept-tag">{c.term}</span>
              ))}
              {learnedConcepts.length === 0 && <span className="test-hint">None yet</span>}
            </div>
          </div>
        </div>
      )}

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

        /* Test Panel Styles */
        .test-toggle {
          position: fixed;
          left: 18px;
          bottom: 80px;
          width: 44px;
          height: 44px;
          background: rgba(16, 9, 10, 0.95);
          border: 1px solid rgba(139, 69, 69, 0.3);
          border-radius: 12px;
          font-size: 1.3rem;
          cursor: pointer;
          z-index: 9997;
          transition: all 0.2s;
        }

        .test-toggle:hover {
          background: rgba(30, 15, 18, 0.98);
          border-color: rgba(220, 38, 38, 0.5);
          transform: scale(1.05);
        }

        .test-panel {
          position: fixed;
          left: 18px;
          bottom: 140px;
          width: 320px;
          max-height: 70vh;
          overflow-y: auto;
          background: rgba(16, 9, 10, 0.98);
          border: 1px solid rgba(139, 69, 69, 0.3);
          border-radius: 16px;
          padding: 16px;
          z-index: 9998;
          font-size: 0.85rem;
          color: #f7e7d6;
          backdrop-filter: blur(10px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(139, 69, 69, 0.2);
          font-weight: 700;
          font-size: 1rem;
        }

        .test-close {
          background: none;
          border: none;
          color: rgba(247, 231, 214, 0.6);
          font-size: 1.4rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .test-close:hover {
          color: #f7e7d6;
        }

        .test-section {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(139, 69, 69, 0.1);
        }

        .test-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .test-label {
          font-size: 0.75rem;
          color: rgba(247, 231, 214, 0.5);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .test-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .test-status .good {
          color: #22c55e;
        }

        .test-status .loading {
          color: #f59e0b;
        }

        .test-row {
          display: flex;
          gap: 8px;
        }

        .test-select {
          flex: 1;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(139, 69, 69, 0.3);
          border-radius: 8px;
          color: #f7e7d6;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .test-select:focus {
          outline: none;
          border-color: rgba(220, 38, 38, 0.5);
        }

        .test-btn {
          padding: 8px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(139, 69, 69, 0.3);
          border-radius: 8px;
          color: #f7e7d6;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .test-btn:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.2);
          border-color: rgba(220, 38, 38, 0.5);
        }

        .test-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .test-btn.primary {
          background: rgba(220, 38, 38, 0.2);
          border-color: rgba(220, 38, 38, 0.4);
        }

        .test-result {
          margin-top: 8px;
          font-size: 0.85rem;
        }

        .test-hint {
          font-size: 0.75rem;
          color: rgba(247, 231, 214, 0.4);
          margin-top: 6px;
        }

        .test-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          font-size: 0.8rem;
        }

        .test-stats div {
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .concepts-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .concept-tag {
          padding: 4px 10px;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 999px;
          font-size: 0.75rem;
          color: #f87171;
        }
      `}</style>
    </>
  );
}

