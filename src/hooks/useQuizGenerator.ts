"use client";

import { useCallback, useRef } from "react";
import { useStudyIntelligenceStore } from "@/store/studyIntelligenceStore";
import { useGameStore } from "@/store/gameStore";
import { useVoice } from "@/hooks/useVoice";

// Quiz generation patterns for different question types
const QUESTION_PATTERNS = {
  definition: {
    templates: [
      "What is {term}?",
      "How would you define {term}?",
      "What does {term} refer to?",
    ],
    extractors: [
      /(?:^|\. )([A-Z][a-z]+(?:\s+[a-z]+)*) (?:is|are|refers to|means) ([^.]+)/g,
      /(?:^|\. )([A-Z][a-z]+(?:\s+[a-z]+)*) (?:is defined as|can be defined as) ([^.]+)/g,
    ],
  },
  process: {
    templates: [
      "What happens during {process}?",
      "What is the purpose of {process}?",
      "How does {process} work?",
    ],
    extractors: [
      /(?:the process of|during|when) ([a-z]+(?:ing|tion|ment)) ([^.]+)/gi,
    ],
  },
  comparison: {
    templates: [
      "What is the difference between {termA} and {termB}?",
      "How does {termA} compare to {termB}?",
    ],
    extractors: [
      /([A-Za-z]+) (?:is|are) (?:different from|unlike|compared to|vs\.?) ([A-Za-z]+)/g,
    ],
  },
  factual: {
    templates: [
      "According to what you studied, {fact}",
      "What is true about {topic}?",
      "Which statement about {topic} is correct?",
    ],
    extractors: [
      /([A-Z][^.]+) (?:contains?|has|have|includes?|consists? of) ([^.]+)/g,
    ],
  },
};

// Generate wrong answers that are plausible
function generateDistractors(
  correctAnswer: string,
  context: string,
  count: number = 3
): string[] {
  const words = context.split(/\s+/).filter((w) => w.length > 4);
  const distractors: string[] = [];

  // Strategy 1: Replace key nouns
  const correctWords = correctAnswer.split(/\s+/);
  for (let i = 0; i < count && i < words.length; i++) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    if (!correctAnswer.toLowerCase().includes(randomWord.toLowerCase())) {
      // Replace a word in the correct answer
      const modifiedAnswer = correctWords
        .map((w, idx) =>
          idx === Math.floor(Math.random() * correctWords.length) && w.length > 3
            ? randomWord
            : w
        )
        .join(" ");
      if (modifiedAnswer !== correctAnswer) {
        distractors.push(modifiedAnswer);
      }
    }
  }

  // Strategy 2: Negate or modify
  if (distractors.length < count) {
    const negations = [
      `Not ${correctAnswer.toLowerCase()}`,
      `The opposite of ${correctAnswer.toLowerCase()}`,
      `None of the above`,
    ];
    distractors.push(...negations.slice(0, count - distractors.length));
  }

  return distractors.slice(0, count);
}

