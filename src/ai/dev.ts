import { config } from 'dotenv';
config();

import '@/ai/flows/generate-exam-and-analyze.ts';
import '@/ai/flows/generate-quiz.ts';
import '@/ai/flows/generate-dynamic-notes.ts';
import '@/ai/flows/generate-extra-readings.ts';
import '@/ai/flows/extract-text-from-pdf-flow.ts';
import '@/ai/flows/explain-term-flow.ts';