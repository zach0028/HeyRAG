import { useState, useRef, useCallback } from "react";
import { Source, sendMessageStream } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat(model: string, projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const lastOptionsRef = useRef<Record<string, number>>({});

  const send = useCallback(
    async (question: string, options: Record<string, number> = {}) => {
      if (!projectId) return;
      lastQuestionRef.current = question;
      lastOptionsRef.current = options;
      setError(null);

      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "" },
      ]);
      setSources([]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await sendMessageStream(
          question,
          model,
          projectId,
          conversationId,
          options,
          (token) => {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + token },
              ];
            });
          },
          (newSources) => setSources(newSources),
          (id) => setConversationId(id),
          () => {},
          controller.signal,
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [model, projectId, conversationId],
  );

  const retry = useCallback(() => {
    if (!lastQuestionRef.current) return;
    setMessages((prev) => {
      const lastUserIndex = prev.findLastIndex((m) => m.role === "user");
      return lastUserIndex >= 0 ? prev.slice(0, lastUserIndex) : prev;
    });
    send(lastQuestionRef.current, lastOptionsRef.current);
  }, [send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setSources([]);
    setError(null);
    setConversationId(null);
    lastQuestionRef.current = null;
  }, []);

  const loadConversation = useCallback(
    (msgs: ChatMessage[], convId: string) => {
      setMessages(msgs);
      setConversationId(convId);
      setSources([]);
      setError(null);
    },
    [],
  );

  return {
    messages,
    sources,
    isStreaming,
    error,
    conversationId,
    send,
    stop,
    clear,
    retry,
    loadConversation,
    setMessages,
    setSources,
    setConversationId,
    setError,
  };
}
