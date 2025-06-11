import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Default AI instance for system-wide operations
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// BYOK AI instance factory
export function createUserAI(apiKey: string) {
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.0-flash',
  });
}
