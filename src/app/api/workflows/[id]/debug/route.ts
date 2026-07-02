import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeNodeStandalone } from "@/services/workflow-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await db.workflow.findUnique({ where: { id } });
  if (!workflow || workflow.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { nodeType, config, input } = body as {
    nodeType: string;
    config: Record<string, unknown>;
    input: Record<string, unknown>;
  };

  try {
    const output = await executeNodeStandalone(nodeType, config, input ?? {}, { userId: session.user.id });
    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
