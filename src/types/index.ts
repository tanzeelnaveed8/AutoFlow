export type NodeType = string;

export type ExecutionStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type LogStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type WorkflowNodeConfig = Record<string, unknown>;

export interface WorkflowNodeData {
  id: string;
  type: string;
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
  type: string;
  label: string;
  category: "trigger" | "action";
  group: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ── TRIGGERS ─────────────────────────────────────────────────────────────────
  { type: "webhook-trigger", label: "Webhook", category: "trigger", group: "Triggers", description: "Start workflow when an HTTP webhook is received", color: "#ea580c", bgColor: "#431407", icon: "webhook" },
  { type: "manual-trigger", label: "Manual", category: "trigger", group: "Triggers", description: "Manually trigger the workflow from the dashboard", color: "#f97316", bgColor: "#431407", icon: "play" },
  { type: "schedule-trigger", label: "Schedule", category: "trigger", group: "Triggers", description: "Run on a cron schedule (every hour, every morning…)", color: "#f59e0b", bgColor: "#451a03", icon: "clock" },
  { type: "interval-trigger", label: "Interval", category: "trigger", group: "Triggers", description: "Run repeatedly at a fixed interval (every N seconds)", color: "#84cc16", bgColor: "#1a2e05", icon: "clock" },
  { type: "gmail-trigger", label: "Gmail: New Email", category: "trigger", group: "Triggers", description: "Trigger when a new email arrives matching a filter", color: "#ea4335", bgColor: "#2c1210", icon: "gmail" },

  // ── AI ───────────────────────────────────────────────────────────────────────
  { type: "openai", label: "OpenAI Chat", category: "action", group: "AI", description: "Generate text with GPT-4o and other OpenAI models", color: "#10b981", bgColor: "#052e16", icon: "openai" },
  { type: "anthropic", label: "Claude AI", category: "action", group: "AI", description: "Generate text using Claude Opus, Sonnet or Haiku", color: "#d97706", bgColor: "#1c1008", icon: "anthropic" },
  { type: "ai-summarize", label: "AI Summarize", category: "action", group: "AI", description: "Summarize any text to a concise summary", color: "#8b5cf6", bgColor: "#1e0f3a", icon: "sparkles" },
  { type: "ai-translate", label: "AI Translate", category: "action", group: "AI", description: "Translate text to any language using AI", color: "#06b6d4", bgColor: "#0a2233", icon: "sparkles" },
  { type: "ai-classify", label: "AI Classify", category: "action", group: "AI", description: "Classify text into your defined categories", color: "#ec4899", bgColor: "#2d0a1e", icon: "sparkles" },
  { type: "ai-sentiment", label: "AI Sentiment", category: "action", group: "AI", description: "Analyze sentiment (positive, negative, neutral)", color: "#f97316", bgColor: "#431407", icon: "sparkles" },
  { type: "ai-extract-json", label: "AI Extract JSON", category: "action", group: "AI", description: "Extract structured data from unstructured text", color: "#0ea5e9", bgColor: "#0c1a27", icon: "sparkles" },

  // ── LOGIC ────────────────────────────────────────────────────────────────────
  { type: "if-condition", label: "If Condition", category: "action", group: "Logic", description: "Continue only if a condition is true, otherwise stop", color: "#8b5cf6", bgColor: "#1e0f3a", icon: "git-branch" },
  { type: "filter", label: "Filter", category: "action", group: "Logic", description: "Stop the workflow if a condition is not met", color: "#6366f1", bgColor: "#1e1b4b", icon: "filter" },
  { type: "merge", label: "Merge", category: "action", group: "Logic", description: "Merge current data with additional static values", color: "#14b8a6", bgColor: "#042f2e", icon: "git-merge" },
  { type: "transform", label: "Transform", category: "action", group: "Logic", description: "Reshape data into a new structure using templates", color: "#06b6d4", bgColor: "#0a2233", icon: "code" },
  { type: "set-variable", label: "Set Variable", category: "action", group: "Logic", description: "Store a value in a workflow variable for later use", color: "#f59e0b", bgColor: "#1c1008", icon: "database" },
  { type: "get-variable", label: "Get Variable", category: "action", group: "Logic", description: "Retrieve a previously stored workflow variable", color: "#f59e0b", bgColor: "#1c1008", icon: "database" },
  { type: "stop-workflow", label: "Stop Workflow", category: "action", group: "Logic", description: "Immediately stop the workflow execution", color: "#ef4444", bgColor: "#2c0a0a", icon: "octagon" },
  { type: "delay", label: "Delay", category: "action", group: "Logic", description: "Wait for a specified duration before continuing", color: "#f59e0b", bgColor: "#1c1008", icon: "clock" },

