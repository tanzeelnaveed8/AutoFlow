import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Execution, ExecutionLog } from "@prisma/client";
import {
  ChevronLeft,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDate, formatDuration, getStatusBg } from "@/lib/utils";

type ExecutionWithDetails = Execution & {
  workflow: { name: string; id: string; userId: string };
  logs: ExecutionLog[];
};

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const execution = (await db.execution.findUnique({
    where: { id },
    include: {
      workflow: { select: { name: true, id: true, userId: true } },
      logs: { orderBy: { startedAt: "asc" } },
    },
  })) as ExecutionWithDetails | null;

  if (!execution || execution.workflow.userId !== session.user.id) notFound();

  const StatusIcon =
    execution.status === "SUCCESS"
      ? CheckCircle
      : execution.status === "FAILED"
      ? XCircle
      : execution.status === "RUNNING"
      ? Loader2
      : AlertCircle;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/executions"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Executions
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-sm text-zinc-300">{execution.id.slice(0, 8)}...</span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/workflows/${execution.workflow.id}`}
              className="text-lg font-semibold text-white hover:text-orange-400 transition-colors"
            >
              {execution.workflow.name}
            </Link>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono">{execution.id}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border ${getStatusBg(execution.status)}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {execution.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="h-4 w-4" />
            <span>Started: {formatDate(execution.startedAt)}</span>
          </div>
          {execution.finishedAt && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="h-4 w-4" />
              <span>Finished: {formatDate(execution.finishedAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="h-4 w-4" />
            <span>Duration: {formatDuration(execution.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="capitalize">Trigger: {execution.trigger}</span>
          </div>
        </div>

        {execution.error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 p-3">
            <p className="text-sm font-medium text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error
            </p>
            <p className="mt-1 text-sm text-red-300 font-mono">{execution.error}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          Node Logs{" "}
          <span className="text-sm font-normal text-zinc-500">
            ({execution.logs.length} nodes)
          </span>
        </h2>
        <div className="flex flex-col gap-3">
          {execution.logs.map((log: ExecutionLog, i: number) => (
            <div
              key={log.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">
                      {log.nodeType.replace(/-/g, " ")}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">{log.nodeId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {formatDuration(
                      log.finishedAt
                        ? new Date(log.finishedAt).getTime() -
                            new Date(log.startedAt).getTime()
                        : null
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusBg(log.status)}`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>

              {log.error && (
                <div className="mt-3 rounded-lg bg-red-950/30 border border-red-800/50 p-2.5">
                  <p className="text-xs text-red-400 font-mono">{log.error}</p>
                </div>
              )}

              {(log.input || log.output) && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {log.input && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Input</p>
                      <pre className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-2.5 overflow-auto max-h-32 font-mono">
                        {JSON.stringify(log.input, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.output && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Output</p>
                      <pre className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-2.5 overflow-auto max-h-32 font-mono">
                        {JSON.stringify(log.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
