
'use server';

import { generateDynamicNotes as generateDynamicNotesFlow, type GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput, type Flashcard } from '@/ai/flows/generate-quiz';
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow, type GenerateExamAndAnalyzeInput, type GenerateExamAndAnalyzeOutput, type ExamQuestion, type ExamResult } from '@/ai/flows/generate-exam-and-analyze';
import { generateExtraReadings as generateExtraReadingsFlow, type GenerateExtraReadingsInput, type GenerateExtraReadingsOutput } from '@/ai/flows/generate-extra-readings';
import { extractTextFromPdf as extractTextFromPdfFlow, type ExtractTextFromPdfInput, type ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';
import { explainTerm as explainTermFlow, type ExplainTermInput, type ExplainTermOutput } from '@/ai/flows/explain-term-flow';

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

    if (!result.flashcards) { // Check if flashcards array is missing or null
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned null/undefined flashcards array.');
        throw new Error("The AI model returned invalid quiz data. Please try again.");
    }
    if (result.flashcards.length === 0) {
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned an empty set of flashcards.');
         // It's better to return empty and let UI decide, or throw specific error if it's always unexpected.
        // For now, returning empty as per previous behavior for "no flashcards generated" toast.
        return [];
    }
    return result.flashcards;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuizAction] Error generating quiz:', error);
    if (error instanceof Error) {
      // Propagate the specific error message from the flow
      throw new Error(error.message || 'Failed to generate quiz due to an AI model error.'); 
    }
    throw new Error('Failed to generate quiz due to an unknown server error. Please try again.');
  }
}

// Updated to accept optional userAnswers
export interface GenerateAndAnalyzeExamActionInput extends GenerateExamAndAnalyzeInput {}

export async function generateAndAnalyzeExamAction(
  input: GenerateAndAnalyzeExamActionInput
): Promise<GenerateExamAndAnalyzeOutput> {
  try {
    // The numberOfQuestions is defaulted to 30 in the flow if not provided.
    // Pass userAnswers if they exist in the input.
    const result = await generateExamAndAnalyzeFlow({ 
      courseMaterial: input.courseMaterial, 
      numberOfQuestions: input.numberOfQuestions || 30, // Explicitly set to 30 if not provided from UI
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
    // Provide a more specific error message if possible
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


// Export types for frontend usage
export type { Flashcard, ExamQuestion, ExamResult };
export type { ExplainTermInput, ExplainTermOutput };
export type { GenerateExamAndAnalyzeOutput, GenerateExamAndAnalyzeInput };