// Extract potential quiz content from text
function extractQuizContent(
  text: string
): { term: string; definition: string; context: string }[] {
  const results: { term: string; definition: string; context: string }[] = [];

  // Pattern 1: "X is Y" definitions
  const isPattern = /([A-Z][a-z]+(?:\s+[a-z]+){0,3}) (?:is|are) (?:a |an |the )?([^.]{10,100})\./g;
  let match;
  while ((match = isPattern.exec(text)) !== null) {
    results.push({
      term: match[1].trim(),
      definition: match[2].trim(),
      context: text.slice(
        Math.max(0, match.index - 100),
        Math.min(text.length, match.index + 200)
      ),
    });
  }

  // Pattern 2: Key facts with numbers
  const factPattern = /([A-Z][^.]*\d+[^.]*)\./g;
  while ((match = factPattern.exec(text)) !== null) {
    const sentence = match[1].trim();
    if (sentence.length > 20 && sentence.length < 150) {
      results.push({
        term: sentence.split(/\s+/).slice(0, 3).join(" "),
        definition: sentence,
        context: text.slice(
          Math.max(0, match.index - 100),
          Math.min(text.length, match.index + 200)
        ),
      });
    }
  }

  // Pattern 3: "X refers to Y"
  const refersPattern = /([A-Z][a-z]+(?:\s+[a-z]+){0,2}) refers to ([^.]{10,100})\./g;
  while ((match = refersPattern.exec(text)) !== null) {
    results.push({
      term: match[1].trim(),
      definition: match[2].trim(),
      context: text.slice(
        Math.max(0, match.index - 100),
        Math.min(text.length, match.index + 200)
      ),
    });
  }

  return results;
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useQuizGenerator() {
  const {
    studiedContent,
    addQuizQuestion,
    triggerQuiz,
    answerQuiz,
    dismissQuiz,
    pendingQuiz,
    quizQuestions,
    quizHistory,
  } = useStudyIntelligenceStore();

  const { addDistraction, addXp } = useGameStore();
  const { speak } = useVoice();
  const lastGenerationRef = useRef<number>(0);

  // Generate questions from studied content
  const generateQuestionsFromContent = useCallback(() => {
    const now = Date.now();
    // Don't generate too frequently
    if (now - lastGenerationRef.current < 60000) return;
    lastGenerationRef.current = now;

    // Get recent content
    const recentContent = studiedContent.slice(-10);
    if (recentContent.length === 0) return;

    for (const content of recentContent) {
      const extracted = extractQuizContent(content.text);

      for (const item of extracted.slice(0, 3)) {
        // Check if we already have this question
        const existingQuestion = quizQuestions.find(
          (q) =>
            q.question.includes(item.term) ||
            q.explanation.includes(item.definition.slice(0, 50))
        );
        if (existingQuestion) continue;

        // Generate question
        const questionType = Math.random() > 0.5 ? "definition" : "factual";
        const templates = QUESTION_PATTERNS[questionType].templates;
        const template = templates[Math.floor(Math.random() * templates.length)];

        const question = template
          .replace("{term}", item.term)
          .replace("{topic}", item.term)
          .replace("{fact}", `what is ${item.term.toLowerCase()}?`);

        // Generate options
        const correctAnswer = item.definition;
        const distractors = generateDistractors(
          correctAnswer,
          item.context,
          3
        );
        const allOptions = shuffle([correctAnswer, ...distractors]);
        const correctIndex = allOptions.indexOf(correctAnswer);

        addQuizQuestion({
          question,
          options: allOptions,
          correctIndex,
          explanation: `${item.term} ${item.definition}`,
          sourceContentId: content.id,
          difficulty: item.definition.length > 80 ? "hard" : "medium",
        });
      }
    }
  }, [studiedContent, quizQuestions, addQuizQuestion]);

  // Trigger a quiz when distracted
  const triggerDistractionQuiz = useCallback(() => {
    // Generate questions first if needed
    if (quizQuestions.length < 5) {
      generateQuestionsFromContent();
    }

    const quiz = triggerQuiz();
    if (quiz) {
      speak("Pop quiz! Let's see what you remember.", true);
      return quiz;
    }
    return null;
  }, [quizQuestions.length, generateQuestionsFromContent, triggerQuiz, speak]);

  // Handle quiz answer
  const submitAnswer = useCallback(
    (selectedIndex: number) => {
      if (!pendingQuiz) return;

      const correct = selectedIndex === pendingQuiz.correctIndex;
      answerQuiz(pendingQuiz.id, correct);

      if (correct) {
        speak("Correct! Well done.", false);
        addXp(10);
      } else {
        speak("Wrong! Pay more attention.", true);
        addDistraction();
      }

      return correct;
    },
    [pendingQuiz, answerQuiz, speak, addXp, addDistraction]
  );

  // Get quiz statistics
  const getStats = useCallback(() => {
    const totalAsked = quizHistory.length;
    const totalCorrect = quizHistory.filter((h) => h.correct).length;
    const accuracy = totalAsked > 0 ? (totalCorrect / totalAsked) * 100 : 0;

    // Recent performance (last 10)
    const recent = quizHistory.slice(-10);
    const recentCorrect = recent.filter((h) => h.correct).length;
    const recentAccuracy = recent.length > 0 ? (recentCorrect / recent.length) * 100 : 0;

    return {
      totalAsked,
      totalCorrect,
      accuracy,
      recentAccuracy,
      questionsAvailable: quizQuestions.length,
    };
  }, [quizHistory, quizQuestions]);

  return {
    generateQuestionsFromContent,
    triggerDistractionQuiz,
    submitAnswer,
    dismissQuiz,
    pendingQuiz,
    getStats,
    hasQuestions: quizQuestions.length > 0,
  };
}

