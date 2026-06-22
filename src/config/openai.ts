import { OpenAI } from 'openai';

export const openaiClient: OpenAI | null = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const model: string = process.env.OPENAI_MODEL || 'gpt-4.1';
export const embeddingModel: string =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
