"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Webhook, Play, Globe, Sparkles, Clock, Terminal, Trash2, AlertCircle,
  Filter, Code2, Mail, MessageSquare, GitBranch, GitMerge,
  Database, Octagon, Braces, Calendar, Calculator, Fingerprint, Hash, Type,
} from "lucide-react";
import {
  SiGmail,
  SiDiscord,
  SiNotion,
  SiGithub,
  SiGooglesheets,
} from "react-icons/si";
import { cn } from "@/lib/utils";
import { NODE_DEFINITIONS } from "@/types";

// ── Inline brand icons (not in react-icons v5) ───────────────────────────────

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

function OpenAiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.378-3.56h5.038l-1.396-3.4H6.44l2.088-5.52 1.645 4.24V3.52z" />
    </svg>
  );
}

// ── Icon component map (icon string → React component) ───────────────────────

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  webhook: Webhook,
  play: Play,
  globe: Globe,
  sparkles: Sparkles,
  clock: Clock,
  terminal: Terminal,
  filter: Filter,
  code: Code2,
  mail: Mail,
  message: MessageSquare,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  database: Database,
  octagon: Octagon,
  braces: Braces,
  calendar: Calendar,
  calculator: Calculator,
  fingerprint: Fingerprint,
  binary: Code2,
  hash: Hash,
  type: Type,
  gmail: SiGmail,
  slack: SlackIcon,
  discord: SiDiscord,
  notion: SiNotion,
  github: SiGithub,
  sheets: SiGooglesheets,
  googlesheets: SiGooglesheets,
  openai: OpenAiIcon,
  anthropic: AnthropicIcon,
};

// ── Derived lookup maps from NODE_DEFINITIONS ────────────────────────────────

const DEF_MAP = new Map(NODE_DEFINITIONS.map((d) => [d.type, d]));

const TRIGGER_TYPES = new Set(
  NODE_DEFINITIONS.filter((d) => d.category === "trigger").map((d) => d.type)
);

// ── Debug ring styles ─────────────────────────────────────────────────────────

type DebugStatus = "pending" | "running" | "success" | "failed";

const DEBUG_RING: Record<DebugStatus, string> = {
  pending: "ring-2 ring-zinc-600 ring-offset-2 ring-offset-zinc-950 opacity-50",
  running: "ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 animate-pulse",
  success: "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950",
  failed: "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950",
};

// ── Component ────────────────────────────────────────────────────────────────

interface CustomNodeData {
  label: string;
  nodeType: string;
  isInvalid?: boolean;
  debugStatus?: DebugStatus;
  onDelete?: (id: string) => void;
}

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const def = DEF_MAP.get(nodeData.nodeType);

  const Icon = ICON_COMPONENTS[def?.icon ?? ""] ?? Terminal;
  const color = def?.color ?? "#71717a";
  const bgColor = def?.bgColor ?? "#18181b";
  const isTrigger = TRIGGER_TYPES.has(nodeData.nodeType);
  const isInvalid = !!nodeData.isInvalid;
  const debugStatus = nodeData.debugStatus;

  return (
    <div
      className={cn(
        "group relative min-w-45 rounded-xl border-2 p-3.5 transition-all shadow-lg",
        isInvalid
          ? "border-red-500/70 bg-red-500/5"
          : "border-zinc-800 bg-zinc-900",
        debugStatus
          ? DEBUG_RING[debugStatus]
          : selected && !isInvalid
          ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-950"
          : selected && isInvalid
          ? "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950"
          : ""
      )}
      style={
        !isInvalid
          ? {
              borderColor: `${color}40`,
              backgroundColor: `${bgColor}cc`,
            }
          : undefined
      }
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="h-3! w-3! border-2! border-zinc-700! bg-zinc-950!"
        />
      )}

      <div className="flex items-center gap-2.5">
        {/* Icon badge */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, border: `1px solid ${color}30` }}
        >
          {isInvalid ? (
            <AlertCircle className="h-4 w-4 text-red-400" />
          ) : (
            <Icon className="h-4 w-4" style={{ color }} />
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {nodeData.label}
          </p>
          <p className={cn("text-[10px] mt-0.5 truncate", isInvalid ? "text-red-400/70" : "text-zinc-500")}>
            {def?.group ?? (isTrigger ? "Trigger" : "Action")}
          </p>
        </div>

        {/* Delete button */}
        {nodeData.onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDelete?.(id);
            }}
            className="ml-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Trigger badge */}
      {isTrigger && (
        <div
          className="absolute -top-2 left-3 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: bgColor, color, border: `1px solid ${color}50` }}
        >
          trigger
        </div>
      )}

      {/* Invalid badge */}
      {isInvalid && !debugStatus && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-md">
          <AlertCircle className="h-3 w-3 text-white" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="h-3! w-3! border-2! border-zinc-700! bg-zinc-950!"
      />
    </div>
  );
});

CustomNode.displayName = "CustomNode";
