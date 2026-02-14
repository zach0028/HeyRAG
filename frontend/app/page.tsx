"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatArea } from "@/components/chat-area";
import { SettingsSidebar } from "@/components/settings-sidebar";
import { ProjectDialog } from "@/components/project-dialog";
import { DocumentDialog } from "@/components/document-dialog";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import {
  fetchProjects,
  fetchConversations,
  fetchMessages,
  fetchModels,
  createProject,
  deleteProject,
  updateProject,
  deleteConversation,
  Source,
  Project,
  Conversation,
  ModelInfo,
} from "@/lib/api";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("heyrag-project");
    },
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("heyrag-model") || "";
  });
  const [options, setOptions] = useState(() => {
    const defaults = { temperature: 0.7, num_ctx: 4096, top_p: 0.9, repeat_penalty: 1.1 };
    if (typeof window === "undefined") return defaults;
    const saved = localStorage.getItem("heyrag-options");
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || null;
  const chat = useChat(model, selectedProjectId || "");

  const voice = useVoice({
    model,
    projectId: selectedProjectId || "",
    conversationId: chat.conversationId,
    options,
    onTranscription: useCallback(
      (text: string) => {
        chat.setMessages((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: "" },
        ]);
      },
      [chat.setMessages],
    ),
    onToken: useCallback(
      (token: string) => {
        chat.setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + token },
          ];
        });
      },
      [chat.setMessages],
    ),
    onSources: useCallback(
      (sources: Source[]) => {
        chat.setSources(sources);
      },
      [chat.setSources],
    ),
    onConversationId: useCallback(
      (id: string) => {
        chat.setConversationId(id);
      },
      [chat.setConversationId],
    ),
    onDone: useCallback(() => {}, []),
    onError: useCallback(
      (err: string) => {
        chat.setError(err);
      },
      [chat.setError],
    ),
  });

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => {});
    fetchModels()
      .then((m) => {
        setModels(m);
        const saved = localStorage.getItem("heyrag-model");
        const names = m.map((mi) => mi.name);
        if (saved && names.includes(saved)) {
          setModel(saved);
        } else if (m.length > 0) {
          setModel(m[0].name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchConversations(selectedProjectId)
        .then(setConversations)
        .catch(() => {});
    } else {
      setConversations([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (chat.conversationId && selectedProjectId) {
      fetchConversations(selectedProjectId)
        .then(setConversations)
        .catch(() => {});
    }
  }, [chat.conversationId, selectedProjectId]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem("heyrag-project", projectId);
    chat.clear();
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const msgs = await fetchMessages(conversationId);
      chat.loadConversation(
        msgs.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        conversationId,
      );
    } catch {}
  };

  const handleNewConversation = () => chat.clear();

  const handleCreateProject = async (name: string, systemPrompt: string) => {
    const project = await createProject(name, systemPrompt);
    setProjects((prev) => [project, ...prev]);
    setSelectedProjectId(project.id);
    localStorage.setItem("heyrag-project", project.id);
    setProjectDialogOpen(false);
  };

  const handleUpdateProject = async (name: string, systemPrompt: string) => {
    if (!editingProject) return;
    const updated = await updateProject(editingProject.id, {
      name,
      system_prompt: systemPrompt,
    });
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
    setEditingProject(null);
    setProjectDialogOpen(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
      localStorage.removeItem("heyrag-project");
      chat.clear();
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (chat.conversationId === conversationId) {
      chat.clear();
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          conversations={conversations}
          activeConversationId={chat.conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onNewProject={() => {
            setEditingProject(null);
            setProjectDialogOpen(true);
          }}
          onEditProject={(p) => {
            setEditingProject(p);
            setProjectDialogOpen(true);
          }}
          onDeleteProject={handleDeleteProject}
          onDeleteConversation={handleDeleteConversation}
          onOpenDocuments={() => setDocumentDialogOpen(true)}
          model={model}
          models={models.map((m) => m.name)}
          onModelChange={(m) => {
            setModel(m);
            localStorage.setItem("heyrag-model", m);
            const info = models.find((mi) => mi.name === m);
            if (info) {
              const maxCtx = info.num_ctx;
              setOptions((prev: typeof options) => {
                const updated = {
                  ...prev,
                  num_ctx: Math.min(prev.num_ctx, maxCtx),
                };
                localStorage.setItem("heyrag-options", JSON.stringify(updated));
                return updated;
              });
            }
          }}
        />
        <SidebarInset className="flex flex-row">
          <ChatArea
            project={selectedProject}
            messages={chat.messages}
            sources={chat.sources}
            isStreaming={chat.isStreaming}
            error={chat.error}
            onSend={(q) => chat.send(q, options)}
            onStop={chat.stop}
            onRetry={chat.retry}
            voiceState={voice.state}
            onVoiceStart={voice.startRecording}
            onVoiceStop={voice.stopRecording}
            onVoiceCancel={voice.cancel}
          />
          <SettingsSidebar
            open={showSettings}
            onToggle={() => setShowSettings((v) => !v)}
            project={selectedProject}
            onSystemPromptChange={async (prompt) => {
              if (!selectedProject) return;
              const updated = await updateProject(selectedProject.id, {
                system_prompt: prompt,
              });
              setProjects((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
              );
            }}
            options={options}
            maxCtx={models.find((m) => m.name === model)?.num_ctx ?? 32768}
            onOptionsChange={(o) => {
              setOptions(o);
              localStorage.setItem("heyrag-options", JSON.stringify(o));
            }}
          />
        </SidebarInset>

        <ProjectDialog
          open={projectDialogOpen}
          onOpenChange={setProjectDialogOpen}
          project={editingProject}
          onSubmit={
            editingProject ? handleUpdateProject : handleCreateProject
          }
        />

        {selectedProjectId && (
          <DocumentDialog
            open={documentDialogOpen}
            onOpenChange={setDocumentDialogOpen}
            projectId={selectedProjectId}
          />
        )}
      </SidebarProvider>
    </TooltipProvider>
  );
}
