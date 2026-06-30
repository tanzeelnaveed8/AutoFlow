"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Play,
  Edit2,
  Copy,
  Trash2,
  Workflow,
  Calendar,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteWorkflow, duplicateWorkflow, toggleWorkflowActive } from "@/actions/workflows";
import { formatDate } from "@/lib/utils";

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    updatedAt: Date;
    _count: { executions: number };
  };
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    setLoading(true);
    await deleteWorkflow(workflow.id);
    router.refresh();
    setLoading(false);
  }

  async function handleDuplicate() {
    setLoading(true);
    await duplicateWorkflow(workflow.id);
    router.refresh();
    setLoading(false);
  }

  async function handleToggleActive() {
    setLoading(true);
    await toggleWorkflowActive(workflow.id);
    router.refresh();
    setLoading(false);
  }

  async function handleRun() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.executionId) {
        router.push(`/executions`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600/15">
            <Workflow className="h-4 w-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/workflows/${workflow.id}`}
              className="font-semibold text-white hover:text-orange-400 transition-colors line-clamp-1"
            >
              {workflow.name}
            </Link>
            {workflow.description && (
              <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">
                {workflow.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={workflow.isActive ? "success" : "secondary"}
            className="cursor-pointer"
            onClick={handleToggleActive}
          >
            {workflow.isActive ? "Active" : "Inactive"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                <Edit2 className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRun}>
                <Play className="h-4 w-4" />
                Run now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400 focus:text-red-400 focus:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {workflow._count.executions} runs
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(workflow.updatedAt)}
        </span>
      </div>
    </div>
  );
}
