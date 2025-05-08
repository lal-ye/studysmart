// src/ai/flows/generate-quiz.ts
'use server';

/**
 * @fileOverview Quiz generation flow.
 *
 * This file defines a Genkit flow for generating quizzes from course material.
 * - generateQuiz - A function that generates a quiz from course material.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  courseMaterial: z
    .string()
    .describe('The course material to generate the quiz from.'),
  quizLength: z
    .number()
    .min(1)
    .max(20)
    .default(5) // sensible default for quiz length.
    .describe('The number of questions to generate for the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  console.log('[StudySmarts Debug - generateQuiz] Input received:', JSON.stringify(input, null, 2));
  try {
    const result = await generateQuizFlow(input);
    console.log('[StudySmarts Debug - generateQuiz] Flow result:', JSON.stringify(result, null, 2));
    if (!result.quiz || result.quiz.trim() === "") {
        console.warn('[StudySmarts Debug - generateQuiz] Warning: Generated quiz is empty or only whitespace.');
        // Optionally, throw an error if an empty quiz is unacceptable
        // throw new Error("Generated quiz content is empty.");
    }
    return result;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuiz] Error during flow execution:', error);
    // It's generally better to throw a more specific error or re-throw the original
    if (error instanceof Error) {
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred during quiz generation.');
  }
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  model: 'googleai/gemini-2.5-flash-preview-04-17',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are a quiz generator. Please generate a quiz with {{quizLength}} questions based on the following course material:\n\n{{courseMaterial}}`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    console.log('[StudySmarts Debug - generateQuizFlow] Input to prompt:', JSON.stringify(input, null, 2));
    try {
      const {output} = await prompt(input);
      console.log('[StudySmarts Debug - generateQuizFlow] Raw output from prompt:', JSON.stringify(output, null, 2));

      if (!output) {
        console.error('[StudySmarts Debug - generateQuizFlow] Critical: Failed to generate quiz - No output from model.');
        throw new Error("Failed to generate quiz: No output from model.");
      }
      if (!output.quiz || output.quiz.trim() === "") {
        console.warn('[StudySmarts Debug - generateQuizFlow] Warning: Generated quiz content from model is empty or only whitespace.');
        // Depending on requirements, you might want to throw an error here or attempt a retry.
        // For now, it will return the (potentially empty) quiz.
      }
      return output;
    } catch (error) {
        console.error('[StudySmarts Debug - generateQuizFlow] Error calling prompt or processing output:', error);
        // Re-throw to be caught by the outer try-catch in `generateQuiz` or propagate to the action handler
        if (error instanceof Error) {
            throw new Error(`Error in quiz generation model call: ${error.message}`);
        }
        throw new Error('An unknown error occurred while calling the quiz generation model.');
    }
  }
);

