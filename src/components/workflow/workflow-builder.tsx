"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { Save, Play, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomNode } from "./custom-node";
import { NodePanel } from "./node-panel";
import { NodeSettings } from "./node-settings";
import { saveWorkflowGraph } from "@/actions/workflows";
import { NodeDefinition, WorkflowNodeConfig } from "@/types";
import type { WorkflowWithDetails } from "@/types";

const nodeTypes = { custom: CustomNode };

interface WorkflowBuilderProps {
  workflow: WorkflowWithDetails;
}

export function WorkflowBuilder({ workflow }: WorkflowBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const initialNodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
      onDelete: (id: string) => setNodes((prev) => prev.filter((nd) => nd.id !== id)),
    },
  }));

  const initialEdges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    style: { stroke: "#ea580c", strokeWidth: 2 },
    animated: true,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeData = selectedNode?.data as unknown as
    | { label: string; nodeType: string; config: WorkflowNodeConfig }
    | undefined;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: { stroke: "#ea580c", strokeWidth: 2 },
            animated: true,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  function addNode(def: NodeDefinition) {
    const id = nanoid();
    const newNode: Node = {
      id,
      type: "custom",
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: def.label,
        nodeType: def.type,
        config: {},
        onDelete: (nodeId: string) =>
          setNodes((prev) => prev.filter((n) => n.id !== nodeId)),
      },
    };
    setNodes((prev) => [...prev, newNode]);
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  }

  function updateNodeConfig(nodeId: string, config: WorkflowNodeConfig, label: string) {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config, label } }
          : n
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const nodesData = nodes.map((n) => ({
        id: n.id,
        type: (n.data as { nodeType: string }).nodeType,
        label: (n.data as { label: string }).label,
        positionX: n.position.x,
        positionY: n.position.y,
        config: (n.data as { config: object }).config ?? {},
      }));

      const edgesData = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      }));

      await saveWorkflowGraph(workflow.id, nodesData, edgesData);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    try {
      await handleSave();
      await fetch(`/api/workflows/${workflow.id}/execute`, { method: "POST" });
      window.location.href = "/executions";
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement
        )
          return;
        deleteSelectedNode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      <div className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
          <Link
            href="/workflows"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
        <div className="p-3 border-b border-zinc-800">
          <p className="font-semibold text-white text-sm truncate">{workflow.name}</p>
          {savedAt && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Saved {savedAt.toLocaleTimeString()}
            </p>
          )}
        </div>
        <NodePanel onAddNode={addNode} />
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          className="bg-zinc-950"
          deleteKeyCode={null}
        >
          <Background
            color="#27272a"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
          />
          <Controls className="[&>button]:bg-zinc-900 [&>button]:border-zinc-700 [&>button]:text-zinc-400 [&>button:hover]:bg-zinc-800" />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-800"
            nodeColor="#ea580c"
            maskColor="rgba(0,0,0,0.5)"
          />
          <Panel position="top-right" className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button onClick={handleRun} size="sm" disabled={running || saving}>
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && selectedNodeData && (
        <div className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-y-auto">
          <NodeSettings
            node={{
              id: selectedNode.id,
              type: selectedNodeData.nodeType as import("@/types").NodeType,
              label: selectedNodeData.label,
              config: selectedNodeData.config ?? {},
              workflowId: workflow.id,
              positionX: selectedNode.position.x,
              positionY: selectedNode.position.y,
            }}
            onClose={() => setSelectedNodeId(null)}
            onSave={updateNodeConfig}
          />
        </div>
      )}
    </div>
  );
}
