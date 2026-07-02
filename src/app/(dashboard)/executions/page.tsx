import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Execution } from "@prisma/client";
import { History, Clock, ChevronRight, CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

type ExecutionWithWorkflow = Execution & {
  workflow: { name: string; id: string };
  _count: { logs: number };
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    SUCCESS: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2, label: "Success" },
    FAILED:  { cls: "bg-red-500/10 text-red-400 border-red-500/20",             Icon: XCircle,     label: "Failed"  },
    RUNNING: { cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",     Icon: Loader2,     label: "Running" },
    PENDING: { cls: "bg-zinc-800 text-zinc-500 border-zinc-700",                 Icon: Circle,      label: "Pending" },
  };
  const { cls, Icon, label } = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

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

  const successCount = executions.filter((e) => e.status === "SUCCESS").length;
  const failedCount = executions.filter((e) => e.status === "FAILED").length;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Execution History</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {executions.length} total
            {successCount > 0 && <span className="text-emerald-500"> · {successCount} succeeded</span>}
            {failedCount > 0 && <span className="text-red-500"> · {failedCount} failed</span>}
          </p>
        </div>
      </div>

      {executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60 mb-4">
            <History className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-base font-semibold text-white">No executions yet</p>
          <p className="text-sm text-zinc-500 mt-1">
            Run a workflow to see execution history here
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                {["Workflow", "Status", "Trigger", "Duration", "Nodes", "Started", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(executions as ExecutionWithWorkflow[]).map((exec) => (
                <tr key={exec.id} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/workflows/${exec.workflow.id}`}
                      className="font-medium text-zinc-200 hover:text-orange-400 transition-colors"
                    >
                      {exec.workflow.name}
                    </Link>
                    {exec.status === "FAILED" && exec.error && (
                      <p className="text-[11px] text-red-400/70 truncate max-w-xs mt-0.5">{exec.error}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={exec.status} />
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs capitalize">{exec.trigger}</td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-600" />
                      {formatDuration(exec.duration)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">{exec._count.logs} nodes</td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">{formatDate(exec.startedAt)}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/executions/${exec.id}`}
                      className="flex items-center gap-0.5 text-xs text-zinc-600 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Details <ChevronRight className="h-3 w-3" />
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
