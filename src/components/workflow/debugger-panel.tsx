"use client";

import { useState, useRef, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DebugStatus = "pending" | "running" | "success" | "failed";

interface DebugStep {
  nodeId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
  status: DebugStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
}

interface DebuggerPanelProps {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  onStatusChange: (statuses: Record<string, DebugStatus | undefined>) => void;
  onClose: () => void;
}

function topoSort(
  nodeIds: string[],
  edges: { source: string; target: string }[]
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const e of edges) {
    if (inDegree.has(e.source) && inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      adj.get(e.source)?.push(e.target);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const order: string[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);
    for (const next of adj.get(curr) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // Append any unvisited nodes (cycle members)
  for (const id of nodeIds) {
    if (!order.includes(id)) order.push(id);
  }

  return order;
}

function buildInitialSteps(nodes: Node[], edges: Edge[]): DebugStep[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const order = topoSort(
    nodes.map((n) => n.id),
    edges.map((e) => ({ source: e.source, target: e.target }))
  );

  return order.map((id) => {
    const n = nodeMap.get(id)!;
    const d = n.data as Record<string, unknown>;
    return {
      nodeId: id,
      nodeType: (d.nodeType ?? "") as string,
      label: (d.label ?? "") as string,
      config: (d.config ?? {}) as Record<string, unknown>,
      status: "pending" as DebugStatus,
      input: {},
    };
  });
}

function StatusIcon({ status, size = 4 }: { status: DebugStatus; size?: number }) {
  const cls = `h-${size} w-${size}`;
  if (status === "running") return <Loader2 className={cn(cls, "animate-spin text-yellow-400")} />;
  if (status === "success") return <CheckCircle2 className={cn(cls, "text-emerald-400")} />;
  if (status === "failed") return <XCircle className={cn(cls, "text-red-400")} />;
  return <Clock className={cn(cls, "text-zinc-600")} />;
}

export function DebuggerPanel({
  workflowId,
  nodes,
  edges,
  onStatusChange,
  onClose,
}: DebuggerPanelProps) {
  const [steps, setSteps] = useState<DebugStep[]>(() =>
    buildInitialSteps(nodes, edges)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const pauseRef = useRef(false);
  const contextRef = useRef<Record<string, Record<string, unknown>>>({});
  const stepsRef = useRef<DebugStep[]>(steps);
  stepsRef.current = steps;

  function buildInput(nodeId: string): Record<string, unknown> {
    const inEdges = edges.filter((e) => e.target === nodeId);
    const input: Record<string, unknown> = {};
    for (const edge of inEdges) {
      const out = contextRef.current[edge.source];
      if (out) Object.assign(input, out);
    }
    return input;
  }

  function emitStatuses(updatedSteps: DebugStep[]) {
    const statuses: Record<string, DebugStatus | undefined> = {};
    for (const s of updatedSteps) {
      statuses[s.nodeId] = s.status;
    }
    onStatusChange(statuses);
  }

  const executeStep = useCallback(
    async (index: number): Promise<boolean> => {
      const step = stepsRef.current[index];
      if (!step) return false;

      const input = buildInput(step.nodeId);
      const startedAt = Date.now();

      const updateSteps = (updater: (s: DebugStep) => DebugStep) => {
        setSteps((prev) => {
          const next = prev.map((s, i) => (i === index ? updater(s) : s));
          emitStatuses(next);
          return next;
        });
      };

      updateSteps((s) => ({ ...s, status: "running", input }));

      try {
        const res = await fetch(`/api/workflows/${workflowId}/debug`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeType: step.nodeType,
            config: step.config,
            input,
          }),
        });

        const data = await res.json() as { output?: Record<string, unknown>; error?: string };
        const durationMs = Date.now() - startedAt;

        if (data.error) {
          updateSteps((s) => ({
            ...s,
            status: "failed",
            error: data.error,
            durationMs,
          }));
          setSelectedStep(index);
          return false;
        }

        const output = data.output ?? {};
        contextRef.current[step.nodeId] = output;

        updateSteps((s) => ({ ...s, status: "success", output, durationMs }));
        return true;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        updateSteps((s) => ({
          ...s,
          status: "failed",
          error: err instanceof Error ? err.message : "Network error",
          durationMs,
        }));
        setSelectedStep(index);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, edges]
  );

  async function handleStep() {
    if (currentIndex >= steps.length) return;
    const ok = await executeStep(currentIndex);
    const next = currentIndex + 1;
    setCurrentIndex(next);
    if (!ok) return;
    if (next >= steps.length) setSelectedStep(steps.length - 1);
  }

  async function handleRun() {
    if (autoRunning) return;
    pauseRef.current = false;
    setAutoRunning(true);

    let idx = currentIndex;
    while (idx < stepsRef.current.length) {
      if (pauseRef.current) break;
      const ok = await executeStep(idx);
      idx++;
      setCurrentIndex(idx);
      if (!ok) break;
      await new Promise((r) => setTimeout(r, 350));
    }

    setAutoRunning(false);
  }

  function handlePause() {
    pauseRef.current = true;
    setAutoRunning(false);
  }

  function handleRestart() {
    pauseRef.current = true;
    setAutoRunning(false);
    contextRef.current = {};
    const fresh = buildInitialSteps(nodes, edges);
    setSteps(fresh);
    setCurrentIndex(0);
    setSelectedStep(null);
    emitStatuses(fresh);
  }

  const isDone = currentIndex >= steps.length;
  const viewStep = selectedStep !== null ? steps[selectedStep] : steps[currentIndex - 1];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col border-t border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold text-white">Debugger</span>
        <div className="flex items-center gap-1.5 ml-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs gap-1 border-zinc-700"
            onClick={handleStep}
            disabled={autoRunning || isDone}
            title="Step (execute next node)"
          >
            <StepForward className="h-3 w-3" />
            Step
          </Button>

          {autoRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs gap-1 border-zinc-700"
              onClick={handlePause}
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs gap-1 border-zinc-700 text-emerald-400 border-emerald-800"
              onClick={handleRun}
              disabled={isDone}
            >
              <Play className="h-3 w-3" />
              Run
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs gap-1 border-zinc-700"
            onClick={handleRestart}
          >
            <RotateCcw className="h-3 w-3" />
            Restart
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {currentIndex}/{steps.length} nodes
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex" style={{ height: 220 }}>
        {/* Steps list */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-zinc-800">
          {steps.map((step, i) => (
            <button
              key={step.nodeId}
              onClick={() => setSelectedStep(i)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-900 transition-colors border-b border-zinc-800/50",
                selectedStep === i && "bg-zinc-900",
                i === currentIndex && step.status === "pending" && "bg-zinc-900/50"
              )}
            >
              <StatusIcon status={step.status} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-medium truncate",
                  step.status === "success" ? "text-emerald-300" :
                  step.status === "failed" ? "text-red-300" :
                  step.status === "running" ? "text-yellow-300" :
                  "text-zinc-400"
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-zinc-600">{step.nodeType}</p>
              </div>
              {step.durationMs !== undefined && (
                <span className="text-[10px] text-zinc-600 shrink-0">
                  {step.durationMs}ms
                </span>
              )}
              {selectedStep === i && (
                <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Details pane */}
        <div className="flex-1 overflow-y-auto p-3">
          {viewStep ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusIcon status={viewStep.status} size={3} />
                <span className="text-xs font-semibold text-white">{viewStep.label}</span>
                <span className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
                  {viewStep.nodeType}
                </span>
                {viewStep.durationMs !== undefined && (
                  <span className="text-[10px] text-zinc-500 ml-auto">
                    {viewStep.durationMs}ms
                  </span>
                )}
              </div>

              {viewStep.error && (
                <div className="rounded border border-red-900 bg-red-950/30 p-2">
                  <p className="text-xs text-red-400 font-mono">{viewStep.error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">Input</p>
                  <pre className="text-[10px] text-zinc-300 bg-zinc-900 rounded p-2 overflow-auto max-h-28 font-mono leading-relaxed">
                    {JSON.stringify(viewStep.input, null, 2) || "{}"}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">Output</p>
                  <pre className="text-[10px] text-zinc-300 bg-zinc-900 rounded p-2 overflow-auto max-h-28 font-mono leading-relaxed">
                    {viewStep.output
                      ? JSON.stringify(viewStep.output, null, 2)
                      : viewStep.status === "pending" || viewStep.status === "running"
                      ? "—"
                      : "{}"}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-600">
                Click a step or press <kbd className="bg-zinc-800 px-1 rounded text-zinc-400">Step</kbd> to begin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
