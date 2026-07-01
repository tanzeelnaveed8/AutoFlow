import { useRef } from "react";
import type { CSSProperties } from "react";
import type { Node, Edge } from "@xyflow/react";

export interface SnapNodeData {
  label: string;
  nodeType: string;
  config: Record<string, unknown>;
  isInvalid: boolean;
}

export interface SnapNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: SnapNodeData;
}

export interface SnapEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  style?: CSSProperties;
  animated?: boolean;
}

interface Snapshot {
  nodes: SnapNode[];
  edges: SnapEdge[];
}

const MAX_HISTORY = 50;

export function snapNode(n: Node): SnapNode {
  const d = n.data as Record<string, unknown>;
  return {
    id: n.id,
    type: n.type ?? "custom",
    position: { x: n.position.x, y: n.position.y },
    data: {
      label: (d.label ?? "") as string,
      nodeType: (d.nodeType ?? "") as string,
      config: (d.config ?? {}) as Record<string, unknown>,
      isInvalid: (d.isInvalid ?? false) as boolean,
    },
  };
}

export function snapEdge(e: Edge): SnapEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    style: e.style as CSSProperties | undefined,
    animated: e.animated,
  };
}

export function restoreNode(
  sn: SnapNode,
  onDeleteFn: (id: string) => void
): Node {
  return {
    id: sn.id,
    type: sn.type,
    position: { ...sn.position },
    data: { ...sn.data, onDelete: onDeleteFn },
  };
}

export function restoreEdge(se: SnapEdge): Edge {
  return {
    id: se.id,
    source: se.source,
    target: se.target,
    sourceHandle: se.sourceHandle ?? undefined,
    targetHandle: se.targetHandle ?? undefined,
    style: se.style ?? { stroke: "#ea580c", strokeWidth: 2 },
    animated: se.animated ?? true,
  };
}

export function useHistory() {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  function push(nodes: Node[], edges: Edge[]) {
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes: nodes.map(snapNode), edges: edges.map(snapEdge) },
    ];
    future.current = [];
  }

  function undo(
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (n: Node[]) => void,
    setEdges: (e: Edge[]) => void,
    onDeleteFn: (id: string) => void
  ): boolean {
    if (past.current.length === 0) return false;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [
      { nodes: currentNodes.map(snapNode), edges: currentEdges.map(snapEdge) },
      ...future.current.slice(0, MAX_HISTORY - 1),
    ];
    setNodes(prev.nodes.map((sn) => restoreNode(sn, onDeleteFn)));
    setEdges(prev.edges.map(restoreEdge));
    return true;
  }

  function redo(
    currentNodes: Node[],
    currentEdges: Edge[],
    setNodes: (n: Node[]) => void,
    setEdges: (e: Edge[]) => void,
    onDeleteFn: (id: string) => void
  ): boolean {
    if (future.current.length === 0) return false;
    const next = future.current[0];
    future.current = future.current.slice(1);
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes: currentNodes.map(snapNode), edges: currentEdges.map(snapEdge) },
    ];
    setNodes(next.nodes.map((sn) => restoreNode(sn, onDeleteFn)));
    setEdges(next.edges.map(restoreEdge));
    return true;
  }

  function canUndo() {
    return past.current.length > 0;
  }

  function canRedo() {
    return future.current.length > 0;
  }

  return { push, undo, redo, canUndo, canRedo };
}
