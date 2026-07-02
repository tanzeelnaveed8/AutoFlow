import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Workflow } from "@prisma/client";
import Image from "next/image";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { CreateWorkflowDialog } from "@/components/dashboard/create-workflow-dialog";

type WorkflowWithMeta = Workflow & {
  _count: { executions: number };
  executions: Array<{ status: string; startedAt: Date }>;
};

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workflows = await db.workflow.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { executions: true } },
      executions: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true, startedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Workflows</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
            {workflows.filter((w) => w.isActive).length > 0 &&
              ` · ${workflows.filter((w) => w.isActive).length} active`}
          </p>
        </div>
        <CreateWorkflowDialog />
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="mb-4">
            <Image src="/logoo.png" alt="AutoFlow" width={48} height={48} className="opacity-80" />
          </div>
          <p className="text-base font-semibold text-white">No workflows yet</p>
          <p className="text-sm text-zinc-500 mt-1 mb-5 max-w-xs">
            Build your first automation by connecting triggers and actions
          </p>
          <CreateWorkflowDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(workflows as WorkflowWithMeta[]).map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  );
}
