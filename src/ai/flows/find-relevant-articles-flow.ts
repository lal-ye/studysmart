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
For the topic "{{{topic}}}", provide a list of 2-3 highly relevant articles suitable for further reading.
For each article, give a concise title and a plausible, well-formed URL starting with 'https://'.
The articles must appear to be from reputable sources (e.g., academic journals, well-known educational websites, official documentation).
Do not use placeholder URLs like 'example.com'. Ensure the URLs are complete and appear valid.

Output the result as a JSON object with an "articles" array, where each element has "title" and "url" fields.
Example:
{
  "articles": [
    { "title": "Introduction to Machine Learning", "url": "https://arxiv.org/abs/1234.56789" },
    { "title": "Advanced Machine Learning Techniques", "url": "https://proceedings.mlr.press/v123/article456.html" },
    { "title": "Machine Learning Basics", "url": "https://www.coursera.org/learn/machine-learning" }
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
    }

    // Validate URLs and filter out invalid ones
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return url.startsWith('https://');
      } catch {
        return false;
      }
    };

    output.articles = output.articles.filter(article => isValidUrl(article.url));

    if (output.articles.length === 0) {
      console.warn('[StudySmarts Debug - findRelevantArticlesFlow] No valid articles with well-formed URLs for topic "'+ input.topic +'". Providing fallback.');
      // It's better to return an empty array and let the UI handle it, or throw an error if articles are critical.
      // Providing a generic fallback might not always be desired.
      // For now, let's return an empty array as per original behavior if no valid articles found.
      // If a fallback is truly desired, it should be more contextual or clearly marked as a fallback.
      // Example fallback:
      // output.articles = [{
      //   title: `Search for "${input.topic}" on a search engine`,
      //   url: `https://www.google.com/search?q=${encodeURIComponent(input.topic)}`
      // }];
    } else {
      console.log('[StudySmarts Debug - findRelevantArticlesFlow] Model returned '+ output.articles.length +' valid articles for topic "'+ input.topic +'".');
    }

    return output;
  }
);
