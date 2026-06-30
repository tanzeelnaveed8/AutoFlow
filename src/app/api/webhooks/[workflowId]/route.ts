import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerWorkflow } from "@/services/workflow-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;

  const workflow = await db.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  if (!workflow.isActive) {
    return NextResponse.json({ error: "Workflow is not active" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const triggerData = {
    webhook: {
      body,
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method,
      url: req.url,
    },
  };

  try {
    const executionId = await triggerWorkflow(workflowId, "webhook", triggerData);
    return NextResponse.json({ executionId, status: "triggered" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  return POST(req, { params });
}
