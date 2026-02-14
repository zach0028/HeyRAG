"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "@/hooks/useChat";
import { Source, Project } from "@/lib/api";
import { VoiceState } from "@/hooks/useVoice";
import {
  ArrowUp,
  Square,
  RotateCcw,
  Copy,
  Check,
  Mic,
  Loader2,
  Volume2,
} from "lucide-react";

interface ChatAreaProps {
  project: Project | null;
  messages: ChatMessage[];
  sources: Source[];
  isStreaming: boolean;
  error: string | null;
  onSend: (question: string) => void;
  onStop: () => void;
  onRetry: () => void;
  voiceState: VoiceState;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onVoiceCancel: () => void;
}

export function ChatArea({
  project,
  messages,
  sources,
  isStreaming,
  error,
  onSend,
  onStop,
  onRetry,
  voiceState,
  onVoiceStart,
  onVoiceStop,
  onVoiceCancel,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput("");
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!project) {
    return (
      <div className="flex flex-col h-dvh">
        <header className="flex items-center gap-2 h-14 px-4 border-b shrink-0">
          <SidebarTrigger />
          <span className="font-semibold">HeyRAG</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-2xl font-semibold">Bienvenue sur HeyRAG</p>
            <p className="text-muted-foreground">
              Crée ou sélectionne un projet pour commencer
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh flex-1 min-w-0">
      <header className="flex items-center h-14 px-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <span className="font-semibold">{project.name}</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Pose une question sur tes documents
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative group max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => handleCopy(msg.content, i)}
                      className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                    >
                      {copiedIndex === i ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sources.map((s, i) => (
                  <Badge key={i} variant="secondary">
                    {s.filename}
                  </Badge>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-2">
                <span className="text-sm flex-1">{error}</span>
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  <RotateCcw className="size-4 mr-1" />
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={handleSend}
            isLoading={isStreaming}
            disabled={voiceState !== "idle"}
          >
            <PromptInputTextarea
              placeholder="Pose ta question..."
              className="min-h-[44px] pt-3 pl-4 text-base"
            />
            <PromptInputActions className="flex w-full items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction
                  tooltip={
                    voiceState === "recording"
                      ? "Arreter"
                      : voiceState === "processing"
                        ? "Annuler"
                        : voiceState === "playing"
                          ? "Arreter"
                          : "Micro"
                  }
                >
                  {voiceState === "recording" ? (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="size-9 rounded-full animate-pulse"
                      onMouseUp={onVoiceStop}
                      onTouchEnd={onVoiceStop}
                    >
                      <Mic className="size-4" />
                    </Button>
                  ) : voiceState === "processing" ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={onVoiceCancel}
                    >
                      <Loader2 className="size-4 animate-spin" />
                    </Button>
                  ) : voiceState === "playing" ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={onVoiceCancel}
                    >
                      <Volume2 className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                      onMouseDown={onVoiceStart}
                      onTouchStart={onVoiceStart}
                      disabled={isStreaming || !project}
                    >
                      <Mic className="size-4" />
                    </Button>
                  )}
                </PromptInputAction>
              </div>
              <PromptInputAction
                tooltip={isStreaming ? "Arreter" : "Envoyer"}
              >
                <Button
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={isStreaming ? onStop : handleSend}
                  disabled={
                    !isStreaming &&
                    (!input.trim() || voiceState !== "idle")
                  }
                >
                  {isStreaming ? (
                    <Square className="size-4" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
