import OpenAI from 'openai';
import { aiConfig } from './config';

const client = new OpenAI({
  apiKey: aiConfig.deepseek.apiKey,
  baseURL: aiConfig.deepseek.baseURL,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: aiConfig.deepseek.model,
    messages,
    stream: false,
  });
  return response.choices[0]?.message?.content || '';
}

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: aiConfig.deepseek.model,
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
