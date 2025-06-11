// === SHARED DATA STRUCTURES ===

/**
 * Represents a subject in the application.
 */
export interface Subject {
  id: string;
  name: string;
  createdAt: string; // ISO string
}

/**
 * Represents a note stored in the application.
 */
export interface StoredNote {
  id: string;
  subjectId: string;
  content: string; // Markdown content
  sourceName?: string; // Original source filename or "Pasted Text"
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Represents a quiz stored in the application.
 * Flashcards are directly embedded.
 */
export interface StoredQuiz {
  id: string;
  subjectId: string;
  name: string; // User-defined name for the quiz
  flashcards: Flashcard[]; // Imported from generate-quiz flow
  courseMaterialExtract: string; // A small extract or name of material used
  quizLengthUsed: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Represents a stored attempt for an exam or a quiz.
 * This structure is used for analytics and history.
 */
export interface StoredAttempt {
  id: string; // Unique ID for this attempt
  subjectId: string;
  subjectName: string; // Denormalized for easier display
  name: string; // User-defined name for this exam/quiz attempt
  type: 'Exam' | 'Quiz'; // Differentiates between exam and quiz
  date: string; // 'YYYY-MM-DD'
  examQuestions: ExamQuestion[]; // Specific to exams, might be empty for quizzes. Imported from generate-exam-and-analyze flow
  examResults: ExamResult[]; // Specific to exams, might be empty for quizzes. Imported from generate-exam-and-analyze flow
  overallScore: number;
  topicsToReview: string[]; // Specific to exams, might be empty for quizzes
  extraReadings?: Article[]; // Optional, can be populated for exams or quizzes. Imported from search-articles service
}


// === ANALYTICS DATA STRUCTURES ===

/**
 * Represents a score on a specific date for analytics charts.
 */
export interface DatedScore {
  date: string; // 'YYYY-MM-DD'
  score: number; // Percentage
  name: string; // Exam name or Quiz name
  type: 'Quiz' | 'Exam';
}

/**
 * Represents performance on a specific topic for analytics.
 */
export interface TopicPerformance {
  topic: string;
  accuracy: number; // Percentage
  correct: number;
  total: number;
}

/**
 * Represents an item in the quiz score distribution chart.
 */
export interface QuizScoreDistributionItem {
    name: string; // e.g., "0-59%", "60-69%", "70-79%", "80-89%", "90-100%"
    count: number; // Number of quizzes in this score range
}

/**
 * Comprehensive summary of analytics data for a subject or overall.
 */
export interface AnalyticsSummary {
  overallAverageScore: number;
  quizzesTaken: number;
  examsTaken: number;
  lastActivityDate: string | null;
  overallScoreProgress: DatedScore[];
  topicPerformance: TopicPerformance[];
  areasForImprovement: TopicPerformance[];
  quizScoreDistribution: QuizScoreDistributionItem[];
}


// === AI FLOW & SERVICE TYPE RE-EXPORTS ===
// This section makes types defined in AI flows or services easily accessible throughout the app.

// From '@/ai/flows/generate-quiz'
export type { Flashcard, GenerateQuizInput, GenerateQuizOutput } from '@/ai/flows/generate-quiz';

// From '@/ai/flows/generate-exam-and-analyze'
export type {
    ExamQuestion,
    ExamResult,
    GenerateExamAndAnalyzeOutput,
    GenerateExamAndAnalyzeInput as GenerateExamAndAnalyzeInputFlow
} from '@/ai/flows/generate-exam-and-analyze';

// From '@/services/search-articles'
export type { Article } from '@/services/search-articles';

// From '@/ai/flows/explain-term-flow'
export type { ExplainTermInput, ExplainTermOutput } from '@/ai/flows/explain-term-flow';

// From '@/ai/flows/generate-extra-readings'
export type { GenerateExtraReadingsInput, GenerateExtraReadingsOutput } from '@/ai/flows/generate-extra-readings';

// From '@/ai/flows/extract-text-from-pdf-flow'
export type { ExtractTextFromPdfInput, ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';

// From '@/ai/flows/generate-dynamic-notes'
// Note: GenerateDynamicNotesOutput is typically just { notes: string }, if it's more complex, it should be defined in the flow and exported here.
export type { GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
