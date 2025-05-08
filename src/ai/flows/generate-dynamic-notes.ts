// src/ai/flows/generate-dynamic-notes.ts
'use server';
/**
 * @fileOverview Generates dynamic and interactive notes from PDFs and course materials using GenAI.
 *
 * - generateDynamicNotes - A function that handles the dynamic notes generation process.
 * - GenerateDynamicNotesInput - The input type for the generateDynamicNotes function.
 * - GenerateDynamicNotesOutput - The return type for the generateDynamicNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDynamicNotesInputSchema = z.object({
  material: z
    .string()
    .describe("The course material in PDF or text format."),
});
export type GenerateDynamicNotesInput = z.infer<typeof GenerateDynamicNotesInputSchema>;

const GenerateDynamicNotesOutputSchema = z.object({
  notes: z.string().describe('The generated dynamic and interactive notes.'),
});
export type GenerateDynamicNotesOutput = z.infer<typeof GenerateDynamicNotesOutputSchema>;

export async function generateDynamicNotes(input: GenerateDynamicNotesInput): Promise<GenerateDynamicNotesOutput> {
  return generateDynamicNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDynamicNotesPrompt',
  input: {schema: GenerateDynamicNotesInputSchema},
  output: {schema: GenerateDynamicNotesOutputSchema},
  prompt: `You are an AI assistant designed to generate dynamic and interactive notes from course materials.

  Please generate comprehensive and interactive notes from the following material:

  {{material}}
  `,
});

const generateDynamicNotesFlow = ai.defineFlow(
  {
    name: 'generateDynamicNotesFlow',
    inputSchema: GenerateDynamicNotesInputSchema,
    outputSchema: GenerateDynamicNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
