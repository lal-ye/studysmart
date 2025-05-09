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
    // Ensure IDs are strings, as per schema, even if model returns numbers
    result.flashcards.forEach(fc => {
        if (typeof fc.id !== 'string') {
            fc.id = String(fc.id);
        }
    });
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
    const articles = result.articles || [];
    if (articles.length === 1 && articles[0].title === "No Relevant Articles Found") {
        return { articles: [] };
    }
    return { articles: articles.filter(article => article.title !== "No Relevant Articles Found") };
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

// --- Subject Interface ---
export interface Subject {
  id: string;
  name: string;
  createdAt: string; // ISO string
}

// --- Stored Data Structures ---
export interface StoredNote {
  id: string;
  subjectId: string;
  content: string; // Markdown content
  sourceName?: string; // Original source filename or "Pasted Text"
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface StoredQuiz {
  id: string;
  subjectId: string;
  name: string; // User-defined name for the quiz
  flashcards: Flashcard[];
  courseMaterialExtract: string; // A small extract or name of material used
  quizLengthUsed: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Unified attempt structure for both exams and quizzes
export interface StoredAttempt {
  id: string; // Unique ID for this attempt
  subjectId: string;
  subjectName: string; // Denormalized for easier display
  name: string; // User-defined name for this exam/quiz attempt
  type: 'Exam' | 'Quiz'; // Differentiates between exam and quiz
  date: string; // 'YYYY-MM-DD'
  examQuestions: ExamQuestion[]; // Specific to exams, might be empty for quizzes
  examResults: ExamResult[]; // Specific to exams, might be empty for quizzes
  overallScore: number;
  topicsToReview: string[]; // Specific to exams, might be empty for quizzes
  extraReadings?: Article[]; // Optional, can be populated for exams or quizzes
}


// --- Analytics Data Structures ---
export interface DatedScore {
  date: string; // 'YYYY-MM-DD'
  score: number; // Percentage
  name: string; // Exam name or Quiz name
  type: 'Quiz' | 'Exam';
}

export interface TopicPerformance {
  topic: string;
  accuracy: number; // Percentage
  correct: number;
  total: number;
}

export interface QuizScoreDistributionItem {
    name: string; // e.g., "0-59%", "60-69%", "70-79%", "80-89%", "90-100%"
    count: number; // Number of quizzes in this score range
}

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


// --- Analytics Action ---
// This action is a placeholder as analytics data is primarily computed client-side.
// However, it can be expanded if server-side processing becomes necessary.
export async function getAnalyticsDataAction(subjectId?: string): Promise<AnalyticsSummary> {
  console.warn(`getAnalyticsDataAction called for subjectId: ${subjectId}. In this version, actual analytics data is loaded client-side from localStorage.`);
  // In a real backend scenario, you would fetch and process data based on subjectId.
  return {
    overallAverageScore: 0,
    quizzesTaken: 0,
    examsTaken: 0,
    lastActivityDate: null,
    overallScoreProgress: [],
    topicPerformance: [],
    areasForImprovement: [],
    quizScoreDistribution: [],
  };
}

// Export types for frontend usage
export type { Flashcard, ExamQuestion, ExamResult };
export type { ExplainTermInput, ExplainTermOutput };
export type { GenerateExamAndAnalyzeOutput, GenerateExamAndAnalyzeInput as GenerateExamAndAnalyzeInputFlow }; // Export flow's input type
export type { Article };