"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session as typeof session & { user: { id: string } };
}

export async function createWorkflow(data: unknown) {
  const session = await getSession();
  const parsed = workflowSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const workflow = await db.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, workflow };
}

export async function updateWorkflow(id: string, data: unknown) {
  const session = await getSession();
  const parsed = workflowSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return { error: "Not found" };
  }

  const workflow = await db.workflow.update({
    where: { id },
    data: { name: parsed.data.name, description: parsed.data.description },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/workflows/${id}`);
  return { success: true, workflow };
}

export async function deleteWorkflow(id: string) {
  const session = await getSession();

  const existing = await db.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return { error: "Not found" };
  }

  await db.workflow.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function duplicateWorkflow(id: string) {
  const session = await getSession();

  const original = await db.workflow.findUnique({
    where: { id },
    include: { nodes: true, edges: true },
  });

  if (!original || original.userId !== session.user.id) {
    return { error: "Not found" };
  }

  const copy = await db.workflow.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      userId: session.user.id,
      nodes: {
        create: original.nodes.map((n) => ({
          type: n.type,
          label: n.label,
          positionX: n.positionX,
          positionY: n.positionY,
          config: n.config as object,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  return { success: true, workflow: copy };
}

export async function toggleWorkflowActive(id: string) {
  const session = await getSession();

  const existing = await db.workflow.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return { error: "Not found" };
  }

  const workflow = await db.workflow.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/dashboard");
  return { success: true, isActive: workflow.isActive };
}

export async function saveWorkflowGraph(
  workflowId: string,
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    positionX: number;
    positionY: number;
    config: object;
  }>,
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>
) {
  const session = await getSession();

  const workflow = await db.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.userId !== session.user.id) {
    return { error: "Not found" };
  }

  await db.$transaction([
    db.workflowNode.deleteMany({ where: { workflowId } }),
    db.workflowEdge.deleteMany({ where: { workflowId } }),
    db.workflowNode.createMany({
      data: nodes.map((n) => ({
        id: n.id,
        workflowId,
        type: n.type,
        label: n.label,
        positionX: n.positionX,
        positionY: n.positionY,
        config: n.config,
      })),
    }),
    db.workflowEdge.createMany({
      data: edges.map((e) => ({
        id: e.id,
        workflowId,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    }),
  ]);

  revalidatePath(`/workflows/${workflowId}`);
  return { success: true };
}
