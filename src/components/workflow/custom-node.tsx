"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Webhook,
  Play,
  Globe,
  Sparkles,
  Clock,
  Terminal,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  "webhook-trigger": Webhook,
  "manual-trigger": Play,
  "http-request": Globe,
  openai: Sparkles,
  delay: Clock,
  log: Terminal,
};

const COLOR_MAP: Record<string, string> = {
  "webhook-trigger": "border-orange-500/50 bg-orange-500/10",
  "manual-trigger": "border-orange-400/50 bg-orange-400/10",
  "http-request": "border-sky-500/50 bg-sky-500/10",
  openai: "border-emerald-500/50 bg-emerald-500/10",
  delay: "border-amber-500/50 bg-amber-500/10",
  log: "border-zinc-500/50 bg-zinc-500/10",
};

const ICON_COLOR_MAP: Record<string, string> = {
  "webhook-trigger": "text-orange-400",
  "manual-trigger": "text-orange-300",
  "http-request": "text-sky-400",
  openai: "text-emerald-400",
  delay: "text-amber-400",
  log: "text-zinc-400",
};

const TRIGGER_TYPES = ["webhook-trigger", "manual-trigger"];

type DebugStatus = "pending" | "running" | "success" | "failed";

interface CustomNodeData {
  label: string;
  nodeType: string;
  isInvalid?: boolean;
  debugStatus?: DebugStatus;
  onDelete?: (id: string) => void;
}

const DEBUG_RING: Record<DebugStatus, string> = {
  pending: "ring-2 ring-zinc-600 ring-offset-2 ring-offset-zinc-950 opacity-50",
  running: "ring-2 ring-yellow-400 ring-offset-2 ring-offset-zinc-950 animate-pulse",
  success: "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950",
  failed: "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950",
};

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const Icon = ICON_MAP[nodeData.nodeType] ?? Terminal;
  const isTrigger = TRIGGER_TYPES.includes(nodeData.nodeType);
  const isInvalid = !!nodeData.isInvalid;
  const debugStatus = nodeData.debugStatus;

  return (
    <div
      className={cn(
        "relative min-w-45 rounded-xl border-2 p-4 transition-all shadow-lg",
        isInvalid
          ? "border-red-500/70 bg-red-500/5"
          : COLOR_MAP[nodeData.nodeType] ?? "border-zinc-700 bg-zinc-800",
        debugStatus
          ? DEBUG_RING[debugStatus]
          : selected && !isInvalid && "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-950",
        !debugStatus && selected && isInvalid && "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950"
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="h-3! w-3! border-2! border-zinc-700! bg-zinc-950!"
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isInvalid
              ? "bg-red-500/10"
              : COLOR_MAP[nodeData.nodeType]
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              isInvalid
                ? "text-red-400"
                : ICON_COLOR_MAP[nodeData.nodeType] ?? "text-zinc-400"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {nodeData.label}
          </p>
          <p className={cn("text-xs capitalize", isInvalid ? "text-red-400/70" : "text-zinc-400")}>
            {isTrigger ? "Trigger" : "Action"}
          </p>
        </div>
        {nodeData.onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDelete?.(id);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isInvalid && (
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
