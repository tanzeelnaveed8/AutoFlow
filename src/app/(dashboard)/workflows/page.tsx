import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Workflow } from "@prisma/client";
import { Workflow as WorkflowIcon } from "lucide-react";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { CreateWorkflowDialog } from "@/components/dashboard/create-workflow-dialog";

type WorkflowWithCount = Workflow & { _count: { executions: number } };

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workflows = await db.workflow.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { executions: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateWorkflowDialog />
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 mb-4">
            <WorkflowIcon className="h-6 w-6 text-zinc-500" />
          </div>
          <p className="text-lg font-medium text-zinc-300">No workflows yet</p>
          <p className="text-sm text-zinc-500 mt-1 mb-5">
            Create your first workflow to start automating
          </p>
          <CreateWorkflowDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(workflows as WorkflowWithCount[]).map((workflow: WorkflowWithCount) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
}
