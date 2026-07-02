"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  Wand2,
  Bell,
  FileSpreadsheet,
  CalendarClock,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface Example {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  prompt: string;
}

const EXAMPLES: Example[] = [
  {
    icon: Bell,
    iconColor: "#a0aec0",
    label: "GitHub Issue to Slack",
    prompt:
      "When a webhook is received with a GitHub issue payload, use Claude to summarize the issue and send a Slack message to #dev-alerts",
  },
  {
    icon: FileSpreadsheet,
    iconColor: "#34a853",
    label: "Form submission to Sheets and Email",
    prompt:
      "When a webhook form submission arrives, add the data as a row in Google Sheets and send a confirmation Gmail to the submitter",
  },
  {
    icon: CalendarClock,
    iconColor: "#d97706",
    label: "Daily AI digest via schedule",
    prompt:
      "On a schedule every morning, fetch data from an HTTP endpoint, use Claude to write a daily digest, then email it with Gmail",
  },
  {
    icon: Webhook,
    iconColor: "#a8a8a8",
    label: "Webhook to Notion task",
    prompt:
      "When a webhook is received, use OpenAI to extract the key details and create a new Notion page in my tasks database",
  },
];

const PLATFORMS = [
  { label: "Gmail", color: "#ea4335" },
  { label: "Slack", color: "#9b59d0" },
  { label: "GitHub", color: "#a0aec0" },
  { label: "Notion", color: "#a8a8a8" },
  { label: "Sheets", color: "#34a853" },
  { label: "Discord", color: "#5865f2" },
  { label: "Claude", color: "#d97706" },
  { label: "OpenAI", color: "#10b981" },
  { label: "HTTP", color: "#0ea5e9" },
  { label: "Filter", color: "#8b5cf6" },
];

export function AiGenerateDialog({ open, onOpenChange, onApply }: AiGenerateDialogProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleGenerate() {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await res.json() as {
        nodes?: GeneratedNode[];
        edges?: GeneratedEdge[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Failed to generate workflow");
        return;
      }

      const rfNodes: Node[] = (data.nodes ?? []).map((n) => ({
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

      const rfEdges: Edge[] = (data.edges ?? []).map((e) => ({
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

  function handleClose() {
    if (loading) return;
    onOpenChange(false);
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-0 text-white sm:max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="relative overflow-hidden border-b border-zinc-800 px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-950/60 via-zinc-950 to-zinc-950" />
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-orange-600/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600/20 ring-1 ring-orange-500/30">
              <Wand2 className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                AI Workflow Builder
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Describe your automation in plain English and Claude builds it for you
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "When a webhook arrives, use Claude to summarize the payload and post the result to Slack"'
              rows={4}
              disabled={loading}
              className={cn(
                "w-full resize-none rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600",
                "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50",
                "transition-all duration-150 disabled:opacity-50",
                error
                  ? "border-red-800 bg-red-950/20"
                  : "border-zinc-800 hover:border-zinc-700"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-700 pointer-events-none">
              Ctrl+Enter to generate
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Available platforms */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Available platforms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    borderColor: `${p.color}30`,
                    backgroundColor: `${p.color}10`,
                    color: p.color,
                  }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Example workflows */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Example prompts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <button
                    key={ex.label}
                    onClick={() => setDescription(ex.prompt)}
                    disabled={loading}
                    className={cn(
                      "group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left",
                      "hover:border-orange-700/40 hover:bg-orange-950/20 transition-all duration-150",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${ex.iconColor}18` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: ex.iconColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                        {ex.label}
                      </p>
                      <p className="text-[10px] text-zinc-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {ex.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-800/40 bg-orange-950/20 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-300">Claude is thinking</p>
                <p className="text-[10px] text-orange-500/70 mt-0.5">
                  Designing nodes, connections and configuration
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className={cn(
                  "gap-2 bg-orange-600 hover:bg-orange-500 text-white font-medium",
                  "disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {loading ? "Generating" : "Generate Workflow"}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
