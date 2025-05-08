'use server';

import { generateDynamicNotes as generateDynamicNotesFlow, type GenerateDynamicNotesInput } from '@/ai/flows/generate-dynamic-notes';
import { generateQuiz as generateQuizFlow, type GenerateQuizInput } from '@/ai/flows/generate-quiz';
import { generateExamAndAnalyze as generateExamAndAnalyzeFlow, type GenerateExamAndAnalyzeInput, type GenerateExamAndAnalyzeOutput } from '@/ai/flows/generate-exam-and-analyze';
import { generateExtraReadings as generateExtraReadingsFlow, type GenerateExtraReadingsInput, type GenerateExtraReadingsOutput } from '@/ai/flows/generate-extra-readings';
import { extractTextFromPdf as extractTextFromPdfFlow, type ExtractTextFromPdfInput, type ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';

export async function generateNotesAction(
  input: GenerateDynamicNotesInput
): Promise<string> {
  try {
    const result = await generateDynamicNotesFlow(input);
    return result.notes;
  } catch (error) {
    console.error('Error in generateNotesAction:', error);
    throw new Error('Failed to generate notes. Please try again.');
  }
}

export async function generateQuizAction(
  input: GenerateQuizInput
): Promise<string> {
  try {
    const result = await generateQuizFlow(input);
    return result.quiz;
  } catch (error) {
    console.error('Error in generateQuizAction:', error);
    throw new Error('Failed to generate quiz. Please try again.');
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
    throw new Error('Failed to generate and analyze exam. Please try again.');
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
    throw new Error('Failed to fetch extra readings. Please try again.');
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
