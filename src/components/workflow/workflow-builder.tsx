"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import {
  Save,
  Play,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Bug,
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  Keyboard,
  Circle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomNode } from "./custom-node";
import { NodePanel } from "./node-panel";
import { NodeSettings } from "./node-settings";
import { ValidationPanel } from "./validation-panel";
import { AiGenerateDialog } from "./ai-generate-dialog";
import { DebuggerPanel } from "./debugger-panel";
import { saveWorkflowGraph } from "@/actions/workflows";
import { validateWorkflow, type ValidationResult } from "@/lib/workflow-validator";
import { NODE_DEFINITIONS, NodeDefinition, WorkflowNodeConfig } from "@/types";
import type { WorkflowWithDetails } from "@/types";
import {
  useHistory,
  snapNode,
  snapEdge,
  restoreNode,
  restoreEdge,
  type SnapNode,
  type SnapEdge,
} from "@/hooks/use-history";

type DebugStatus = "pending" | "running" | "success" | "failed";
type SaveStatus = "idle" | "pending" | "saving" | "saved";

interface ClipboardData {
  nodes: SnapNode[];
  edges: SnapEdge[];
}

const nodeTypes = { custom: CustomNode };

interface WorkflowBuilderProps {
  workflow: WorkflowWithDetails;
}

export function WorkflowBuilder({ workflow }: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner workflow={workflow} />
    </ReactFlowProvider>
  );
}

