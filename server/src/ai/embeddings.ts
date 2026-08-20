import OpenAI from 'openai';
import { aiConfig } from './config';

const client = new OpenAI({
  apiKey: aiConfig.embedding.apiKey,
  baseURL: aiConfig.embedding.baseURL,
});

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await client.embeddings.create({
    model: aiConfig.embedding.model,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
