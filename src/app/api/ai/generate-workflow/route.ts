import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { NODE_DEFINITIONS } from "@/types";
import { getNodeSchema } from "@/lib/node-schemas";

const client = new Anthropic();

function buildSystemPrompt(): string {
  const nodeDescriptions = NODE_DEFINITIONS.map((def) => {
    const schema = getNodeSchema(def.type);
    const fields = schema.fields.map((f) => {
      const parts = [`  - ${f.key} (${f.type})`];
      if (f.required) parts.push("required");
      if (f.description) parts.push(f.description);
      return parts.join(": ");
    });
    return [
      `### ${def.type}`,
      `Category: ${def.category}`,
      `Description: ${def.description}`,
      fields.length > 0 ? `Config fields:\n${fields.join("\n")}` : "Config fields: none",
    ].join("\n");
  }).join("\n\n");

  return `You are a workflow automation expert. Generate workflow definitions from natural language descriptions.

Available node types:
${nodeDescriptions}

Rules:
- A workflow must have exactly one trigger node (webhook-trigger or manual-trigger).
- All action nodes must be reachable from the trigger via edges.
- Use sequential edges to represent the execution order.
- Node IDs must be unique short strings (e.g. "n1", "n2", "n3").
- Labels should be concise and human-friendly.
- For config, use sensible defaults and reasonable placeholder values that match the user's description.
- Only use node types from the list above.`;
}

function assignPositions(
  rawNodes: Array<{ id: string; type: string }>,
  rawEdges: Array<{ source: string; target: string }>
): Record<string, { x: number; y: number }> {
  // BFS from the trigger to assign levels
  const adj = new Map<string, string[]>();
  for (const n of rawNodes) adj.set(n.id, []);
  for (const e of rawEdges) adj.get(e.source)?.push(e.target);

  const triggerTypes = new Set(
    NODE_DEFINITIONS.filter((d) => d.category === "trigger").map((d) => d.type)
  );
  const trigger = rawNodes.find((n) => triggerTypes.has(n.type as never));
  const startId = trigger?.id ?? rawNodes[0]?.id;

  const levels = new Map<string, number>();
  const queue: string[] = [];
  if (startId) {
    levels.set(startId, 0);
    queue.push(startId);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLevel = levels.get(curr) ?? 0;
    for (const neighbor of adj.get(curr) ?? []) {
      if (!levels.has(neighbor)) {
        levels.set(neighbor, currLevel + 1);
        queue.push(neighbor);
      }
    }
  }

  // Assign any unvisited nodes
  let maxLevel = Math.max(0, ...levels.values());
  for (const n of rawNodes) {
    if (!levels.has(n.id)) {
      levels.set(n.id, ++maxLevel);
    }
  }

  // Group by level to center vertically
  const byLevel = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(id);
  }

  const NODE_W = 280;
  const NODE_H = 180;
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [level, ids] of byLevel) {
    const totalH = ids.length * NODE_H;
    ids.forEach((id, i) => {
      positions[id] = {
        x: 100 + level * NODE_W,
        y: 80 + i * NODE_H - totalH / 2 + NODE_H / 2,
      };
    });
  }

  return positions;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const description: string = body?.description ?? "";

  if (!description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const generateWorkflowTool: Anthropic.Tool = {
    name: "generate_workflow",
    description: "Generate a workflow definition with nodes and edges",
    input_schema: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string" },
              label: { type: "string" },
              config: { type: "object" },
            },
            required: ["id", "type", "label", "config"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              source: { type: "string" },
              target: { type: "string" },
            },
            required: ["id", "source", "target"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
  };

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Generate a workflow for: ${description}`,
      },
    ],
    tools: [generateWorkflowTool],
    tool_choice: { type: "tool", name: "generate_workflow" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    return NextResponse.json({ error: "AI failed to generate a workflow" }, { status: 500 });
  }

  const generated = toolUse.input as {
    nodes: Array<{ id: string; type: string; label: string; config: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
  };

  const positions = assignPositions(generated.nodes, generated.edges);

  const nodes = generated.nodes.map((n) => ({
    ...n,
    position: positions[n.id] ?? { x: 100, y: 100 },
  }));

  return NextResponse.json({ nodes, edges: generated.edges });
}
