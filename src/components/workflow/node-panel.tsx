"use client";

import { useState, useMemo } from "react";
import {
  Webhook, Play, Globe, Sparkles, Clock, Terminal, Search,
  Filter, Code2, Mail, MessageSquare, GitBranch, GitMerge,
  Database, Octagon, Braces, Calendar, Calculator,
  Fingerprint, Hash, Type,
} from "lucide-react";
import {
  SiGmail,
  SiDiscord,
  SiNotion,
  SiGithub,
  SiGooglesheets,
} from "react-icons/si";
import { NODE_DEFINITIONS, NodeDefinition } from "@/types";
import { cn } from "@/lib/utils";

// ── Brand icons ──────────────────────────────────────────────────────────────

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
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  );
}

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.378-3.56h5.038l-1.396-3.4H6.44l2.088-5.52 1.645 4.24V3.52z"/>
    </svg>
  );
}

// ── Icon resolver ────────────────────────────────────────────────────────────

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

function NodeIcon({
  icon,
  color,
  bgColor,
}: {
  icon: string;
  color: string;
  bgColor: string;
}) {
  const Icon = ICON_COMPONENTS[icon] ?? Terminal;
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: bgColor }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
    </div>
  );
}

// ── Node Panel ───────────────────────────────────────────────────────────────

interface NodePanelProps {
  onAddNode: (def: NodeDefinition) => void;
}

const GROUP_ORDER = [
  "Triggers",
  "AI",
  "Logic",
  "Data",
  "Developer",
  "GitHub",
  "Gmail",
  "Slack",
  "Discord",
  "Notion",
  "Google Sheets",
];

export function NodePanel({ onAddNode }: NodePanelProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return NODE_DEFINITIONS;
    const q = query.toLowerCase();
    return NODE_DEFINITIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, NodeDefinition[]>();
    for (const def of filtered) {
      if (!map.has(def.group)) map.set(def.group, []);
      map.get(def.group)!.push(def);
    }
    const result: Array<{ group: string; defs: NodeDefinition[] }> = [];
    for (const g of GROUP_ORDER) {
      if (map.has(g)) result.push({ group: g, defs: map.get(g)! });
    }
    // catch any groups not in GROUP_ORDER
    for (const [g, defs] of map) {
      if (!GROUP_ORDER.includes(g)) result.push({ group: g, defs });
    }
    return result;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 && (
          <p className="p-4 text-xs text-zinc-600 text-center">No nodes found</p>
        )}
        {grouped.map(({ group, defs }) => (
          <div key={group}>
            <p className="sticky top-0 z-10 bg-zinc-950 px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-900">
              {group}
            </p>
            <div className="flex flex-col py-1">
              {defs.map((def) => (
                <button
                  key={def.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", def.type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAddNode(def)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    "hover:bg-zinc-800/60"
                  )}
                >
                  <NodeIcon icon={def.icon} color={def.color} bgColor={def.bgColor} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white leading-tight truncate">
                      {def.label}
                    </p>
                    <p className="text-[10px] text-zinc-600 line-clamp-1 mt-0.5">
                      {def.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="border-t border-zinc-900 p-2.5">
        <p className="text-[10px] text-zinc-700 text-center">
          Click or drag to add · {NODE_DEFINITIONS.length} nodes
        </p>
      </div>
    </div>
  );
}
