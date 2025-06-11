'use server';

import { createUserAI } from '@/ai/genkit';
import { z } from 'genkit';
import type { ExtractTextFromPdfInput, ExtractTextFromPdfOutput } from '@/ai/flows/extract-text-from-pdf-flow';

// BYOK wrapper for quiz generation
export async function generateQuizWithBYOK(
  input: {
    material: string;
    quizLength: number;
    difficulty: string;
    apiKey: string;
  }
) {
  const userAI = createUserAI(input.apiKey);

  const GenerateQuizInputSchema = z.object({
    material: z.string(),
    quizLength: z.number(),
    difficulty: z.string(),
  });

  const GenerateQuizOutputSchema = z.object({
    flashcards: z.array(z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      difficulty: z.string(),
    })),
  });

  const generateQuizFlow = userAI.defineFlow(
    {
      name: 'generateQuizFlowBYOK',
      inputSchema: GenerateQuizInputSchema,
      outputSchema: GenerateQuizOutputSchema,
    },
    async (flowInput) => {
      // Use the same prompt logic from your existing flow
      const prompt = userAI.definePrompt({
        name: 'generateQuizPromptBYOK',
        input: { schema: GenerateQuizInputSchema },
        output: { schema: GenerateQuizOutputSchema },
        prompt: `Generate a quiz with {{quizLength}} flashcards based on the following material:

{{material}}

Difficulty: {{difficulty}}

Create flashcards with clear questions and accurate answers.`,
      });

      const { output } = await prompt(flowInput);
      if (!output) {
        throw new Error("Failed to generate quiz: No output from model.");
      }
      return output;
    }
  );

  return generateQuizFlow({
    material: input.material,
    quizLength: input.quizLength,
    difficulty: input.difficulty,
  });
}

// BYOK wrapper for dynamic notes generation
export async function generateDynamicNotesWithBYOK(
  input: {
    material: string;
    sourceName?: string;
    apiKey: string;
  }
) {
  const userAI = createUserAI(input.apiKey);

  const GenerateDynamicNotesInputSchema = z.object({
    material: z.string(),
    sourceName: z.string().optional(),
  });

  const GenerateDynamicNotesOutputSchema = z.object({
    notes: z.string(),
  });

  const generateNotesFlow = userAI.defineFlow(
    {
      name: 'generateDynamicNotesFlowBYOK',
      inputSchema: GenerateDynamicNotesInputSchema,
      outputSchema: GenerateDynamicNotesOutputSchema,
    },
    async (flowInput) => {
      const prompt = userAI.definePrompt({
        name: 'generateNotesPromptBYOK',
        input: { schema: GenerateDynamicNotesInputSchema },
        output: { schema: GenerateDynamicNotesOutputSchema },
        prompt: `Generate comprehensive and organized notes from the following material:

{{material}}

{{#if sourceName}}Source: {{sourceName}}{{/if}}

Create well-structured notes in markdown format with clear headings, bullet points, and key concepts highlighted.`,
      });

      const { output } = await prompt(flowInput);
      if (!output) {
        throw new Error("Failed to generate notes: No output from model.");
      }
      return output;
    }
  );

  return generateNotesFlow({
    material: input.material,
    sourceName: input.sourceName,
  });
}

// BYOK wrapper for term explanation
export async function explainTermWithBYOK(
  input: {
    term: string;
    context?: string;
    apiKey: string;
  }
) {
  const userAI = createUserAI(input.apiKey);

  const ExplainTermInputSchema = z.object({
    term: z.string(),
    context: z.string().optional(),
  });

  const ExplainTermOutputSchema = z.object({
    explanation: z.string(),
    relatedLinks: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })).optional(),
  });

  const explainTermFlow = userAI.defineFlow(
    {
      name: 'explainTermFlowBYOK',
      inputSchema: ExplainTermInputSchema,
      outputSchema: ExplainTermOutputSchema,
    },
    async (flowInput) => {
      const prompt = userAI.definePrompt({
        name: 'explainTermPromptBYOK',
        input: { schema: ExplainTermInputSchema },
        output: { schema: ExplainTermOutputSchema },
        prompt: `Explain the term "{{term}}" in a clear and concise way.

{{#if context}}Context: {{context}}{{/if}}

Provide a helpful explanation that a student would understand, formatted in markdown.`,
      });

      const { output } = await prompt(flowInput);
      if (!output) {
        throw new Error("Failed to generate explanation: No output from model.");
      }

      if (!output.relatedLinks) {
        output.relatedLinks = [];
      }

      return output;
    }
  );

  return explainTermFlow({
    term: input.term,
    context: input.context,
  });
}

export async function extractTextFromPdfWithBYOK(input: ExtractTextFromPdfInput & { apiKey: string }): Promise<ExtractTextFromPdfOutput> {
  try {
    const userAI = createUserAI(input.apiKey);

    const ExtractTextFromPdfInputSchema = z.object({
      pdfDataUri: z
        .string()
        .describe(
          "The PDF file content as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
        ),
    });

    const ExtractTextFromPdfOutputSchema = z.object({
      extractedText: z.string().describe('The extracted textual content from the PDF.'),
    });

    const pdfExtractionPrompt = userAI.definePrompt({
      name: 'extractTextFromPdfPromptBYOK',
      model: 'googleai/gemini-2.5-flash-preview-04-17',
      input: { schema: ExtractTextFromPdfInputSchema },
      output: { schema: ExtractTextFromPdfOutputSchema },
      prompt: `Extract all textual content from the provided PDF document.
      Output only the raw text. Do not include any additional commentary, formatting, or summarization.
      PDF Document: {{media url=pdfDataUri}}`,
    });

    const extractTextFromPdfFlow = userAI.defineFlow(
      {
        name: 'extractTextFromPdfFlowBYOK',
        inputSchema: ExtractTextFromPdfInputSchema,
        outputSchema: ExtractTextFromPdfOutputSchema,
      },
      async (flowInput: ExtractTextFromPdfInput) => {
        const { output } = await pdfExtractionPrompt(flowInput);
        if (!output) {
          throw new Error('Failed to extract text from PDF: No output from model.');
        }
        return output;
      }
    );

    const result = await extractTextFromPdfFlow({ pdfDataUri: input.pdfDataUri });
    return result;
  } catch (error) {
    console.error('Error in extractTextFromPdfWithBYOK:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to extract text from PDF');
  }
}