"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

interface GeneratedNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
}

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (nodes: Node[], edges: Edge[]) => void;
}

const EXAMPLES = [
  "When a webhook is received, summarize the payload using OpenAI and log the result",
  "Manually trigger: make an HTTP POST request and delay 2 seconds before logging the response",
  "On webhook, use OpenAI to classify the data, then send an HTTP request with the result",
];

export function AiGenerateDialog({ open, onOpenChange, onApply }: AiGenerateDialogProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate workflow");
        return;
      }

      const rfNodes: Node[] = (data.nodes as GeneratedNode[]).map((n) => ({
        id: n.id,
        type: "custom",
        position: n.position,
        data: {
          label: n.label,
          nodeType: n.type,
          config: n.config ?? {},
          isInvalid: false,
        },
      }));

      const rfEdges: Edge[] = (data.edges as GeneratedEdge[]).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { stroke: "#ea580c", strokeWidth: 2 },
        animated: true,
      }));

      onApply(rfNodes, rfEdges);
      onOpenChange(false);
      setDescription("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            AI Workflow Builder
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Describe your workflow in plain English and Claude will build it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='e.g. "When a webhook is received, summarize the payload using OpenAI and log the result"'
            rows={4}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500">Try an example:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  className="text-left text-xs text-zinc-400 hover:text-violet-400 transition-colors truncate"
                >
                  → {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 rounded-md border border-red-900 bg-red-950/30 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="bg-violet-600 hover:bg-violet-500 gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
