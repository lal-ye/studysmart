'use server';

import { generateDynamicNotes as generateDynamicNotesFlow, type GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput, type Flashcard } from '@/ai/flows/generate-quiz';
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow, type GenerateExamAndAnalyzeInput, type GenerateExamAndAnalyzeOutput, type ExamQuestion, type ExamResult } from '@/ai/flows/generate-exam-and-analyze';
import { generateExtraReadings as generateExtraReadingsFlow, type GenerateExtraReadingsInput, type GenerateExtraReadingsOutput } from '@/ai/flows/generate-extra-readings';
import { extractTextFromPdf as extractTextFromPdfFlow, type ExtractTextFromPdfInput, type ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';
import { explainTerm as explainTermFlow, type ExplainTermInput, type ExplainTermOutput } from '@/ai/flows/explain-term-flow';
import type { Article } from '@/services/search-articles';

// Interface for the action to accept an optional sourceName
export interface GenerateNotesActionInput {
  material: string;
  sourceName?: string;
}

export async function generateNotesAction(
  input: GenerateNotesActionInput
): Promise<string> {
  try {
    const flowInput: GenerateDynamicNotesInput = {
      material: input.material,
      sourceName: input.sourceName,
    };
    const result = await generateDynamicNotesFlow(flowInput);
    return result.notes;
  } catch (error) {
    console.error('Error in generateNotesAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate notes: ${error.message}. Please try again.`);
    }
    throw new Error('Failed to generate notes due to an unknown error. Please try again.');
  }
}

export async function generateQuizAction(
  input: GenerateQuizInput
): Promise<Flashcard[]> {
  try {
    const result: GenerateQuizOutput = await generateQuiz(input); 

    if (!result.flashcards) { 
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned null/undefined flashcards array.');
        throw new Error("The AI model returned invalid quiz data. Please try again.");
    }
    if (result.flashcards.length === 0 && input.quizLength > 0) { // Only warn if user expected cards
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned an empty set of flashcards when some were expected.');
    }
    return result.flashcards;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuizAction] Error generating quiz:', error);
    if (error instanceof Error) {
      throw new Error(error.message || 'Failed to generate quiz due to an AI model error.'); 
    }
    throw new Error('Failed to generate quiz due to an unknown server error. Please try again.');
  }
}

export interface GenerateAndAnalyzeExamActionInput extends GenerateExamAndAnalyzeInput {}

export async function generateAndAnalyzeExamAction(
  input: GenerateAndAnalyzeExamActionInput
): Promise<GenerateExamAndAnalyzeOutput> {
  try {
    const result = await generateExamAndAnalyzeFlow({ 
      courseMaterial: input.courseMaterial, 
      numberOfQuestions: input.numberOfQuestions || 30, 
      userAnswers: input.userAnswers 
    });
    return result;
  } catch (error) {
    console.error('Error in generateAndAnalyzeExamAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate and analyze exam: ${error.message}. Please try again.`);
    }
    throw new Error('Failed to generate and analyze exam due to an unknown error. Please try again.');
  }
}

export async function getExtraReadingsAction(
  input: GenerateExtraReadingsInput
): Promise<GenerateExtraReadingsOutput> {
   try {
    const result = await generateExtraReadingsFlow(input);
    return result;
  } catch (error)
    {
    console.error('Error in getExtraReadingsAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch extra readings: ${error.message}. Please try again.`);
    }
    throw new Error('Failed to fetch extra readings due to an unknown error. Please try again.');
  }
}

