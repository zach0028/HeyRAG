"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  uploadDocument,
  fetchDocuments,
  deleteDocument,
  DocumentInfo,
} from "@/lib/api";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";

interface DocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function DocumentDialog({
  open,
  onOpenChange,
  projectId,
}: DocumentDialogProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && projectId) {
      fetchDocuments(projectId)
        .then(setDocuments)
        .catch(() => {});
    }
  }, [open, projectId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, projectId);
      }
      const updated = await fetchDocuments(projectId);
      setDocuments(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId, projectId);
      setDocuments((prev) =>
        prev.filter((d) => d.document_id !== documentId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Documents</DialogTitle>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Upload en cours...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Glisse tes fichiers ici ou clique pour selectionner
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, TXT, MD (max 50 Mo)
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {documents.length > 0 && (
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{doc.filename}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc.document_id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
