'use server';

import { generateDynamicNotes as generateDynamicNotesFlow, type GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz, type GenerateQuizInput } from '@/ai/flows/generate-quiz'; // Updated import
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow, type GenerateExamAndAnalyzeInput, type GenerateExamAndAnalyzeOutput } from '@/ai/flows/generate-exam-and-analyze';
import { generateExtraReadings as generateExtraReadingsFlow, type GenerateExtraReadingsInput, type GenerateExtraReadingsOutput } from '@/ai/flows/generate-extra-readings';
import { extractTextFromPdf as extractTextFromPdfFlow, type ExtractTextFromPdfInput, type ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';

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
): Promise<string> {
  try {
    // Call the exported wrapper function `generateQuiz`
    const result = await generateQuiz(input); 

    // Check if the returned quiz string is empty or only whitespace
    if (!result.quiz || result.quiz.trim() === "") {
        console.warn('[StudySmarts Debug - generateQuizAction] AI returned an empty quiz.');
        throw new Error("The AI model returned an empty quiz. Please try again with different material or adjust quiz length.");
    }
    return result.quiz;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuizAction] Error generating quiz:', error);
    if (error instanceof Error) {
      // Propagate the specific error message from the flow or wrapper
      throw new Error(error.message); 
    }
    throw new Error('Failed to generate quiz due to an unknown server error. Please try again.');
  }
}

export async function generateAndAnalyzeExamAction(
  input: GenerateExamAndAnalyzeInput
): Promise<GenerateExamAndAnalyzeOutput> {
  try {
    // The numberOfQuestions is fixed at 70 as per requirements.
    const result = await generateExamAndAnalyzeFlow({ ...input, numberOfQuestions: 70 });
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
