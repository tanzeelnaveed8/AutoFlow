import { db } from "@/lib/db";
import type { WorkflowNode, WorkflowEdge } from "@prisma/client";
import { WorkflowNodeConfig, WorkflowNodeData, WorkflowEdgeData } from "@/types";

type NodeOutput = Record<string, unknown>;

export class WorkflowEngine {
  private executionId: string;

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  async execute(
    nodes: WorkflowNodeData[],
    edges: WorkflowEdgeData[],
    triggerData?: unknown
  ) {
    await db.execution.update({
      where: { id: this.executionId },
      data: { status: "RUNNING" },
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const executionOrder = this.topologicalSort(nodes, edges);
    const outputs: Map<string, NodeOutput> = new Map();

    try {
      for (const nodeId of executionOrder) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const incomingEdges = edges.filter((e) => e.target === nodeId);
        const inputData: NodeOutput = {};

        for (const edge of incomingEdges) {
          const sourceOutput = outputs.get(edge.source);
          if (sourceOutput) {
            Object.assign(inputData, sourceOutput);
          }
        }

        if (node.type === "webhook-trigger" || node.type === "manual-trigger") {
          Object.assign(inputData, triggerData ?? {});
        }

        const logEntry = await db.executionLog.create({
          data: {
            executionId: this.executionId,
            nodeId: node.id,
            nodeType: node.type,
            status: "RUNNING",
            input: inputData as unknown as import("@prisma/client").Prisma.InputJsonValue,
          },
        });

        try {
          const output = await this.executeNode(node, inputData);
          outputs.set(nodeId, output);

          await db.executionLog.update({
            where: { id: logEntry.id },
            data: {
              status: "SUCCESS",
              output: output as unknown as import("@prisma/client").Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
        } catch (nodeError) {
          const errMsg =
            nodeError instanceof Error ? nodeError.message : String(nodeError);

          await db.executionLog.update({
            where: { id: logEntry.id },
            data: {
              status: "FAILED",
              error: errMsg,
              finishedAt: new Date(),
            },
          });

          throw new Error(`Node "${node.label}" failed: ${errMsg}`);
        }
      }

      const finishedAt = new Date();
      const startedAt = (
        await db.execution.findUnique({ where: { id: this.executionId } })
      )?.startedAt;

      await db.execution.update({
        where: { id: this.executionId },
        data: {
          status: "SUCCESS",
          finishedAt,
          duration: startedAt
            ? finishedAt.getTime() - startedAt.getTime()
            : null,
        },
      });
    } catch (error) {
      const finishedAt = new Date();
      const startedAt = (
        await db.execution.findUnique({ where: { id: this.executionId } })
      )?.startedAt;

      await db.execution.update({
        where: { id: this.executionId },
        data: {
          status: "FAILED",
          finishedAt,
          duration: startedAt
            ? finishedAt.getTime() - startedAt.getTime()
            : null,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private async executeNode(
    node: WorkflowNodeData,
    input: NodeOutput
  ): Promise<NodeOutput> {
    const config = node.config;

    switch (node.type) {
      case "manual-trigger":
      case "webhook-trigger":
        return { trigger: node.type, data: input };

      case "http-request": {
        const url = config.url;
        if (!url) throw new Error("URL is required");

        const method = config.method ?? "GET";
        const headers: Record<string, string> = config.headers ?? {};

        let body: string | undefined;
        if (config.body && method !== "GET") {
          body = this.interpolate(config.body, input);
        }

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body,
        });

        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        return { status: res.status, statusText: res.statusText, data };
      }

      case "openai": {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

        const prompt = this.interpolate(config.prompt ?? "", input);
        const systemPrompt = config.systemPrompt ?? "You are a helpful assistant.";
        const model = config.model ?? "gpt-4o-mini";

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`OpenAI error: ${err}`);
        }

        const result = (await res.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        return { content: result.choices[0]?.message?.content ?? "" };
      }

      case "delay": {
        const ms = config.delayMs ?? 1000;
        await new Promise((r) => setTimeout(r, ms));
        return { delayed: true, ms };
      }

      case "log": {
        const message = this.interpolate(
          config.message ?? "Log node executed",
          input
        );
        console.log(`[Execution ${this.executionId}] ${message}`, input);
        return { logged: true, message, input };
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private interpolate(template: string, data: NodeOutput): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
      const keys = key.split(".");
      let value: unknown = data;
      for (const k of keys) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[k];
        } else {
          value = undefined;
          break;
        }
      }
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }

  private topologicalSort(
    nodes: WorkflowNodeData[],
    edges: WorkflowEdgeData[]
  ): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      adjList.get(edge.source)?.push(edge.target);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      for (const neighbor of adjList.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return order;
  }
}

export async function triggerWorkflow(
  workflowId: string,
  trigger: string,
  triggerData?: unknown
) {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) throw new Error("Workflow not found");

  const execution = await db.execution.create({
    data: { workflowId, status: "PENDING", trigger },
  });

  const nodes: WorkflowNodeData[] = (workflow.nodes as WorkflowNode[]).map((n) => ({
    id: n.id,
    type: n.type as WorkflowNodeData["type"],
    label: n.label,
    config: n.config as WorkflowNodeConfig,
    workflowId: n.workflowId,
    positionX: n.positionX,
    positionY: n.positionY,
  }));

  const edges: WorkflowEdgeData[] = (workflow.edges as WorkflowEdge[]).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    workflowId: e.workflowId,
  }));

  const engine = new WorkflowEngine(execution.id);
  await engine.execute(nodes, edges, triggerData);

  return execution.id;
}
