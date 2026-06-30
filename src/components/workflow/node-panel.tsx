"use client";

import {
  Webhook,
  Play,
  Globe,
  Sparkles,
  Clock,
  Terminal,
} from "lucide-react";
import { NODE_DEFINITIONS, NodeDefinition } from "@/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  webhook: Webhook,
  play: Play,
  globe: Globe,
  sparkles: Sparkles,
  clock: Clock,
  terminal: Terminal,
};

interface NodePanelProps {
  onAddNode: (def: NodeDefinition) => void;
}

export function NodePanel({ onAddNode }: NodePanelProps) {
  const triggers = NODE_DEFINITIONS.filter((n) => n.category === "trigger");
  const actions = NODE_DEFINITIONS.filter((n) => n.category === "action");

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Triggers
        </p>
        <div className="flex flex-col gap-1">
          {triggers.map((def) => {
            const Icon = ICON_MAP[def.icon] ?? Terminal;
            return (
              <button
                key={def.type}
                onClick={() => onAddNode(def)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                )}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${def.color}20` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{def.label}</p>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {def.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Actions
        </p>
        <div className="flex flex-col gap-1">
          {actions.map((def) => {
            const Icon = ICON_MAP[def.icon] ?? Terminal;
            return (
              <button
                key={def.type}
                onClick={() => onAddNode(def)}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${def.color}20` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{def.label}</p>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {def.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
