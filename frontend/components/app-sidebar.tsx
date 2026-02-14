"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Project, Conversation } from "@/lib/api";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  FileText,
  Settings,
  Trash2,
} from "lucide-react";

interface AppSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenDocuments: () => void;
  model: string;
  models: string[];
  onModelChange: (model: string) => void;
}

export function AppSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onDeleteConversation,
  onOpenDocuments,
  model,
  models,
  onModelChange,
}: AppSidebarProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-4">
        <span className="text-lg font-bold tracking-tight">HeyRAG</span>
        <Select
          value={selectedProjectId || ""}
          onValueChange={onSelectProject}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir un projet" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarHeader>

      <SidebarContent>
        {selectedProjectId && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Conversations</SidebarGroupLabel>
              <SidebarGroupAction
                onClick={onNewConversation}
                title="Nouvelle conversation"
              >
                <Plus className="size-4" />
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {conversations.length === 0 && (
                    <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Aucune conversation
                    </p>
                  )}
                  {conversations.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        isActive={conv.id === activeConversationId}
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <MessageSquare className="size-4" />
                        <span className="truncate">{conv.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction>
                            <MoreHorizontal className="size-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right">
                          <DropdownMenuItem
                            onClick={() => onDeleteConversation(conv.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator />

            <SidebarGroup>
              <SidebarGroupLabel>Projet</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={onOpenDocuments}>
                      <FileText className="size-4" />
                      <span>Documents</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() =>
                        selectedProject && onEditProject(selectedProject)
                      }
                    >
                      <Settings className="size-4" />
                      <span>Parametres</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => onDeleteProject(selectedProjectId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      <span>Supprimer le projet</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Modele" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="w-full" onClick={onNewProject}>
          <Plus className="size-4 mr-2" />
          Nouveau projet
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
