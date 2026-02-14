import { useState, useRef, useCallback, useEffect } from "react";
import { Source, getWsUrl } from "@/lib/api";

export type VoiceState = "idle" | "recording" | "processing" | "playing";

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

interface UseVoiceOptions {
  model: string;
  projectId: string;
  conversationId: string | null;
  options: Record<string, number>;
  onTranscription: (text: string) => void;
  onToken: (token: string) => void;
  onSources: (sources: Source[]) => void;
  onConversationId: (id: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function useVoice(opts: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (currentSourceRef.current) {
      currentSourceRef.current.onended = null;
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      setState("idle");
      return;
    }

    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextInQueue;
    currentSourceRef.current = source;
    source.start();
  }, []);

  const enqueueAudio = useCallback(
    async (wavBytes: ArrayBuffer) => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          wavBytes,
        );
        audioQueueRef.current.push(audioBuffer);

        if (!isPlayingRef.current) {
          setState("playing");
          playNextInQueue();
        }
      } catch {
        // WAV corrompu — on skip ce chunk
      }
    },
    [playNextInQueue],
  );

  const connectAndSend = useCallback(
    (audioBlob: Blob) => {
      const { projectId, model, conversationId, options } = optsRef.current;
      const ws = new WebSocket(`${getWsUrl()}/ws/voice`);
      wsRef.current = ws;
      setState("processing");

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "config",
            project_id: projectId,
            model,
            conversation_id: conversationId,
            options,
          }),
        );
        audioBlob.arrayBuffer().then((buffer) => ws.send(buffer));
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const buffer = await event.data.arrayBuffer();
          enqueueAudio(buffer);
          return;
        }

        const msg = JSON.parse(event.data);
        const o = optsRef.current;

        switch (msg.type) {
          case "transcription":
            o.onTranscription(msg.text);
            break;
          case "conversation_id":
            o.onConversationId(msg.content);
            break;
          case "token":
            o.onToken(msg.content);
            break;
          case "sources":
            o.onSources(msg.content);
            break;
          case "audio_done":
            break;
          case "done":
            if (!isPlayingRef.current) setState("idle");
            o.onDone();
            break;
          case "error":
            setState("idle");
            o.onError(msg.content);
            cleanup();
            break;
        }
      };

      ws.onerror = () => {
        setState("idle");
        optsRef.current.onError("Connexion WebSocket échouée");
        cleanup();
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    },
    [enqueueAudio, cleanup],
  );

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        if (blob.size > 100) {
          connectAndSend(blob);
        } else {
          setState("idle");
        }
      };

      mediaRecorder.start();
      setState("recording");
    } catch {
      optsRef.current.onError("Accès au micro refusé");
    }
  }, [state, connectAndSend]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording,
    cancel,
  };
}
