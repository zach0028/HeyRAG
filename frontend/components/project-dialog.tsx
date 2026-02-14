"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Project } from "@/lib/api";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSubmit: (name: string, systemPrompt: string) => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setSystemPrompt(project.system_prompt);
    } else {
      setName("");
      setSystemPrompt("");
    }
  }, [project, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), systemPrompt.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nom</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon projet RAG"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Instruction systeme</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Tu es un assistant qui repond aux questions en se basant sur les documents fournis..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {project ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
