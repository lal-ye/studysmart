'use server';

// AI Flow function imports
import { generateDynamicNotes as generateDynamicNotesFlow } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz as generateQuizFlow } from '@/ai/flows/generate-quiz'; // Renamed to avoid conflict if GenerateQuizInput/Output were also named generateQuiz
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow } from '@/ai/flows/generate-exam-and-analyze';
import { generateExtraReadings as generateExtraReadingsFlow } from '@/ai/flows/generate-extra-readings';
import { extractTextFromPdf as extractTextFromPdfFlow } from '@/ai/flows/extract-text-from-pdf-flow';
import { explainTerm as explainTermFlow } from '@/ai/flows/explain-term-flow';

// Type imports from the central types file
import type {
  Subject,
  StoredNote,
  StoredQuiz,
  StoredAttempt,
  DatedScore,
  TopicPerformance,
  QuizScoreDistributionItem,
  AnalyticsSummary,
  Flashcard,
  ExamQuestion,
  ExamResult,
  Article,
  GenerateDynamicNotesInput,
  GenerateQuizInput,
  GenerateQuizOutput,
  GenerateExamAndAnalyzeInputFlow, // This was alias for GenerateExamAndAnalyzeInput
  GenerateExamAndAnalyzeOutput,
  GenerateExtraReadingsInput,
  GenerateExtraReadingsOutput,
  ExtractTextFromPdfInput,
  ExtractTextFromPdfOutput,
  ExplainTermInput,
  ExplainTermOutput
} from './types';

// Interface for the action to accept an optional sourceName
export interface GenerateNotesActionInput {
  material: string;
  sourceName?: string;
}

export async function generateNotesAction(
  input: GenerateNotesActionInput
): Promise<string> {
  try {
    // Ensure the input to the flow matches GenerateDynamicNotesInput from types.ts
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
  input: GenerateQuizInput // Uses GenerateQuizInput from types.ts
): Promise<Flashcard[]> { // Uses Flashcard from types.ts
  try {
    const result: GenerateQuizOutput = await generateQuizFlow(input); // Uses GenerateQuizOutput from types.ts

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
// It uses GenerateExamAndAnalyzeInputFlow and ExamQuestion from types.ts
export interface GenerateAndAnalyzeExamActionInput extends Omit<GenerateExamAndAnalyzeInputFlow, 'exam' | 'userAnswers' | 'numberOfQuestions'> {
  courseMaterial: string;
  numberOfQuestions?: number;
  userAnswers?: string[];
  exam?: ExamQuestion[];
}


export async function generateAndAnalyzeExamAction(
  input: GenerateAndAnalyzeExamActionInput
): Promise<GenerateExamAndAnalyzeOutput> { // Uses GenerateExamAndAnalyzeOutput from types.ts
  try {
    // Ensure flowInput matches GenerateExamAndAnalyzeInputFlow from types.ts
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
  input: GenerateExtraReadingsInput // Uses GenerateExtraReadingsInput from types.ts
): Promise<GenerateExtraReadingsOutput> { // Uses GenerateExtraReadingsOutput from types.ts
   try {
    const result = await generateExtraReadingsFlow(input);
    const articles = result.articles || []; // Assumes Article type is consistent via types.ts
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
  input: ExtractTextFromPdfInput // Uses ExtractTextFromPdfInput from types.ts
): Promise<ExtractTextFromPdfOutput> { // Uses ExtractTextFromPdfOutput from types.ts
  try {
    const result = await extractTextFromPdfFlow(input);
    return result;
  } catch (error) {
    console.error('Error in extractTextFromPdfAction:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during PDF processing.';
    throw new Error(`Failed to extract text from PDF: ${message}`);
  }
}

export async function explainTermAction(
  input: ExplainTermInput // Uses ExplainTermInput from types.ts
): Promise<ExplainTermOutput> { // Uses ExplainTermOutput from types.ts
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

// --- Analytics Action ---
// This action is a placeholder as analytics data is primarily computed client-side.
// However, it can be expanded if server-side processing becomes necessary.
// It uses AnalyticsSummary from types.ts
export async function getAnalyticsDataAction(subjectId?: string): Promise<AnalyticsSummary> {
  console.warn(`getAnalyticsDataAction called for subjectId: ${subjectId}. In this version, actual analytics data is loaded client-side from localStorage.`);
  // In a real backend scenario, you would fetch and process data based on subjectId.
  // The return type AnalyticsSummary and its constituents (DatedScore, TopicPerformance etc.) are all from types.ts
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

// No more type exports here, they are handled by src/lib/types.ts