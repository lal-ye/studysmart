'use server';
/**
 * @fileOverview A flow that generates extra readings based on a given topic.
 *
 * - generateExtraReadings - A function that handles the generation of extra readings.
 * - GenerateExtraReadingsInput - The input type for the generateExtraReadings function.
 * - GenerateExtraReadingsOutput - The return type for the generateExtraReadings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {searchArticles} from '@/services/search-articles';

const GenerateExtraReadingsInputSchema = z.object({
  topic: z.string().describe('The topic to search for extra readings about.'),
});
export type GenerateExtraReadingsInput = z.infer<typeof GenerateExtraReadingsInputSchema>;

const GenerateExtraReadingsOutputSchema = z.object({
  articles: z
    .array(z.object({title: z.string(), url: z.string()}))
    .describe('An array of articles related to the topic.'),
});
export type GenerateExtraReadingsOutput = z.infer<typeof GenerateExtraReadingsOutputSchema>;

export async function generateExtraReadings(input: GenerateExtraReadingsInput): Promise<GenerateExtraReadingsOutput> {
  return generateExtraReadingsFlow(input);
}

const generateExtraReadingsFlow = ai.defineFlow(
  {
    name: 'generateExtraReadingsFlow',
    inputSchema: GenerateExtraReadingsInputSchema,
    outputSchema: GenerateExtraReadingsOutputSchema,
  },
  async input => {
    const articles = await searchArticles(input.topic);
    return {articles};
  }
);
