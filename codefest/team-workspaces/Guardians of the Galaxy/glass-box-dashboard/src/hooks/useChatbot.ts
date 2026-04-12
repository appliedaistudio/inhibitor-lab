import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, DatasetEntry } from '@/lib/types';
import { detectIntent } from '@/lib/chatIntents';
import { buildChatContext } from '@/lib/chatContextBuilder';
import { streamChatResponse } from '@/lib/chatEngine';

interface UseChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  clearChat: () => void;
  togglePanel: () => void;
}

let msgId = 0;
function nextMsgId(): string {
  return `msg_${++msgId}_${Date.now()}`;
}

export function useChatbot(dataset: DatasetEntry | null): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isLoadingRef = useRef(false);

  // Keep refs in sync so callbacks always read fresh values
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoadingRef.current) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      setError('Missing VITE_OPENAI_API_KEY in environment. Add it to your .env file.');
      return;
    }

    if (!dataset) {
      setError('No dataset loaded. Load a dataset first.');
      return;
    }

    setError(null);

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      // Detect intent and build context
      const { intent, entities } = detectIntent(text);
      const context = buildChatContext(dataset, intent, entities);

      // Build conversation history from ref (always fresh, excludes the loading msg)
      const history = [...messagesRef.current.filter(m => !m.loading), userMsg];

      // Stream response
      let fullContent = '';
      for await (const token of streamChatResponse(history, context, apiKey)) {
        fullContent += token;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: fullContent, loading: false }
              : m,
          ),
        );
      }

      // Final update
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: fullContent || 'I could not generate a response. Please try rephrasing your question.', loading: false }
            : m,
        ),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${errorMessage}`, loading: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [dataset]);

  return {
    messages,
    isLoading,
    isOpen,
    error,
    sendMessage,
    clearChat,
    togglePanel,
  };
}
