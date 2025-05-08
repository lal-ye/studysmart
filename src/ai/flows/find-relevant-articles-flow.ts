
'use server';
/**
 * @fileOverview A Genkit flow to find relevant articles for a given topic.
 *
 * - findRelevantArticles - A function that handles finding relevant articles.
 * - FindRelevantArticlesInput - The input type for the findRelevantArticles function.
 * - FindRelevantArticlesOutput - The return type for the findRelevantArticles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ArticleSchema = z.object({
  title: z.string().describe('The title of the article.'),
  url: z.string().url().describe('The URL of the article.'),
});
export type Article = z.infer<typeof ArticleSchema>;

const FindRelevantArticlesInputSchema = z.object({
  topic: z.string().describe('The topic to find articles about.'),
});
export type FindRelevantArticlesInput = z.infer<typeof FindRelevantArticlesInputSchema>;

const FindRelevantArticlesOutputSchema = z.object({
  articles: z.array(ArticleSchema).describe('A list of relevant articles.'),
});
export type FindRelevantArticlesOutput = z.infer<typeof FindRelevantArticlesOutputSchema>;

export async function findRelevantArticles(input: FindRelevantArticlesInput): Promise<FindRelevantArticlesOutput> {
  return findRelevantArticlesFlow(input);
}

const findRelevantArticlesPrompt = ai.definePrompt({
  name: 'findRelevantArticlesPrompt',
  model: 'googleai/gemini-2.5-flash-preview-04-17',
  input: {schema: FindRelevantArticlesInputSchema},
  output: {schema: FindRelevantArticlesOutputSchema},
  prompt: `You are an expert research assistant.
For the topic "{{{topic}}}", provide a list of 2-3 highly relevant articles that would be suitable for further reading.
For each article, give a concise title and a plausible, well-formed URL.
The articles should appear to be from reputable sources (e.g., academic journals, well-known educational websites, official documentation).
Focus on providing high-quality, informative resources.

Output the result as a JSON object with an "articles" array, where each element has "title" and "url".
Example:
{
  "articles": [
    { "title": "Introduction to Topic X", "url": "https://example.edu/intro-topic-x" },
    { "title": "Advanced Concepts in Topic X", "url": "https://journaloftopicx.org/article123" }
  ]
}
`,
});

const findRelevantArticlesFlow = ai.defineFlow(
  {
    name: 'findRelevantArticlesFlow',
    inputSchema: FindRelevantArticlesInputSchema,
    outputSchema: FindRelevantArticlesOutputSchema,
  },
  async (input: FindRelevantArticlesInput) => {
    const {output} = await findRelevantArticlesPrompt(input);
    if (!output) {
      throw new Error('Failed to find relevant articles: No output from model.');
    }
    // Ensure articles is an empty array if not provided or null, to match schema
    if (output.articles === undefined || output.articles === null) {
      output.articles = [];
    }
    return output;
  }
);
