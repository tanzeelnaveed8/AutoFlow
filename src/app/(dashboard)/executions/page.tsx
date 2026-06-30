import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Execution } from "@prisma/client";
import { History, ChevronRight, Clock } from "lucide-react";
import { formatDate, formatDuration, getStatusBg } from "@/lib/utils";

type ExecutionWithWorkflow = Execution & {
  workflow: { name: string; id: string };
  _count: { logs: number };
};

export default async function ExecutionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const executions = await db.execution.findMany({
    where: { workflow: { userId: session.user.id } },
    include: {
      workflow: { select: { name: true, id: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Execution History</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {executions.length} total executions
        </p>
      </div>

      {executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 mb-4">
            <History className="h-6 w-6 text-zinc-500" />
          </div>
          <p className="text-lg font-medium text-zinc-300">No executions yet</p>
          <p className="text-sm text-zinc-500 mt-1">
            Run a workflow to see execution history here
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Workflow", "Status", "Trigger", "Duration", "Logs", "Started", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(executions as ExecutionWithWorkflow[]).map((exec: ExecutionWithWorkflow) => (
                <tr
                  key={exec.id}
                  className="group hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/workflows/${exec.workflow.id}`}
                      className="font-medium text-zinc-300 hover:text-orange-400 transition-colors"
                    >
                      {exec.workflow.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusBg(exec.status)}`}
                    >
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 capitalize">{exec.trigger}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(exec.duration)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{exec._count.logs} nodes</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(exec.startedAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/executions/${exec.id}`}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Details
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
