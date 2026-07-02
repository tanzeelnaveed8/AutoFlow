"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal, Play, Edit2, Copy, Trash2,
  CheckCircle2, XCircle, Clock, Activity, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteWorkflow, duplicateWorkflow, toggleWorkflowActive } from "@/actions/workflows";

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    updatedAt: Date;
    _count: { executions: number };
    executions: Array<{ status: string; startedAt: Date }>;
  };
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const lastExec = workflow.executions[0];

  async function handleDelete() {
    if (!confirm(`Delete "${workflow.name}"? This cannot be undone.`)) return;
    setLoading("delete");
    await deleteWorkflow(workflow.id);
    router.refresh();
    setLoading(null);
  }

  async function handleDuplicate() {
    setLoading("duplicate");
    await duplicateWorkflow(workflow.id);
    router.refresh();
    setLoading(null);
  }

  async function handleToggleActive() {
    setLoading("toggle");
    await toggleWorkflowActive(workflow.id);
    router.refresh();
    setLoading(null);
  }

  async function handleRun() {
    setLoading("run");
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/execute`, { method: "POST" });
      const data = await res.json() as { executionId?: string };
      if (data.executionId) router.push(`/executions/${data.executionId}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 transition-all duration-150 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20">
      {/* Card body */}
      <div className="flex-1 p-5">
        {/* Top row: status toggle + actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={handleToggleActive}
            disabled={loading === "toggle"}
            className="group/toggle flex items-center gap-1.5 text-[11px] font-medium transition-colors"
          >
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors ${
                workflow.isActive ? "bg-orange-500 border-orange-500" : "bg-zinc-800 border-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  workflow.isActive ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            <span className={workflow.isActive ? "text-orange-400" : "text-zinc-600"}>
              {loading === "toggle" ? "Saving…" : workflow.isActive ? "Active" : "Inactive"}
            </span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRun}
              disabled={!!loading}
              title="Run now"
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-orange-500/15 hover:text-orange-400 transition-colors disabled:opacity-40"
            >
              {loading === "run" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!!loading}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} disabled={loading === "duplicate"}>
                  {loading === "duplicate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={loading === "delete"}
                  className="text-red-400 focus:text-red-400 focus:bg-red-950/30"
                >
                  {loading === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Name + description */}
        <Link href={`/workflows/${workflow.id}`} className="block group/link">
          <h3 className="font-semibold text-white group-hover/link:text-orange-400 transition-colors line-clamp-1 text-sm">
            {workflow.name}
          </h3>
          {workflow.description ? (
            <p className="mt-1 text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">
              {workflow.description}
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-zinc-700 italic">No description</p>
          )}
        </Link>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-800/60 px-5 py-3">
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {workflow._count.executions} runs
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelative(workflow.updatedAt)}
          </span>
        </div>

        {lastExec ? (
          <span
            className={`flex items-center gap-1 text-[10px] font-medium ${
              lastExec.status === "SUCCESS" ? "text-emerald-400" :
              lastExec.status === "FAILED" ? "text-red-400" :
              "text-zinc-500"
            }`}
          >
            {lastExec.status === "SUCCESS" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : lastExec.status === "FAILED" ? (
              <XCircle className="h-3 w-3" />
            ) : null}
            {lastExec.status === "SUCCESS" ? "Last run OK" :
             lastExec.status === "FAILED" ? "Last run failed" :
             lastExec.status}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-700">Never run</span>
        )}
      </div>
    </div>
  );
}
