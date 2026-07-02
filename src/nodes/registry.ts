import { TRIGGER_NODES } from "./categories/triggers";
import { AI_NODES } from "./categories/ai";
import { LOGIC_NODES } from "./categories/logic";
import { DATA_NODES } from "./categories/data";
import { HTTP_NODES } from "./categories/http";
import { COMMUNICATION_NODES } from "./categories/communication";
import { PRODUCTIVITY_NODES } from "./categories/productivity";
import { DEVELOPER_NODES } from "./categories/developer";
import type { NodePlugin } from "./base-types";

export const NODE_REGISTRY: NodePlugin[] = [
  ...TRIGGER_NODES,
  ...AI_NODES,
  ...LOGIC_NODES,
  ...DATA_NODES,
  ...HTTP_NODES,
  ...COMMUNICATION_NODES,
  ...PRODUCTIVITY_NODES,
  ...DEVELOPER_NODES,
];

const _map = new Map<string, NodePlugin>(NODE_REGISTRY.map((n) => [n.id, n]));

export function getNode(id: string): NodePlugin | undefined {
  return _map.get(id);
}

export function getNodesByGroup(): Map<string, NodePlugin[]> {
  const groups = new Map<string, NodePlugin[]>();
  for (const node of NODE_REGISTRY) {
    const list = groups.get(node.group) ?? [];
    list.push(node);
    groups.set(node.group, list);
  }
  return groups;
}
