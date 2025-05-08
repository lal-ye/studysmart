
import { findRelevantArticles, type FindRelevantArticlesInput } from '@/ai/flows/find-relevant-articles-flow';

/**
 * Represents an article with a title and URL.
 */
export interface Article {
  /**
   * The title of the article.
   */
  title: string;
  /**
   * The URL of the article.
   */
  url: string;
}

/**
 * Asynchronously searches for articles related to a given topic using an AI flow.
 *
 * @param topic The topic to search for articles about.
 * @returns A promise that resolves to an array of Article objects.
 */
export async function searchArticles(topic: string): Promise<Article[]> {
  try {
    const input: FindRelevantArticlesInput = { topic };
    const result = await findRelevantArticles(input);
    return result.articles || []; // Ensure an array is always returned
  } catch (error) {
    console.error(`Error searching articles for topic "${topic}":`, error);
    // Depending on desired error handling, you might re-throw or return empty/default
    // For now, returning an empty array to prevent breaking calling flows.
    return []; 
  }
}
