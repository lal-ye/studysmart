
'use server';
/**
 * @fileOverview A Genkit flow to extract text content from a PDF file.
 *
 * - extractTextFromPdf - A function that handles the PDF text extraction process.
 * - ExtractTextFromPdfInput - The input type for the extractTextFromPdf function.
 * - ExtractTextFromPdfOutput - The return type for the extractTextFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The PDF file content as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromPdfInput = z.infer<typeof ExtractTextFromPdfInputSchema>;

const ExtractTextFromPdfOutputSchema = z.object({
  extractedText: z.string().describe('The extracted textual content from the PDF.'),
});
export type ExtractTextFromPdfOutput = z.infer<typeof ExtractTextFromPdfOutputSchema>;

export async function extractTextFromPdf(input: ExtractTextFromPdfInput): Promise<ExtractTextFromPdfOutput> {
  return extractTextFromPdfFlow(input);
}

const pdfExtractionPrompt = ai.definePrompt({
  name: 'extractTextFromPdfPrompt',
  // Use a model known for strong multimodal capabilities, like Gemini 1.5 Pro.
  // This model can typically handle PDF data URIs directly.
  // Changed from 'googleai/gemini-1.5-flash-latest' due to "Model not found" error.
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: ExtractTextFromPdfInputSchema},
  output: {schema: ExtractTextFromPdfOutputSchema},
  prompt: `Extract all textual content from the provided PDF document.
  Output only the raw text. Do not include any additional commentary, formatting, or summarization.
  PDF Document: {{media url=pdfDataUri}}`,
});

const extractTextFromPdfFlow = ai.defineFlow(
  {
    name: 'extractTextFromPdfFlow',
    inputSchema: ExtractTextFromPdfInputSchema,
    outputSchema: ExtractTextFromPdfOutputSchema,
  },
  async (input: ExtractTextFromPdfInput) => {
    const {output} = await pdfExtractionPrompt(input);
    if (!output) {
      throw new Error('Failed to extract text from PDF: No output from model.');
    }
    return output;
  }
);

