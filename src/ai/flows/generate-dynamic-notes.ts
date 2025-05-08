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
    .describe("The course material in text format."), // Assuming PDF content is already extracted
  sourceName: z.string().optional().describe("The name or URL of the source material for citation purposes, e.g., 'Chapter 1 notes.pdf' or 'https://example.com/lecture1'"),
});
export type GenerateDynamicNotesInput = z.infer<typeof GenerateDynamicNotesInputSchema>;

const GenerateDynamicNotesOutputSchema = z.object({
  notes: z.string().describe('The generated dynamic and interactive notes in markdown format.'),
});
export type GenerateDynamicNotesOutput = z.infer<typeof GenerateDynamicNotesOutputSchema>;

export async function generateDynamicNotes(input: GenerateDynamicNotesInput): Promise<GenerateDynamicNotesOutput> {
  return generateDynamicNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDynamicNotesPrompt',
  input: {schema: GenerateDynamicNotesInputSchema},
  output: {schema: GenerateDynamicNotesOutputSchema},
  prompt: `Generate comprehensive study notes from the provided source material. Structure the output in markdown format with the following specifications:
1.  **Header Hierarchy**: Use \`#\` for main topics, \`##\` for subtopics, and \`###\` for key concepts.
2.  **Visual Elements**:
    *   Create comparison tables (\`|...|\`) for contrasting ideas/concepts.
    *   Add collapsible sections (\`<details><summary>Section Title</summary>More details here...</details>\`) for supplementary details or complex explanations.
    *   Use bullet points (\`-\`) and numbered lists (\`1.\`) for hierarchical information.
3.  **Interactive Cues**:
    *   Embed hyperlinks (\`[text](url)\`) to relevant external resources if mentioned or applicable. If the source material itself is from a URL (provided in sourceName), link back to it where appropriate.
    *   Include callout boxes (\`> [!NOTE]\` for important notes, \`> [!IMPORTANT]\` for critical takeaways, \`> [!TIP]\` for helpful tips).
4.  **Synthesis**:
    *   Summarize key themes in your own words, avoiding verbatim copying.
    *   **Mindmap Overview**:
        Generate a Mermaid.js mindmap diagram that visually represents the core concepts, hierarchical relationships, and key connections within the provided source material.
        **Mindmap Requirements:**
        *   **Diagram Type:** Use the \`mindmap\` diagram type in Mermaid.js.
        *   **Root Node:** The central idea or root of the mindmap should be derived from the main topic of the source material. Use clear and concise text for the root node, e.g., \`root((Main Topic))\`.
        *   **Hierarchical Levels:** Represent at least 2-3 levels of hierarchy branching from the root node. Use indentation to define parent-child relationships.
        *   **Key Branches (Level 1):** Identify and include major branches stemming directly from the root, based on the main sections or themes in the material.
        *   **Sub-topics (Level 2+):** For each major branch, elaborate with relevant sub-topics or key concepts found in the material.
        *   **Clarity and Readability:** Use concise and descriptive labels for each node. Ensure the layout is logical and easy to follow.
        *   **Syntax:** Adhere strictly to Mermaid.js \`mindmap\` syntax.
        **Example Mermaid.js Mindmap Syntax (adapt to the content from {{{material}}}):**
        \`\`\`mermaid
        mindmap
          root((Central Idea from Material))
            Branch 1 from Material
              Sub-topic 1.1
              Sub-topic 1.2
                Further Detail 1.2.1
            Branch 2 from Material
              Sub-topic 2.1
        \`\`\`
5.  **Citations**:
    *   Attribute all ideas to the source using a styled placeholder like <span class="citation">[[1]]</span> if only one source is provided. If \`sourceName\` is available, use it as the reference.
    *   Include a 'References' section at the end. If \`sourceName\` is provided, list it as: \`1. {{{sourceName}}}\`. If not, state: \`1. Provided course material.\`

Example overall note structure:
\`\`\`markdown
# Main Topic
<span class="citation">[[1]]</span>

## Subtopic 1
<span class="citation">[[1]]</span>

> [!NOTE]
> Highlighted insight from source. <span class="citation">[[1]]</span>

### Key Concept
- Bullet point related to the concept. <span class="citation">[[1]]</span>
- Another bullet point, perhaps with a link if relevant [External Resource](https://example.com). <span class="citation">[[1]]</span>

| Comparison Table | Column A | Column B |
|------------------|----------|----------|
| Row 1            | Data A   | Data B   |
| Row 2            | Data C   | Data D   |

<details>
  <summary>Additional Details on Key Concept</summary>
  Expanded explanation, possibly with more bullet points or a nested list. <span class="citation">[[1]]</span>
</details>

## Mindmap Overview
\`\`\`mermaid
mindmap
  root((Central Idea of the Notes))
    Key Theme 1
      Concept A
      Concept B
    Key Theme 2
      Concept C
\`\`\`

## References
1. {{{sourceName}}}
\`\`\`

Prioritize clarity, logical flow, and visual organization while maintaining academic integrity.

Source Material:
{{{material}}}
`,
});

const generateDynamicNotesFlow = ai.defineFlow(
  {
    name: 'generateDynamicNotesFlow',
    inputSchema: GenerateDynamicNotesInputSchema,
    outputSchema: GenerateDynamicNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt({
        material: input.material,
        sourceName: input.sourceName || "Provided course material"
    });
    if (!output) {
        throw new Error("Failed to generate notes: No output from model.");
    }
    return output;
  }
);

