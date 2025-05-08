
'use server';

import { generateDynamicNotes as generateDynamicNotesFlow, type GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput, type Flashcard } from '@/ai/flows/generate-quiz';
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow, type GenerateExamAndAnalyzeInput as GenerateExamAndAnalyzeInputFlow, type GenerateExamAndAnalyzeOutput, type ExamQuestion, type ExamResult } from '@/ai/flows/generate-exam-and-analyze';
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
    if (result.flashcards.length === 0 && input.quizLength > 0) { 
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned an empty set of flashcards when some were expected.');
    }
    return result.flashcards;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuizAction] Error generating quiz:', error);
    if (error instanceof Error && error.message.includes("Generated quiz content is empty")) {
        throw new Error("The AI model returned an empty quiz. Please try again with different material or adjust quiz length.");
    } else if (error instanceof Error) {
      throw new Error(error.message || 'Failed to generate quiz due to an AI model error.'); 
    }
    throw new Error('Failed to generate quiz due to an unknown server error. Please try again.');
  }
}

// Make GenerateAndAnalyzeExamActionInput include the optional 'exam' field
export interface GenerateAndAnalyzeExamActionInput extends Omit<GenerateExamAndAnalyzeInputFlow, 'exam' | 'userAnswers' | 'numberOfQuestions'> {
  courseMaterial: string;
  numberOfQuestions?: number;
  userAnswers?: string[];
  exam?: ExamQuestion[];
}


