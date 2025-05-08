// src/ai/flows/generate-quiz.ts
'use server';

/**
 * @fileOverview Flashcard-style quiz generation flow.
 *
 * This file defines a Genkit flow for generating flashcard quizzes from course material.
 * - generateQuiz - A function that generates a quiz from course material.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 * - Flashcard - The structure for an individual flashcard.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlashcardSchema = z.object({
  id: z.string().describe('A unique identifier for the flashcard (e.g., UUID or sequential number as string).'),
  question: z.string().describe('The prompt or question for the front of the flashcard.'),
  answer: z.string().describe('The detailed answer with context or explanation for the back of the flashcard.'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('The difficulty level of the question.'),
  tags: z.array(z.string()).optional().describe('Optional tags for categorizing the question (e.g., topic, chapter).'),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

const GenerateQuizInputSchema = z.object({
  courseMaterial: z
    .string()
    .describe('The course material to generate the quiz from.'),
  quizLength: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of flashcards to generate for the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of generated flashcards.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  console.log('[StudySmarts Debug - generateQuiz] Input received:', JSON.stringify(input, null, 2));
  try {
    const result = await generateQuizFlow(input);
    console.log('[StudySmarts Debug - generateQuiz] Flow result:', JSON.stringify(result, null, 2));
    if (!result.flashcards || result.flashcards.length === 0) {
        console.warn('[StudySmarts Debug - generateQuiz] Warning: Generated quiz has no flashcards.');
        throw new Error("Generated quiz content is empty or contains no flashcards.");
    }
    return result;
  } catch (error) {
    console.error('[StudySmarts Debug - generateQuiz] Error during flow execution:', error);
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
  prompt: `You are an expert quiz generator specializing in creating flashcard-style questions.
Based on the provided course material, generate a quiz with {{quizLength}} flashcards.
Each flashcard must have the following structure:
- "id": A unique string identifier for the flashcard (e.g., "fc-1", "fc-2").
- "question": A clear and concise prompt, definition, concept, or problem.
- "answer": A detailed answer providing context or explanation.
- "difficulty": Categorized as "Easy", "Medium", or "Hard".
- "tags": An array of relevant keywords or topics (e.g., ["Photosynthesis", "Cell Biology"]). If no specific tags are apparent, provide a general tag based on the material.

Ensure the output is a JSON object with a "flashcards" array, where each element is a flashcard object as described above.

Course Material:
{{{courseMaterial}}}
`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async (input: GenerateQuizInput) => {
    console.log('[StudySmarts Debug - generateQuizFlow] Input to prompt:', JSON.stringify(input, null, 2));
    try {
      const {output} = await prompt(input);
      console.log('[StudySmarts Debug - generateQuizFlow] Raw output from prompt:', JSON.stringify(output, null, 2));

      if (!output) {
        console.error('[StudySmarts Debug - generateQuizFlow] Critical: Failed to generate quiz - No output from model.');
        throw new Error("Failed to generate quiz: No output from model.");
      }
      if (!output.flashcards || output.flashcards.length === 0) {
        console.warn('[StudySmarts Debug - generateQuizFlow] Warning: Generated quiz content from model has no flashcards.');
        // Return an empty array if the model explicitly returns an empty array or if flashcards array is missing.
        return { flashcards: [] };
      }
      // Validate IDs - ensure they are strings
      output.flashcards.forEach((fc, index) => {
        if (typeof fc.id !== 'string') {
          console.warn(`[StudySmarts Debug - generateQuizFlow] Flashcard at index ${index} has non-string ID: ${fc.id}. Converting to string.`);
          fc.id = String(fc.id);
        }
      });

      return output;
    } catch (error) {
        console.error('[StudySmarts Debug - generateQuizFlow] Error calling prompt or processing output:', error);
        if (error instanceof Error) {
            throw new Error(`Error in quiz generation model call: ${error.message}`);
        }
        throw new Error('An unknown error occurred while calling the quiz generation model.');
    }
  }
);
