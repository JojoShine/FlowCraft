import { useState, useCallback, useRef } from 'react';
import { aiApi } from '../services/api';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const response = await aiApi.chat(currentConvId, content);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                accumulated += data.content;
                setMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { ...next[next.length - 1], content: accumulated };
                  return next;
                });
              }
              if (data.conversationId && !currentConvId) {
                setCurrentConvId(data.conversationId);
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], streaming: false };
        return next;
      });

      loadConversations();
    } catch {
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
    newConversation, loadConversations,
  };
}
