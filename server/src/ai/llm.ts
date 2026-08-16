import OpenAI from 'openai';
import { aiConfig } from './config';

const client = new OpenAI({
  apiKey: aiConfig.apiKey,
  baseURL: aiConfig.baseURL,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = '你是 FlowCraft 的 AI 助手，一个项目管理智能助理。你可以帮助用户管理项目、任务、产物等。请用中文回答，回答简洁专业。';

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