  // ── DATA ─────────────────────────────────────────────────────────────────────
  { type: "json-parse", label: "JSON Parse", category: "action", group: "Data", description: "Parse a JSON string into an object", color: "#f59e0b", bgColor: "#1c1008", icon: "braces" },
  { type: "json-stringify", label: "JSON Stringify", category: "action", group: "Data", description: "Convert an object to a JSON string", color: "#f59e0b", bgColor: "#1c1008", icon: "braces" },
  { type: "text-transform", label: "Text Transform", category: "action", group: "Data", description: "Uppercase, lowercase, trim, replace and more", color: "#06b6d4", bgColor: "#0a2233", icon: "type" },
  { type: "date-format", label: "Date Format", category: "action", group: "Data", description: "Format, parse, or calculate with dates and times", color: "#ec4899", bgColor: "#2d0a1e", icon: "calendar" },
  { type: "math", label: "Math", category: "action", group: "Data", description: "Add, subtract, multiply, divide and more", color: "#84cc16", bgColor: "#1a2e05", icon: "calculator" },
  { type: "uuid", label: "Generate UUID", category: "action", group: "Data", description: "Generate a random UUID v4", color: "#6366f1", bgColor: "#1e1b4b", icon: "fingerprint" },
  { type: "base64", label: "Base64", category: "action", group: "Data", description: "Encode or decode data with Base64", color: "#14b8a6", bgColor: "#042f2e", icon: "binary" },
  { type: "hash", label: "Hash", category: "action", group: "Data", description: "Hash text with SHA-256, SHA-512, MD5 and more", color: "#8b5cf6", bgColor: "#1e0f3a", icon: "hash" },
  { type: "regex", label: "Regex", category: "action", group: "Data", description: "Test, match, and replace with regular expressions", color: "#f97316", bgColor: "#431407", icon: "code" },

  // ── DEVELOPER ────────────────────────────────────────────────────────────────
  { type: "http-request", label: "HTTP Request", category: "action", group: "Developer", description: "Make any HTTP request — GET, POST, PUT, DELETE", color: "#6366f1", bgColor: "#1e1b4b", icon: "globe" },
  { type: "graphql", label: "GraphQL", category: "action", group: "Developer", description: "Execute a GraphQL query or mutation", color: "#e535ab", bgColor: "#2d0a1e", icon: "globe" },
  { type: "github-issue", label: "GitHub: Create Issue", category: "action", group: "GitHub", description: "Open a new issue in a GitHub repository", color: "#ffffff", bgColor: "#0d1117", icon: "github" },
  { type: "github-pr", label: "GitHub: Create PR", category: "action", group: "GitHub", description: "Open a pull request in a GitHub repository", color: "#ffffff", bgColor: "#0d1117", icon: "github" },
  { type: "github-repo", label: "GitHub: Get Repo", category: "action", group: "GitHub", description: "Fetch repository details, stars, and metadata", color: "#ffffff", bgColor: "#0d1117", icon: "github" },

  // ── GMAIL ────────────────────────────────────────────────────────────────────
  { type: "gmail-send", label: "Gmail: Send Email", category: "action", group: "Gmail", description: "Send an email from your Gmail account", color: "#ea4335", bgColor: "#2c1210", icon: "gmail" },
  { type: "gmail-get", label: "Gmail: Get Email", category: "action", group: "Gmail", description: "Fetch an email by ID or search query", color: "#ea4335", bgColor: "#2c1210", icon: "gmail" },

  // ── SLACK ────────────────────────────────────────────────────────────────────
  { type: "slack-message", label: "Slack: Send Message", category: "action", group: "Slack", description: "Post a message to a Slack channel", color: "#4a154b", bgColor: "#1a0520", icon: "slack" },
  { type: "slack-dm", label: "Slack: Direct Message", category: "action", group: "Slack", description: "Send a direct message to a Slack user", color: "#4a154b", bgColor: "#1a0520", icon: "slack" },

  // ── DISCORD ──────────────────────────────────────────────────────────────────
  { type: "discord-message", label: "Discord: Send Message", category: "action", group: "Discord", description: "Send a message to a Discord channel", color: "#5865f2", bgColor: "#0e0e2c", icon: "discord" },

  // ── NOTION ───────────────────────────────────────────────────────────────────
  { type: "notion-create", label: "Notion: Create Page", category: "action", group: "Notion", description: "Create a new page in a Notion database", color: "#ffffff", bgColor: "#1a1a1a", icon: "notion" },
  { type: "notion-update", label: "Notion: Update Page", category: "action", group: "Notion", description: "Update properties of an existing Notion page", color: "#ffffff", bgColor: "#1a1a1a", icon: "notion" },
  { type: "notion-search", label: "Notion: Search", category: "action", group: "Notion", description: "Search pages and databases in Notion", color: "#ffffff", bgColor: "#1a1a1a", icon: "notion" },

  // ── GOOGLE SHEETS ─────────────────────────────────────────────────────────────
  { type: "sheets-add-row", label: "Sheets: Add Row", category: "action", group: "Google Sheets", description: "Append a new row to a Google Sheet", color: "#34a853", bgColor: "#0d2114", icon: "googlesheets" },
  { type: "sheets-get-rows", label: "Sheets: Get Rows", category: "action", group: "Google Sheets", description: "Read rows from a range in Google Sheets", color: "#34a853", bgColor: "#0d2114", icon: "googlesheets" },
  { type: "sheets-update-row", label: "Sheets: Update Row", category: "action", group: "Google Sheets", description: "Update values in a specific range of a Google Sheet", color: "#34a853", bgColor: "#0d2114", icon: "googlesheets" },
];