function WorkflowBuilderInner({ workflow }: WorkflowBuilderProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugStatuses, setDebugStatuses] = useState<Record<string, DebugStatus | undefined>>({});
  const [debugSnapshot, setDebugSnapshot] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const clipboardRef = useRef<ClipboardData | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);
  const history = useHistory();

  const initialNodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
      isInvalid: false,
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

  const deleteHandler = useCallback(
    (id: string) => setNodes((prev) => prev.filter((n) => n.id !== id)),
    [setNodes]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedNodeData = selectedNode?.data as unknown as
    | { label: string; nodeType: string; config: WorkflowNodeConfig }
    | undefined;

  // Annotate nodes with validation highlights and debug status
  const annotatedNodes = useMemo(() => {
    const invalidIds = validationResult?.invalidNodeIds ?? new Set<string>();
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isInvalid: invalidIds.has(n.id),
        debugStatus: debugStatuses[n.id],
      },
    }));
  }, [nodes, validationResult, debugStatuses]);

  // Auto-save with 2-second debounce
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setSaveStatus("pending");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await performSave();
        setSaveStatus("saved");
        const timer = setTimeout(() => setSaveStatus("idle"), 3000);
        return () => clearTimeout(timer);
      } catch {
        setSaveStatus("idle");
      }
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      history.push(nodes, edges);
      setEdges((eds) =>
        addEdge(
          { ...connection, style: { stroke: "#ea580c", strokeWidth: 2 }, animated: true },
          eds
        )
      );
      setValidationResult(null);
    },
    [nodes, edges, setEdges, history]
  );

  function addNode(def: NodeDefinition, position?: { x: number; y: number }) {
    history.push(nodes, edges);
    const id = nanoid();
    const newNode: Node = {
      id,
      type: "custom",
      position: position ?? { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: def.label,
        nodeType: def.type,
        config: {},
        isInvalid: false,
        onDelete: deleteHandler,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setValidationResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const def = NODE_DEFINITIONS.find((d) => d.type === type);
    if (!def) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(def, position);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function deleteSelectedNodes() {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0 && !selectedNodeId) return;
    const toDelete = new Set(
      selected.length > 0 ? selected.map((n) => n.id) : selectedNodeId ? [selectedNodeId] : []
    );
    if (toDelete.size === 0) return;
    history.push(nodes, edges);
    setNodes((prev) => prev.filter((n) => !toDelete.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target))
    );
    if (selectedNodeId && toDelete.has(selectedNodeId)) setSelectedNodeId(null);
    setValidationResult(null);
  }

  function handleCopy() {
    const toCopy = selectedNodes.length > 0 ? selectedNodes : selectedNode ? [selectedNode] : [];
    if (toCopy.length === 0) return;
    const copyIds = new Set(toCopy.map((n) => n.id));
    const copyEdges = edges.filter((e) => copyIds.has(e.source) && copyIds.has(e.target));
    clipboardRef.current = {
      nodes: toCopy.map(snapNode),
      edges: copyEdges.map(snapEdge),
    };
  }

  function handlePaste() {
    if (!clipboardRef.current) return;
    history.push(nodes, edges);

    const idMap = new Map<string, string>();
    clipboardRef.current.nodes.forEach((n) => idMap.set(n.id, nanoid()));

    const newNodes: Node[] = clipboardRef.current.nodes.map((sn) => ({
      ...restoreNode(sn, deleteHandler),
      id: idMap.get(sn.id)!,
      position: { x: sn.position.x + 40, y: sn.position.y + 40 },
      selected: true,
    }));

    const newEdges: Edge[] = clipboardRef.current.edges
      .filter((se) => idMap.has(se.source) && idMap.has(se.target))
      .map((se) => ({
        ...restoreEdge(se),
        id: nanoid(),
        source: idMap.get(se.source)!,
        target: idMap.get(se.target)!,
      }));

    setNodes((prev) => [
      ...prev.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((prev) => [...prev, ...newEdges]);
    setValidationResult(null);
  }

  function handleDuplicate() {
    handleCopy();
    handlePaste();
  }

  function updateNodeConfig(nodeId: string, config: WorkflowNodeConfig, label: string) {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config, label } } : n))
    );
    setValidationResult(null);
  }

  function handleAiApply(generatedNodes: Node[], generatedEdges: Edge[]) {
    history.push(nodes, edges);
    const nodesWithHandlers = generatedNodes.map((n) => ({
      ...n,
      data: { ...n.data, onDelete: deleteHandler },
    }));
    setNodes(nodesWithHandlers);
    setEdges(generatedEdges);
    setSelectedNodeId(null);
    setValidationResult(null);
  }

  function runValidation(): ValidationResult {
    const validatorNodes = nodes.map((n) => {
      const d = n.data as { nodeType: string; config: Record<string, unknown> };
      return { id: n.id, nodeType: d.nodeType, config: d.config ?? {} };
    });
    const validatorEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
    const result = validateWorkflow(validatorNodes, validatorEdges);
    setValidationResult(result);
    return result;
  }

  async function performSave() {
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
  }

  async function handleSave() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaving(true);
    setSaveStatus("saving");
    try {
      await performSave();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    const result = runValidation();
    if (!result.valid) return;
    setRunning(true);
    try {
      await handleSave();
      await fetch(`/api/workflows/${workflow.id}/execute`, { method: "POST" });
      window.location.href = "/executions";
    } finally {
      setRunning(false);
    }
  }

  function startDebug() {
    setDebugSnapshot({ nodes: [...nodes], edges: [...edges] });
    setDebugStatuses({});
    setDebugMode(true);
  }

  function stopDebug() {
    setDebugMode(false);
    setDebugSnapshot(null);
    setDebugStatuses({});
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const inInput =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      // Undo/Redo — work even from inputs
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo(nodes, edges, setNodes, setEdges, deleteHandler);
        setValidationResult(null);
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        history.redo(nodes, edges, setNodes, setEdges, deleteHandler);
        setValidationResult(null);
        return;
      }

      if (inInput) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        handleCopy();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        handlePaste();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedNodes();
        return;
      }
      if (e.key === "Escape") {
        setSelectedNodeId(null);
        if (debugMode) stopDebug();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, selectedNodeId, debugMode]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Top header: back + brand */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
          <Link
            href="/workflows"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Workflows
          </Link>
        </div>

        {/* Workflow name + save status */}
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {workflow.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {saveStatus === "pending" && (
                <>
                  <Circle className="h-1.5 w-1.5 fill-amber-400 text-amber-400" />
                  <p className="text-[10px] text-amber-400">Unsaved changes</p>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
                  <p className="text-[10px] text-zinc-500">Saving…</p>
                </>
              )}
              {saveStatus === "saved" && savedAt && (
                <>
                  <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                  <p className="text-[10px] text-emerald-600">
                    Saved {savedAt.toLocaleTimeString()}
                  </p>
                </>
              )}
              {saveStatus === "idle" && savedAt && (
                <p className="text-[10px] text-zinc-700">
                  Saved {savedAt.toLocaleTimeString()}
                </p>
              )}
              {saveStatus === "idle" && !savedAt && (
                <p className="text-[10px] text-zinc-700">Ready</p>
              )}
            </div>
          </div>
        </div>

        {/* Node panel — takes remaining space, scrolls internally */}
        <div className="flex-1 min-h-0">
          <NodePanel onAddNode={addNode} />
        </div>

        {/* Collapsible keyboard shortcuts */}
        <div className="shrink-0 border-t border-zinc-800">
          <button
            onClick={() => setShowShortcuts((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Keyboard className="h-3 w-3" />
              Keyboard shortcuts
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                showShortcuts && "rotate-90"
              )}
            />
          </button>
          {showShortcuts && (
            <div className="border-t border-zinc-900 px-3 pb-3 pt-2.5 space-y-2">
              {[
                ["Ctrl+Z / Y", "Undo / Redo"],
                ["Ctrl+C / V", "Copy / Paste"],
                ["Ctrl+D", "Duplicate"],
                ["Ctrl+S", "Save"],
                ["Delete", "Remove node"],
                ["Shift+drag", "Multi-select"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <kbd className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-zinc-600 text-right">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={annotatedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            setValidationResult(null);
          }}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onNodeDragStart={() => history.push(nodes, edges)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          className="bg-zinc-950"
          deleteKeyCode={null}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
        >
          <Background
            color="#27272a"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
          />
          <Controls />
          <MiniMap
            className="bg-zinc-900! border-zinc-800!"
            nodeColor={(n) =>
              (n.data as { isInvalid?: boolean }).isInvalid ? "#ef4444" : "#ea580c"
            }
            maskColor="rgba(0,0,0,0.5)"
          />

          <Panel position="top-right" className="flex gap-2">
            {/* Edit actions */}
            <Button
              onClick={() => {
                history.undo(nodes, edges, setNodes, setEdges, deleteHandler);
                setValidationResult(null);
              }}
              variant="outline"
              size="sm"
              className="gap-1.5 border-zinc-700"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => {
                history.redo(nodes, edges, setNodes, setEdges, deleteHandler);
                setValidationResult(null);
              }}
              variant="outline"
              size="sm"
              className="gap-1.5 border-zinc-700"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="gap-1.5 border-zinc-700"
              title="Copy (Ctrl+C)"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handlePaste}
              variant="outline"
              size="sm"
              className="gap-1.5 border-zinc-700"
              title="Paste (Ctrl+V)"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px bg-zinc-700 mx-0.5" />

            <Button
              onClick={() => setAiDialogOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 border-violet-700 text-violet-400 hover:text-violet-300 hover:border-violet-500"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Generate
            </Button>
            <Button
              onClick={() => runValidation()}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Validate
            </Button>
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
            <Button
              onClick={debugMode ? stopDebug : startDebug}
              variant={debugMode ? "default" : "outline"}
              size="sm"
              className={
                debugMode
                  ? "gap-1.5 bg-amber-600 hover:bg-amber-500 border-amber-600"
                  : "gap-1.5 border-amber-700 text-amber-400 hover:text-amber-300 hover:border-amber-500"
              }
            >
              <Bug className="h-3.5 w-3.5" />
              {debugMode ? "Exit Debug" : "Debug"}
            </Button>
          </Panel>
        </ReactFlow>

        {validationResult && !validationResult.valid && (
          <ValidationPanel
            result={validationResult}
            onDismiss={() => setValidationResult(null)}
          />
        )}

        {debugMode && debugSnapshot && (
          <DebuggerPanel
            workflowId={workflow.id}
            nodes={debugSnapshot.nodes}
            edges={debugSnapshot.edges}
            onStatusChange={setDebugStatuses}
            onClose={stopDebug}
          />
        )}

        <AiGenerateDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onApply={handleAiApply}
        />
      </div>

      {/* Node settings panel — only for single selection */}
      {selectedNode && selectedNodeData && selectedNodes.length <= 1 && !debugMode && (
        <div className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-y-auto">
          <NodeSettings
            node={{
              id: selectedNode.id,
              type: selectedNodeData.nodeType,
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