export async function extractTextFromPdfAction(
  input: ExtractTextFromPdfInput
): Promise<ExtractTextFromPdfOutput> {
  try {
    const result = await extractTextFromPdfFlow(input);
    return result;
  } catch (error) {
    console.error('Error in extractTextFromPdfAction:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during PDF processing.';
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}

export async function explainTermAction(input: ExplainTermInput): Promise<ExplainTermOutput> {
  try {
    const result = await explainTermFlow(input);
    return result;
  } catch (error) {
    console.error('Error in explainTermAction:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to explain term: ${error.message}`);
    }
    throw new Error('Failed to explain term due to an unknown error.');
  }
}

// --- Analytics Data Structures ---
export interface DatedScore {
  date: string; // 'YYYY-MM-DD'
  score: number; // Percentage
  name: string;
  type: 'Quiz' | 'Exam';
  results?: ExamResult[];
}

export interface TopicPerformance {
  topic: string;
  accuracy: number; // Percentage
  correct: number;
  total: number;
}

export interface QuizScoreDistributionItem {
    name: string; // Quiz name
    score: number; // Score for this specific quiz
}

export interface AnalyticsSummary {
  overallAverageScore: number;
  quizzesTaken: number;
  examsTaken: number;
  overallScoreProgress: DatedScore[]; // Sorted by date
  topicPerformance: TopicPerformance[]; // Processed from exam results
  areasForImprovement: TopicPerformance[]; // Top N topics with lowest accuracy
  quizScoreDistribution: QuizScoreDistributionItem[]; // For pie chart
}

// --- Analytics Action ---
export async function getAnalyticsDataAction(): Promise<AnalyticsSummary> {
  // In a real application, this data would be fetched from a database
  // For now, we'll use mock historical data and process it.

  // Mock quiz attempts
  const mockQuizAttempts: DatedScore[] = [
    { name: 'Algebra Basics Quiz', score: 80, date: '2024-07-01', type: 'Quiz' },
    { name: 'Calculus Intro Quiz', score: 70, date: '2024-07-08', type: 'Quiz' },
    { name: 'Geometry Fundamentals Quiz', score: 90, date: '2024-07-15', type: 'Quiz' },
  ];

  // Mock exam attempts (GenerateExamAndAnalyzeOutput + date and name)
  interface MockExamAttempt extends GenerateExamAndAnalyzeOutput {
    date: string; // 'YYYY-MM-DD'
    name: string;
  }

  const mockExamAttempts: MockExamAttempt[] = [
    {
      name: 'Midterm Exam - Math',
      date: '2024-07-10',
      exam: [ /* array of ExamQuestion */ 
        { question: 'Algebra Q1', type: 'multiple_choice', options: ['A','B','C','D'], correctAnswer: 'A', topic: 'Algebra'},
        { question: 'Algebra Q2', type: 'short_answer', correctAnswer: 'Solution', topic: 'Algebra'},
        { question: 'Calculus Q1', type: 'true_false', correctAnswer: 'true', topic: 'Calculus'},
        { question: 'Calculus Q2', type: 'multiple_choice', options: ['A','B','C','D'], correctAnswer: 'B', topic: 'Calculus'},
        { question: 'Geometry Q1', type: 'short_answer', correctAnswer: 'Proof', topic: 'Geometry'},
      ],
      results: [
        { question: 'Algebra Q1', type: 'multiple_choice', correctAnswer: 'A', userAnswer: 'A', isCorrect: true, topic: 'Algebra' },
        { question: 'Algebra Q2', type: 'short_answer', correctAnswer: 'Solution', userAnswer: 'Solution', isCorrect: true, topic: 'Algebra' },
        { question: 'Calculus Q1', type: 'true_false', correctAnswer: 'true', userAnswer: 'false', isCorrect: false, topic: 'Calculus' },
        { question: 'Calculus Q2', type: 'multiple_choice', correctAnswer: 'B', userAnswer: 'C', isCorrect: false, topic: 'Calculus' },
        { question: 'Geometry Q1', type: 'short_answer', correctAnswer: 'Proof', userAnswer: 'Incorrect Proof', isCorrect: false, topic: 'Geometry' },
      ],
      topicsToReview: ['Calculus', 'Geometry'],
      extraReadings: [],
    },
    {
      name: 'Final Exam - Math',
      date: '2024-07-25',
      exam: [ /* array of ExamQuestion */ 
        { question: 'Algebra Q3', type: 'multiple_choice', options: ['A','B','C','D'], correctAnswer: 'C', topic: 'Algebra'},
        { question: 'Calculus Q3', type: 'short_answer', correctAnswer: 'Limit definition', topic: 'Calculus'},
        { question: 'Geometry Q2', type: 'true_false', correctAnswer: 'false', topic: 'Geometry'},
        { question: 'Statistics Q1', type: 'multiple_choice', options: ['A','B','C','D'], correctAnswer: 'D', topic: 'Statistics'},
      ],
      results: [
        { question: 'Algebra Q3', type: 'multiple_choice', correctAnswer: 'C', userAnswer: 'C', isCorrect: true, topic: 'Algebra' },
        { question: 'Calculus Q3', type: 'short_answer', correctAnswer: 'Limit definition', userAnswer: 'Limit definition', isCorrect: true, topic: 'Calculus' },
        { question: 'Geometry Q2', type: 'true_false', correctAnswer: 'false', userAnswer: 'false', isCorrect: true, topic: 'Geometry' },
        { question: 'Statistics Q1', type: 'multiple_choice', correctAnswer: 'D', userAnswer: 'A', isCorrect: false, topic: 'Statistics' },
      ],
      topicsToReview: ['Statistics'],
      extraReadings: [],
    },
  ];

  // Process data
  const allScores: DatedScore[] = [
    ...mockQuizAttempts,
    ...mockExamAttempts.map(attempt => {
      const correctCount = attempt.results.filter(r => r.isCorrect).length;
      const totalQuestions = attempt.exam.length;
      return {
        name: attempt.name,
        score: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
        date: attempt.date,
        type: 'Exam' as 'Exam',
          results: attempt.results,
      };
    }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalScoreSum = 0;
  allScores.forEach(s => totalScoreSum += s.score);
  const overallAverageScore = allScores.length > 0 ? totalScoreSum / allScores.length : 0;

  const topicPerformanceMap = new Map<string, { correct: number; total: number }>();
  mockExamAttempts.forEach(attempt => {
    attempt.results.forEach(result => {
      const current = topicPerformanceMap.get(result.topic) || { correct: 0, total: 0 };
      current.total += 1;
      if (result.isCorrect) {
        current.correct += 1;
      }
      topicPerformanceMap.set(result.topic, current);
    });
  });

  const topicPerformance: TopicPerformance[] = Array.from(topicPerformanceMap.entries()).map(([topic, data]) => ({
    topic,
    correct: data.correct,
    total: data.total,
    accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
  })).sort((a,b) => b.accuracy - a.accuracy); // Sort by accuracy desc

  const areasForImprovement = [...topicPerformance]
    .sort((a, b) => a.accuracy - b.accuracy) // Sort by accuracy asc
    .slice(0, 3); // Top 3 lowest

  const quizScoreDistribution: QuizScoreDistributionItem[] = mockQuizAttempts.map(qa => ({
    name: qa.name,
    score: qa.score,
  }));

  return {
    overallAverageScore,
    quizzesTaken: mockQuizAttempts.length,
    examsTaken: mockExamAttempts.length,
    overallScoreProgress: allScores,
    topicPerformance,
    areasForImprovement,
    quizScoreDistribution,
  };
}

// Export types for frontend usage
export type { Flashcard, ExamQuestion, ExamResult };
export type { ExplainTermInput, ExplainTermOutput };
export type { GenerateExamAndAnalyzeOutput, GenerateExamAndAnalyzeInput };
export type { Article };
