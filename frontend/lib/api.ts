const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getWsUrl(): string {
  return API_URL.replace(/^http/, "ws");
}

export interface Project {
  id: string;
  name: string;
  system_prompt: string;
  collection_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
}

export interface Source {
  filename: string;
  chunk_index: number;
}

export interface DocumentInfo {
  document_id: string;
  filename: string;
  chunk_index: number;
}

export interface ModelInfo {
  name: string;
  num_ctx: number;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${url}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Erreur serveur" }));
    throw new Error(error.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function createProject(
  name: string,
  systemPrompt: string = "",
): Promise<Project> {
  return apiFetch<Project>("/api/projects/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, system_prompt: systemPrompt }),
  });
}

export async function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects/");
}

export async function updateProject(
  projectId: string,
  data: { name?: string; system_prompt?: string },
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiFetch<{ status: string }>(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function fetchConversations(
  projectId: string,
): Promise<Conversation[]> {
  return apiFetch<Conversation[]>(
    `/api/projects/${projectId}/conversations`,
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  await apiFetch<{ status: string }>(
    `/api/projects/conversations/${conversationId}`,
    { method: "DELETE" },
  );
}

export async function fetchMessages(
  conversationId: string,
): Promise<Message[]> {
  return apiFetch<Message[]>(
    `/api/projects/conversations/${conversationId}/messages`,
  );
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const data = await apiFetch<{ models: ModelInfo[] }>("/api/chat/models");
  return data.models;
}

export async function sendMessageStream(
  question: string,
  model: string,
  projectId: string,
  conversationId: string | null,
  options: Record<string, number>,
  onToken: (token: string) => void,
  onSources: (sources: Source[]) => void,
  onConversationId: (id: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      model,
      project_id: projectId,
      conversation_id: conversationId,
      options,
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Erreur ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const data = line.replace("data: ", "");
      if (data === "[DONE]") {
        onDone();
        return;
      }
      try {
        const event = JSON.parse(data);
        if (event.type === "token") onToken(event.content);
        if (event.type === "sources") onSources(event.content);
        if (event.type === "conversation_id") onConversationId(event.content);
        if (event.type === "error") throw new Error(event.content);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export async function uploadDocument(
  file: File,
  projectId: string,
): Promise<{ document_id: string; filename: string; chunks_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_URL}/api/documents/upload?project_id=${projectId}`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Erreur upload" }));
    throw new Error(error.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

export async function fetchDocuments(
  projectId: string,
): Promise<DocumentInfo[]> {
  return apiFetch<DocumentInfo[]>(`/api/documents/?project_id=${projectId}`);
}

export async function deleteDocument(
  documentId: string,
  projectId: string,
): Promise<void> {
  await apiFetch<{ status: string }>(
    `/api/documents/${documentId}?project_id=${projectId}`,
    { method: "DELETE" },
  );
}
