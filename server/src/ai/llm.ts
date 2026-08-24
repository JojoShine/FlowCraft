import OpenAI from 'openai';
import { aiConfig } from './config';

const client = new OpenAI({
  apiKey: aiConfig.deepseek.apiKey,
  baseURL: aiConfig.deepseek.baseURL,
});

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; toolCalls: ToolCall[] }
  | { type: 'done'; finishReason: string };

export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: aiConfig.deepseek.model,
    messages: messages as any,
    stream: false,
  });
  return response.choices[0]?.message?.content || '';
}

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: aiConfig.deepseek.model,
    messages: messages as any,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export async function* chatStreamWithTools(
  messages: ChatMessage[],
  tools: readonly unknown[],
): AsyncGenerator<StreamEvent> {
  const stream = await client.chat.completions.create({
    model: aiConfig.deepseek.model,
    messages: messages as any,
    tools: tools as any,
    stream: true,
  });

  const toolCallAccum: Record<number, ToolCall> = {};

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    const finishReason = chunk.choices[0]?.finish_reason;

    if (delta?.content) {
      yield { type: 'text', content: delta.content };
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        if (!toolCallAccum[idx]) {
          toolCallAccum[idx] = {
            id: tc.id || '',
            type: 'function',
            function: { name: tc.function?.name || '', arguments: '' },
          };
        }
        if (tc.id) toolCallAccum[idx].id = tc.id;
        if (tc.function?.name) toolCallAccum[idx].function.name = tc.function.name;
        if (tc.function?.arguments) toolCallAccum[idx].function.arguments += tc.function.arguments;
      }
    }

    if (finishReason) {
      const toolCalls = Object.values(toolCallAccum);
      if (toolCalls.length > 0) {
        yield { type: 'tool_calls', toolCalls };
      }
      yield { type: 'done', finishReason };
    }
  }
}
