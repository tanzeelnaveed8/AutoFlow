export type NodeType =
  | "webhook-trigger"
  | "manual-trigger"
  | "http-request"
  | "openai"
  | "delay"
  | "log";

export type ExecutionStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type LogStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type WorkflowNodeConfig = Record<string, unknown>;

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  label: string;
  config: WorkflowNodeConfig;
  workflowId: string;
  positionX: number;
  positionY: number;
}

export interface WorkflowEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  workflowId: string;
}

export interface WorkflowWithDetails {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
  _count?: { executions: number };
}

export interface ExecutionWithLogs {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  duration: number | null;
  error: string | null;
  trigger: string;
  workflow?: { name: string };
  logs: ExecutionLogData[];
}

export interface ExecutionLogData {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: LogStatus;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface NodeDefinition {
  type: NodeType;
  label: string;
  category: "trigger" | "action";
  description: string;
  color: string;
  icon: string;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: "webhook-trigger",
    label: "Webhook Trigger",
    category: "trigger",
    description: "Triggers workflow when a webhook is received",
    color: "#ea580c",
    icon: "webhook",
  },
  {
    type: "manual-trigger",
    label: "Manual Trigger",
    category: "trigger",
    description: "Manually trigger the workflow",
    color: "#f97316",
    icon: "play",
  },
  {
    type: "http-request",
    label: "HTTP Request",
    category: "action",
    description: "Make an HTTP request to any URL",
    color: "#0ea5e9",
    icon: "globe",
  },
  {
    type: "openai",
    label: "OpenAI",
    category: "action",
    description: "Generate text using OpenAI GPT",
    color: "#10b981",
    icon: "sparkles",
  },
  {
    type: "delay",
    label: "Delay",
    category: "action",
    description: "Wait for a specified amount of time",
    color: "#f59e0b",
    icon: "clock",
  },
  {
    type: "log",
    label: "Log",
    category: "action",
    description: "Log data to execution history",
    color: "#64748b",
    icon: "terminal",
  },
];
