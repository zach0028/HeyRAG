"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PanelRightClose, PanelRightOpen, Save } from "lucide-react";
import { Project } from "@/lib/api";

interface Options {
  temperature: number;
  num_ctx: number;
  top_p: number;
  repeat_penalty: number;
}

interface SettingsSidebarProps {
  open: boolean;
  onToggle: () => void;
  project: Project | null;
  onSystemPromptChange: (prompt: string) => Promise<void>;
  options: Options;
  maxCtx: number;
  onOptionsChange: (options: Options) => void;
}

export function SettingsSidebar({
  open,
  onToggle,
  project,
  onSystemPromptChange,
  options,
  maxCtx,
  onOptionsChange,
}: SettingsSidebarProps) {
  const [draftPrompt, setDraftPrompt] = useState(project?.system_prompt ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftPrompt(project?.system_prompt ?? "");
  }, [project?.id, project?.system_prompt]);

  const promptChanged = draftPrompt !== (project?.system_prompt ?? "");

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      await onSystemPromptChange(draftPrompt);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="border-l bg-sidebar shrink-0 h-dvh flex flex-col items-center pt-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={onToggle}>
          <PanelRightOpen className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 border-l bg-sidebar shrink-0 h-dvh flex flex-col">
      <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
        <span className="font-semibold text-sm">Paramètres</span>
        <Button variant="ghost" size="icon" className="size-8" onClick={onToggle}>
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {project && (
          <div className="space-y-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Instruction système
            </h3>
            <Separator />
            <Textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder="Ex: Tu es un assistant spécialisé en..."
              className="min-h-[100px] text-sm resize-none"
              rows={5}
            />
            {promptChanged && (
              <Button
                size="sm"
                className="w-full"
                onClick={handleSavePrompt}
                disabled={saving}
              >
                <Save className="size-3.5 mr-2" />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Génération
          </h3>
          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Température</Label>
              <span className="text-sm text-muted-foreground tabular-nums font-mono">
                {options.temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[options.temperature]}
              onValueChange={([v]) =>
                onOptionsChange({ ...options, temperature: v })
              }
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Créativité des réponses. Bas = précis, haut = créatif.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Top P</Label>
              <span className="text-sm text-muted-foreground tabular-nums font-mono">
                {options.top_p.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[options.top_p]}
              onValueChange={([v]) =>
                onOptionsChange({ ...options, top_p: v })
              }
              min={0}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">
              Diversité du vocabulaire. 0.9 = équilibré, 1.0 = tout le vocabulaire.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Répétition</Label>
              <span className="text-sm text-muted-foreground tabular-nums font-mono">
                {options.repeat_penalty.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[options.repeat_penalty]}
              onValueChange={([v]) =>
                onOptionsChange({ ...options, repeat_penalty: v })
              }
              min={0.5}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Pénalité de répétition. Plus haut = évite les redites.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Contexte</Label>
              <span className="text-sm text-muted-foreground tabular-nums font-mono">
                {options.num_ctx.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[options.num_ctx]}
              onValueChange={([v]) =>
                onOptionsChange({ ...options, num_ctx: v })
              }
              min={1024}
              max={maxCtx}
              step={1024}
            />
            <p className="text-xs text-muted-foreground">
              Fenêtre de tokens que le modèle peut traiter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
