import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import type { NodeType, WorkflowNodeConfig } from "@/types";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const workflow = await db.workflow.findUnique({
    where: { id },
    include: { nodes: true, edges: true },
  });

  if (!workflow || workflow.userId !== session.user.id) notFound();

  const workflowData = {
    ...workflow,
    nodes: workflow.nodes.map((n) => ({
      id: n.id,
      type: n.type as NodeType,
      label: n.label,
      config: n.config as WorkflowNodeConfig,
      workflowId: n.workflowId,
      positionX: n.positionX,
      positionY: n.positionY,
    })),
    edges: workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      workflowId: e.workflowId,
    })),
  };

  return <WorkflowBuilder workflow={workflowData} />;
}
