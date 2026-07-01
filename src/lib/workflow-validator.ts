import { NODE_DEFINITIONS } from "@/types";
import { getNodeSchema } from "@/lib/node-schemas";

export type ValidationErrorType =
  | "NO_TRIGGER"
  | "MULTIPLE_TRIGGERS"
  | "CYCLE"
  | "DISCONNECTED"
  | "ORPHAN"
  | "INVALID_EDGE"
  | "MISSING_CONFIG";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  nodeIds: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  invalidNodeIds: Set<string>;
}

interface ValidatorNode {
  id: string;
  nodeType: string;
  config: Record<string, unknown>;
}

interface ValidatorEdge {
  id: string;
  source: string;
  target: string;
}

const TRIGGER_TYPES: Set<string> = new Set(
  NODE_DEFINITIONS.filter((d) => d.category === "trigger").map((d) => d.type)
);

export function validateWorkflow(
  nodes: ValidatorNode[],
  edges: ValidatorEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const invalidNodeIds = new Set<string>();

  const nodeIds = new Set(nodes.map((n) => n.id));

  // 1. Invalid edges — reference nodes that don't exist
  const badEdges = edges.filter(
    (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );
  if (badEdges.length > 0) {
    errors.push({
      type: "INVALID_EDGE",
      message: `${badEdges.length} edge${badEdges.length > 1 ? "s reference" : " references"} a node that no longer exists.`,
      nodeIds: [],
    });
  }

  // Work only with valid edges from here on
  const validEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  // 2. Trigger count
  const triggers = nodes.filter((n) => TRIGGER_TYPES.has(n.nodeType));

  if (triggers.length === 0) {
    errors.push({
      type: "NO_TRIGGER",
      message: "Workflow has no trigger. Add a Webhook Trigger or Manual Trigger to start the flow.",
      nodeIds: [],
    });
  } else if (triggers.length > 1) {
    const ids = triggers.map((t) => t.id);
    ids.forEach((id) => invalidNodeIds.add(id));
    errors.push({
      type: "MULTIPLE_TRIGGERS",
      message: `Workflow has ${triggers.length} trigger nodes. Only one trigger is allowed.`,
      nodeIds: ids,
    });
  }

  // 3. Orphan nodes — nodes with no edges at all
  const connectedToAnyEdge = new Set<string>();
  for (const e of validEdges) {
    connectedToAnyEdge.add(e.source);
    connectedToAnyEdge.add(e.target);
  }

  const orphans = nodes.filter(
    (n) => !connectedToAnyEdge.has(n.id) && nodes.length > 1
  );
  if (orphans.length > 0) {
    const ids = orphans.map((n) => n.id);
    ids.forEach((id) => invalidNodeIds.add(id));
    errors.push({
      type: "ORPHAN",
      message: `${ids.length} node${ids.length > 1 ? "s are" : " is"} isolated with no connections.`,
      nodeIds: ids,
    });
  }

  // 4. Cycles — Kahn's topological sort; nodes not visited are in a cycle
  const cycleNodeIds = findCycleNodes(nodes, validEdges);
  if (cycleNodeIds.length > 0) {
    cycleNodeIds.forEach((id) => invalidNodeIds.add(id));
    errors.push({
      type: "CYCLE",
      message: `Circular dependency detected. ${cycleNodeIds.length} node${cycleNodeIds.length > 1 ? "s are" : " is"} part of a cycle.`,
      nodeIds: cycleNodeIds,
    });
  }

  // 5. Disconnected nodes — not reachable from the trigger (only if exactly one trigger)
  if (triggers.length === 1) {
    const reachable = getReachableNodes(triggers[0].id, nodes, validEdges);
    const disconnected = nodes.filter(
      (n) => !reachable.has(n.id) && !orphans.some((o) => o.id === n.id)
    );
    if (disconnected.length > 0) {
      const ids = disconnected.map((n) => n.id);
      ids.forEach((id) => invalidNodeIds.add(id));
      errors.push({
        type: "DISCONNECTED",
        message: `${ids.length} node${ids.length > 1 ? "s are" : " is"} not reachable from the trigger.`,
        nodeIds: ids,
      });
    }
  }

  // 6. Missing required config
  const missingConfigNodes: string[] = [];
  const missingDetails: string[] = [];

  for (const node of nodes) {
    const schema = getNodeSchema(node.nodeType);
    const missingFields: string[] = [];

    for (const field of schema.fields) {
      if (!field.required) continue;
      const val = node.config[field.key];
      if (val === undefined || val === null || val === "") {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      missingConfigNodes.push(node.id);
      missingDetails.push(`"${node.nodeType}" is missing: ${missingFields.join(", ")}`);
    }
  }

  if (missingConfigNodes.length > 0) {
    missingConfigNodes.forEach((id) => invalidNodeIds.add(id));
    errors.push({
      type: "MISSING_CONFIG",
      message: `${missingConfigNodes.length} node${missingConfigNodes.length > 1 ? "s have" : " has"} missing required configuration. ${missingDetails.join("; ")}.`,
      nodeIds: missingConfigNodes,
    });
  }

  return { valid: errors.length === 0, errors, invalidNodeIds };
}

function findCycleNodes(nodes: ValidatorNode[], edges: ValidatorEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // Kahn's algorithm — topological sort
  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);

  const visited = new Set<string>();
  while (queue.length > 0) {
    const u = queue.shift()!;
    visited.add(u);
    for (const v of adj.get(u) ?? []) {
      const newDeg = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) queue.push(v);
    }
  }

  // Any node not reached by topo-sort is part of a cycle
  return nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
}

function getReachableNodes(
  startId: string,
  nodes: ValidatorNode[],
  edges: ValidatorEdge[]
): Set<string> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? []) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }

  return visited;
}
