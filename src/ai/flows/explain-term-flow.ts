'use server';
/**
 * @fileOverview A Genkit flow to explain a given term or concept, optionally with context.
 *
 * - explainTerm - A function that handles the term explanation process.
 * - ExplainTermInput - The input type for the explainTerm function.
 * - ExplainTermOutput - The return type for the explainTerm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {searchArticles, type Article} from '@/services/search-articles';

const ExplainTermInputSchema = z.object({
  term: z.string().describe('The term or concept to be explained.'),
  context: z.string().optional().describe('Optional surrounding text or context for the term, like the flashcard question or answer.'),
});
export type ExplainTermInput = z.infer<typeof ExplainTermInputSchema>;

const ExplainTermOutputSchema = z.object({
  explanation: z.string().describe('A concise explanation of the term.'),
  relatedLinks: z.array(z.object({
    title: z.string().describe('The title of the related article or resource.'),
    url: z.string().url().describe('The URL of the related article or resource.')
  })).optional().describe('Optional list of related links for further reading.'),
});
export type ExplainTermOutput = z.infer<typeof ExplainTermOutputSchema>;

export async function explainTerm(input: ExplainTermInput): Promise<ExplainTermOutput> {
  return explainTermFlow(input);
}

// Define a tool for searching articles if needed by the LLM
const getRelatedArticlesTool = ai.defineTool(
  {
    name: 'getRelatedArticles',
    description: 'Searches for articles related to a given topic to provide further reading material. Use this if the user needs external links for the term they want explained. Only use for very specific terms or concepts that would benefit from external resources.',
    inputSchema: z.object({ query: z.string().describe('The search query or topic for articles based on the highlighted term.') }),
    outputSchema: z.array(z.object({ title: z.string(), url: z.string().url() })).describe("A list of found articles, or an empty list if none are highly relevant."),
  },
  async ({ query }): Promise<Article[]> => {
    // Using the existing searchArticles service
    // The service might return generic examples if not fully implemented.
    const articles = await searchArticles(query);
    // Let's ensure the LLM gets a limited number to pick from if it uses the tool
    return articles.slice(0, 3); 
  }
);


const explainTermPrompt = ai.definePrompt({
  name: 'explainTermPrompt',
  model: 'googleai/gemini-2.5-flash-preview-04-17',
  tools: [getRelatedArticlesTool],
  input: { schema: ExplainTermInputSchema },
  output: { schema: ExplainTermOutputSchema },
  prompt: `You are a helpful learning assistant.
A user has highlighted the term "{{term}}" from a flashcard.
{{#if context}}
The surrounding context (e.g., the flashcard question or answer) is: "{{context}}"
{{/if}}

Please provide a concise and easy-to-understand explanation for "{{term}}".
Keep the explanation focused and relevant to a student learning this material.
The explanation should be in Markdown format.

If you believe external articles would significantly help the user understand "{{term}}", you MAY use the "getRelatedArticles" tool to find up to 2 relevant articles. Do not invent links or use the tool unnecessarily. If no highly relevant articles are found by the tool, do not include any links.

Respond with the explanation. If you used the tool and found RELEVANT articles, include them in the 'relatedLinks' field of the output.
Example output format:
{
  "explanation": "Photosynthesis is the process...",
  "relatedLinks": [
    {"title": "Intro to Photosynthesis", "url": "https://example.com/photosynthesis"}
  ]
}
Or, if no links are needed/found:
{
  "explanation": "A simple term is simple because..."
}
`,
});

const explainTermFlow = ai.defineFlow(
  {
    name: 'explainTermFlow',
    inputSchema: ExplainTermInputSchema,
    outputSchema: ExplainTermOutputSchema,
  },
  async (input: ExplainTermInput) => {
    const {output} = await explainTermPrompt(input);
    if (!output) {
      throw new Error('Failed to generate explanation: No output from model.');
    }
    // Ensure relatedLinks is an empty array if not provided or null, to match schema
    if (output.relatedLinks === undefined || output.relatedLinks === null) {
      output.relatedLinks = [];
    }
    return output;
  }
);