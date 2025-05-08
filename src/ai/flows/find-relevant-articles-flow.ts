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
    const modelResponse = await findRelevantArticlesPrompt(input);
    console.log('[StudySmarts Debug - findRelevantArticlesFlow] Raw model response for topic "'+ input.topic +'":', JSON.stringify(modelResponse, null, 2));
    
    const {output} = modelResponse;
    console.log('[StudySmarts Debug - findRelevantArticlesFlow] Parsed output from model for topic "'+ input.topic +'":', JSON.stringify(output, null, 2));

    if (!output) {
      console.error('[StudySmarts Debug - findRelevantArticlesFlow] No output from model after schema validation for topic "'+ input.topic +'".');
      throw new Error('Failed to find relevant articles: No output from model.');
    }
    
    if (output.articles === undefined || output.articles === null) {
      console.warn('[StudySmarts Debug - findRelevantArticlesFlow] Model output.articles is undefined or null for topic "'+ input.topic +'". Setting to empty array.');
      output.articles = [];
    } else if (output.articles.length === 0) {
      console.warn('[StudySmarts Debug - findRelevantArticlesFlow] Model returned an empty "articles" array for topic "'+ input.topic +'".');
    } else {
      console.log('[StudySmarts Debug - findRelevantArticlesFlow] Model returned '+ output.articles.length +' articles for topic "'+ input.topic +'".');
    }
    return output;
  }
);

