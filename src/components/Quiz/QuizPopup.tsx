"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuizGenerator } from "@/hooks/useQuizGenerator";
import { useGameStore } from "@/store/gameStore";

export function QuizPopup() {
  const { pendingQuiz, submitAnswer, dismissQuiz, getStats } = useQuizGenerator();
  const { mood, isSessionActive } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // Reset state when new quiz appears
  useEffect(() => {
    if (pendingQuiz) {
      setSelectedIndex(null);
      setShowResult(false);
      setWasCorrect(false);
      setTimeLeft(30);
    }
  }, [pendingQuiz?.id]);

  // Countdown timer
  useEffect(() => {
    if (!pendingQuiz || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - mark as wrong
          handleSubmit(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingQuiz, showResult]);

  const handleSubmit = useCallback(
    (index: number) => {
      if (showResult) return;

      setSelectedIndex(index);
      const correct = submitAnswer(index);
      setWasCorrect(correct ?? false);
      setShowResult(true);

      // Auto-dismiss after showing result
      setTimeout(() => {
        dismissQuiz();
      }, 3000);
    },
    [showResult, submitAnswer, dismissQuiz]
  );

  if (!pendingQuiz || !isSessionActive) return null;

  const stats = getStats();
  const timerColor =
    timeLeft > 20 ? "#22c55e" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  return (
    <div className="quiz-overlay">
      <div className={`quiz-popup ${mood} ${showResult ? (wasCorrect ? "correct" : "wrong") : ""}`}>
        <div className="quiz-header">
          <div className="quiz-icon">🧠</div>
          <h2>Pop Quiz!</h2>
          <div className="quiz-timer" style={{ color: timerColor }}>
            {timeLeft}s
          </div>
        </div>

        <div className="quiz-question">{pendingQuiz.question}</div>

        <div className="quiz-options">
          {pendingQuiz.options.map((option, index) => (
            <button
              key={index}
              className={`quiz-option ${
                selectedIndex === index ? "selected" : ""
              } ${
                showResult
                  ? index === pendingQuiz.correctIndex
                    ? "correct"
                    : selectedIndex === index
                    ? "wrong"
                    : ""
                  : ""
              }`}
              onClick={() => handleSubmit(index)}
              disabled={showResult}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        {showResult && (
          <div className={`quiz-result ${wasCorrect ? "correct" : "wrong"}`}>
            <div className="result-icon">{wasCorrect ? "✓" : "✗"}</div>
            <div className="result-text">
              {wasCorrect ? "Correct! +10 XP" : "Wrong!"}
            </div>
            {!wasCorrect && (
              <div className="result-explanation">
                <strong>Answer:</strong> {pendingQuiz.options[pendingQuiz.correctIndex]}
              </div>
            )}
          </div>
        )}

        <div className="quiz-footer">
          <div className="quiz-stats">
            <span>Accuracy: {stats.accuracy.toFixed(0)}%</span>
            <span>•</span>
            <span>
              {stats.totalCorrect}/{stats.totalAsked} correct
            </span>
          </div>
          {!showResult && (
            <button className="quiz-skip" onClick={() => handleSubmit(-1)}>
              Skip
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .quiz-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .quiz-popup {
          background: linear-gradient(135deg, #1a0f10 0%, #0d0608 100%);
          border: 2px solid rgba(139, 69, 69, 0.4);
          border-radius: 20px;
          padding: 28px;
          max-width: 520px;
          width: 90%;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(220, 38, 38, 0.15);
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .quiz-popup.correct {
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(34, 197, 94, 0.2);
        }

        .quiz-popup.wrong {
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(239, 68, 68, 0.2);
          animation: shake 0.5s ease;
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-10px);
          }
          40%,
          80% {
            transform: translateX(10px);
          }
        }

        .quiz-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .quiz-icon {
          font-size: 2rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .quiz-header h2 {
          flex: 1;
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #f7e7d6;
          letter-spacing: -0.02em;
        }

        .quiz-timer {
          font-size: 1.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          min-width: 48px;
          text-align: right;
        }

        .quiz-question {
          font-size: 1.15rem;
          color: #f7e7d6;
          line-height: 1.6;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border-left: 4px solid #dc2626;
        }

        .quiz-options {
          display: grid;
          gap: 12px;
          margin-bottom: 20px;
        }

        .quiz-option {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          background: rgba(30, 20, 22, 0.8);
          border: 2px solid rgba(139, 69, 69, 0.3);
          border-radius: 12px;
          color: #f7e7d6;
          font-size: 1rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quiz-option:hover:not(:disabled) {
          background: rgba(45, 30, 32, 0.9);
          border-color: rgba(220, 38, 38, 0.5);
          transform: translateX(4px);
        }

        .quiz-option.selected {
          border-color: #dc2626;
          background: rgba(220, 38, 38, 0.15);
        }

        .quiz-option.correct {
          border-color: #22c55e !important;
          background: rgba(34, 197, 94, 0.15) !important;
        }

        .quiz-option.wrong {
          border-color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.15) !important;
        }

        .quiz-option:disabled {
          cursor: default;
        }

        .option-letter {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(220, 38, 38, 0.2);
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
          line-height: 1.5;
        }

        .quiz-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          animation: resultIn 0.3s ease;
        }

        @keyframes resultIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .quiz-result.correct {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .quiz-result.wrong {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .result-icon {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .quiz-result.correct .result-icon {
          color: #22c55e;
        }

        .quiz-result.wrong .result-icon {
          color: #ef4444;
        }

        .result-text {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f7e7d6;
        }

        .result-explanation {
          font-size: 0.9rem;
          color: rgba(247, 231, 214, 0.7);
          text-align: center;
          margin-top: 8px;
        }

        .quiz-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid rgba(139, 69, 69, 0.2);
        }

        .quiz-stats {
          display: flex;
          gap: 8px;
          font-size: 0.85rem;
          color: rgba(247, 231, 214, 0.6);
        }

        .quiz-skip {
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(247, 231, 214, 0.8);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quiz-skip:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}

