import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const executions = await db.execution.findMany({
    where: { workflow: { userId: session.user.id } },
    include: { workflow: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(executions);
}
