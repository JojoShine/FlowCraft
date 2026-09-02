import { useState, useCallback, useEffect, useRef } from 'react';
import { aiApi } from '../services/api';

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: any;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

interface Conversation {
  id: string;
  title: string | null;
  _count?: { messages: number };
}

export function useAIChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await aiApi.listConversations();
      setConversations(res.data as Conversation[]);
    } catch { /* ignore */ }
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    try {
      const res = await aiApi.getConversation(id);
      const conv = res.data as any;
      setCurrentConvId(id);
      setMessages(conv.messages.map((m: any) => ({
        id: m.id, role: m.role, content: m.content,
      })));
    } catch { /* ignore */ }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await aiApi.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
  }, [currentConvId]);

  const clearAllConversations = useCallback(async () => {
    try {
      await aiApi.clearConversations();
      setConversations([]);
      setCurrentConvId(null);
      setMessages([]);
    } catch { /* ignore */ }
  }, []);

  const sendMessage = useCallback(async (content: string, projectId?: string, templateIds?: string[]) => {
    if (!content.trim() || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, assistantMsg]);

    let renderTimer: ReturnType<typeof setTimeout> | null = null;
    let accumulated = '';
    const flushAssistantContent = () => {
      renderTimer = null;
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: accumulated };
        return next;
      });
    };

    try {
      const response = await aiApi.chat(currentConvId, content, projectId, templateIds, controller.signal);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (currentEvent === 'tool_call') {
                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  const toolCalls = [...(last.toolCalls || []), { name: data.name, args: data.args, result: data.result }];
                  next[next.length - 1] = { ...last, toolCalls };
                  return next;
                });
              } else if (currentEvent === 'token' && data.content) {
                accumulated += data.content;
                if (renderTimer === null) renderTimer = setTimeout(flushAssistantContent, 32);
              } else if (currentEvent === 'done') {
                if (data.conversationId && !currentConvId) {
                  setCurrentConvId(data.conversationId);
                }
              }
            } catch { /* skip malformed */ }
            currentEvent = '';
          }
        }
      }

      if (renderTimer !== null) clearTimeout(renderTimer);
      flushAssistantContent();

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], streaming: false };
        return next;
      });

      loadConversations();
    } catch {
      if (renderTimer !== null) clearTimeout(renderTimer);
      if (controller.signal.aborted) return;
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: '抱歉，出现了错误，请重试。',
          streaming: false,
        };
        return next;
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, [currentConvId, loading, loadConversations]);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setCurrentConvId(null);
    setMessages([]);
  }, []);

  return {
    conversations, currentConvId, messages, loading,
    sendMessage, selectConversation, deleteConversation,
    newConversation, loadConversations, clearAllConversations,
  };
}