export async function generateAndAnalyzeExamAction(
  input: GenerateAndAnalyzeExamActionInput
): Promise<GenerateExamAndAnalyzeOutput> {
  try {
    const flowInput: GenerateExamAndAnalyzeInputFlow = {
      courseMaterial: input.courseMaterial,
      numberOfQuestions: input.numberOfQuestions || 30, // Default here if not provided
      userAnswers: input.userAnswers,
      exam: input.exam, // Pass the exam questions if provided
    };
    const result = await generateExamAndAnalyzeFlow(flowInput);
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
    // Ensure articles is always an array, even if the flow returns undefined/null
    return { articles: result.articles || [] };
  } catch (error) {
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
    name: string; 
    score: number; 
}

export interface AnalyticsSummary {
  overallAverageScore: number;
  quizzesTaken: number;
  examsTaken: number;
  overallScoreProgress: DatedScore[]; 
  topicPerformance: TopicPerformance[]; 
  areasForImprovement: TopicPerformance[]; 
  quizScoreDistribution: QuizScoreDistributionItem[]; 
}

// --- Analytics Action ---
export async function getAnalyticsDataAction(): Promise<AnalyticsSummary> {
  const mockQuizAttempts: DatedScore[] = [
    { name: 'Algebra Basics Quiz', score: 80, date: '2024-07-01', type: 'Quiz' },
    { name: 'Calculus Intro Quiz', score: 70, date: '2024-07-08', type: 'Quiz' },
    { name: 'Geometry Fundamentals Quiz', score: 90, date: '2024-07-15', type: 'Quiz' },
     { name: 'Physics Kinematics Quiz', score: 65, date: '2024-07-05', type: 'Quiz' },
    { name: 'Chemistry Stoichiometry Quiz', score: 75, date: '2024-07-12', type: 'Quiz' },
  ];

  interface MockExamAttempt extends GenerateExamAndAnalyzeOutput {
    date: string; 
    name: string;
  }

  const mockExamAttempts: MockExamAttempt[] = [
    {
      name: 'Midterm Exam - Math & Physics',
      date: '2024-07-10',
      exam: [ 
        { question: 'Algebra Q1: Solve for x in 2x+5=11', type: 'multiple_choice', options: ['2','3','4','5'], correctAnswer: '3', topic: 'Algebra'},
        { question: 'Algebra Q2: Factor x^2-9', type: 'short_answer', correctAnswer: '(x-3)(x+3)', topic: 'Algebra'},
        { question: 'Calculus Q1: Is d/dx(sin(x)) = cos(x)?', type: 'true_false', correctAnswer: 'true', topic: 'Calculus'},
        { question: 'Physics Q1: Newtons first law involves inertia.', type: 'true_false', correctAnswer: 'true', topic: 'Physics'},
        { question: 'Physics Q2: Unit of Force?', type: 'multiple_choice', options: ['Joule','Watt','Newton','Pascal'], correctAnswer: 'Newton', topic: 'Physics'},
        { question: 'Geometry Q1: Sum of angles in a triangle is 180 degrees.', type: 'short_answer', correctAnswer: '180 degrees', topic: 'Geometry'},
      ],
      results: [
        { question: 'Algebra Q1: Solve for x in 2x+5=11', type: 'multiple_choice', correctAnswer: '3', userAnswer: '3', isCorrect: true, topic: 'Algebra' },
        { question: 'Algebra Q2: Factor x^2-9', type: 'short_answer', correctAnswer: '(x-3)(x+3)', userAnswer: '(x-3)(x+3)', isCorrect: true, topic: 'Algebra' },
        { question: 'Calculus Q1: Is d/dx(sin(x)) = cos(x)?', type: 'true_false', correctAnswer: 'true', userAnswer: 'false', isCorrect: false, topic: 'Calculus' },
        { question: 'Physics Q1: Newtons first law involves inertia.', type: 'true_false', correctAnswer: 'true', userAnswer: 'true', isCorrect: true, topic: 'Physics'},
        { question: 'Physics Q2: Unit of Force?', type: 'multiple_choice', correctAnswer: 'Newton', userAnswer: 'Watt', isCorrect: false, topic: 'Physics'},
        { question: 'Geometry Q1: Sum of angles in a triangle is 180 degrees.', type: 'short_answer', correctAnswer: '180 degrees', userAnswer: '360 degrees', isCorrect: false, topic: 'Geometry' },
      ],
      topicsToReview: ['Calculus', 'Physics', 'Geometry'],
      extraReadings: [{title: "Calculus Basics", url: "https://example.com/calc-basics"}, {title: "Newton's Laws", url: "https://example.com/newtons-laws"}],
    },
    {
      name: 'Final Exam - Science',
      date: '2024-07-25',
      exam: [ 
        { question: 'Chemistry Q1: What is H2O?', type: 'multiple_choice', options: ['Hydrogen Oxide','Water','Oxygen Hydride','Acid'], correctAnswer: 'Water', topic: 'Chemistry'},
        { question: 'Biology Q1: Mitochondria is the powerhouse of the cell.', type: 'true_false', correctAnswer: 'true', topic: 'Biology'},
        { question: 'Physics Q3: Define velocity.', type: 'short_answer', correctAnswer: 'Rate of change of displacement', topic: 'Physics'},
        { question: 'Statistics Q1: Mean is a measure of central tendency.', type: 'true_false', correctAnswer: 'true', topic: 'Statistics'},
      ],
      results: [
        { question: 'Chemistry Q1: What is H2O?', type: 'multiple_choice', correctAnswer: 'Water', userAnswer: 'Water', isCorrect: true, topic: 'Chemistry' },
        { question: 'Biology Q1: Mitochondria is the powerhouse of the cell.', type: 'true_false', correctAnswer: 'true', userAnswer: 'true', isCorrect: true, topic: 'Biology' },
        { question: 'Physics Q3: Define velocity.', type: 'short_answer', correctAnswer: 'Rate of change of displacement', userAnswer: 'Speed in a direction', isCorrect: true, topic: 'Physics' }, 
        { question: 'Statistics Q1: Mean is a measure of central tendency.', type: 'true_false', correctAnswer: 'true', userAnswer: 'false', isCorrect: false, topic: 'Statistics' },
      ],
      topicsToReview: ['Statistics'],
      extraReadings: [{title: "Intro to Statistics", url: "https://example.com/intro-stats"}],
    },
  ];

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
  })).sort((a,b) => b.accuracy - a.accuracy); 

  const areasForImprovement = [...topicPerformance]
    .filter(topic => topic.accuracy < 100) 
    .sort((a, b) => a.accuracy - b.accuracy) 
    .slice(0, 5); 

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
export type { GenerateExamAndAnalyzeOutput, GenerateExamAndAnalyzeInput as GenerateExamAndAnalyzeInputFlow }; // Export flow's input type
export type { Article };