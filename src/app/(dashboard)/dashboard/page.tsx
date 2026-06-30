import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Workflow, Execution } from "@prisma/client";
import { Activity, Workflow as WorkflowIcon, CheckCircle, XCircle } from "lucide-react";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { CreateWorkflowDialog } from "@/components/dashboard/create-workflow-dialog";

type WorkflowWithCount = Workflow & { _count: { executions: number } };
type ExecutionWithWorkflow = Execution & { workflow: { name: string } };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [workflows, recentExecutions] = await Promise.all([
    db.workflow.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { executions: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.execution.findMany({
      where: { workflow: { userId: session.user.id } },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { workflow: { select: { name: true } } },
    }),
  ]);

  const totalRuns = (workflows as WorkflowWithCount[]).reduce(
    (sum: number, w: WorkflowWithCount) => sum + w._count.executions,
    0
  );
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const successRuns = (recentExecutions as ExecutionWithWorkflow[]).filter(
    (e: ExecutionWithWorkflow) => e.status === "SUCCESS"
  ).length;
  const failedRuns = (recentExecutions as ExecutionWithWorkflow[]).filter(
    (e: ExecutionWithWorkflow) => e.status === "FAILED"
  ).length;

  void totalRuns;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>
        <CreateWorkflowDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Workflows", value: workflows.length, icon: WorkflowIcon, color: "text-orange-400" },
          { label: "Active", value: activeWorkflows, icon: Activity, color: "text-emerald-400" },
          { label: "Successful Runs", value: successRuns, icon: CheckCircle, color: "text-blue-400" },
          { label: "Failed Runs", value: failedRuns, icon: XCircle, color: "text-red-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            All Workflows{" "}
            <span className="text-sm font-normal text-zinc-500">
              ({workflows.length})
            </span>
          </h2>
        </div>

        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-3">
              <WorkflowIcon className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="font-medium text-zinc-300">No workflows yet</p>
            <p className="text-sm text-zinc-500 mt-1">
              Create your first workflow to get started
            </p>
            <div className="mt-4">
              <CreateWorkflowDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(workflows as WorkflowWithCount[]).map((workflow: WorkflowWithCount) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </div>

      {recentExecutions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent Executions
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Workflow", "Status", "Trigger", "Started"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(recentExecutions as ExecutionWithWorkflow[]).map((exec: ExecutionWithWorkflow) => (
                  <tr key={exec.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-zinc-300">{exec.workflow.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          exec.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : exec.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {exec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">{exec.trigger}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(exec.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
