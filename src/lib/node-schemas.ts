import { z } from "zod";

export type FieldType =
  | "text"
  | "textarea"
  | "password"
  | "select"
  | "switch"
  | "checkbox"
  | "number"
  | "json"
  | "key-value";

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: SelectOption[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  condition?: (values: Record<string, unknown>) => boolean;
}

export interface NodeSchemaDefinition {
  fields: FieldDefinition[];
  zodSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}

// ── Shared option lists ──────────────────────────────────────────────────────

const HTTP_METHODS: SelectOption[] = [
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "PATCH", value: "PATCH" },
  { label: "DELETE", value: "DELETE" },
];

const OPENAI_MODELS: SelectOption[] = [
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
  { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
];

const CLAUDE_MODELS: SelectOption[] = [
  { label: "Claude Opus 4.8 (most capable)", value: "claude-opus-4-8" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5 (fastest)", value: "claude-haiku-4-5-20251001" },
];

const CRON_PRESETS: SelectOption[] = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "Custom", value: "custom" },
];

// ── Schema definitions ───────────────────────────────────────────────────────

const NODE_SCHEMAS: Record<string, NodeSchemaDefinition> = {
  // TRIGGERS
  "webhook-trigger": {
    fields: [],
    zodSchema: z.object({}),
  },

  "manual-trigger": {
    fields: [],
    zodSchema: z.object({}),
  },

  "schedule-trigger": {
    fields: [
      {
        key: "preset",
        label: "Schedule",
        type: "select",
        options: CRON_PRESETS,
        defaultValue: "0 * * * *",
        description: "How often to run this workflow",
      },
      {
        key: "cron",
        label: "Custom Cron Expression",
        type: "text",
        placeholder: "0 9 * * 1",
        description: "Cron expression (minute hour day month weekday)",
        condition: (v) => v.preset === "custom",
      },
      {
        key: "timezone",
        label: "Timezone",
        type: "text",
        placeholder: "UTC",
        defaultValue: "UTC",
        description: "IANA timezone, e.g. America/New_York",
      },
    ],
    zodSchema: z.object({
      preset: z.string().optional(),
      cron: z.string().optional(),
      timezone: z.string().optional(),
    }),
  },

  "gmail-trigger": {
    fields: [
      {
        key: "query",
        label: "Gmail Search Filter",
        type: "text",
        placeholder: "from:boss@company.com",
        description: "Gmail search query to filter incoming emails (leave blank for all)",
      },
      {
        key: "labels",
        label: "Label Filter",
        type: "text",
        placeholder: "INBOX",
        description: "Only trigger for emails with this label",
        defaultValue: "INBOX",
      },
    ],
    zodSchema: z.object({
      query: z.string().optional(),
      labels: z.string().optional(),
    }),
  },

  // AI
  openai: {
    fields: [
      {
        key: "model",
        label: "Model",
        type: "select",
        options: OPENAI_MODELS,
        defaultValue: "gpt-4o-mini",
      },
      {
        key: "temperature",
        label: "Temperature",
        type: "number",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0.7,
        description: "Randomness: 0 = deterministic, 2 = very creative",
      },
      {
        key: "systemPrompt",
        label: "System Prompt",
        type: "textarea",
        placeholder: "You are a helpful assistant.",
        rows: 2,
      },
      {
        key: "prompt",
        label: "User Prompt",
        type: "textarea",
        placeholder: "Summarize: {{data}}",
        rows: 4,
        description: "Use {{variable}} to include data from previous nodes",
        required: true,
      },
    ],
    zodSchema: z.object({
      model: z.string().optional(),
      temperature: z.coerce.number().min(0).max(2).optional(),
      systemPrompt: z.string().optional(),
      prompt: z.string().optional(),
    }),
  },

  anthropic: {
    fields: [
      {
        key: "model",
        label: "Model",
        type: "select",
        options: CLAUDE_MODELS,
        defaultValue: "claude-opus-4-8",
      },
      {
        key: "systemPrompt",
        label: "System Prompt",
        type: "textarea",
        placeholder: "You are a helpful assistant.",
        rows: 2,
      },
      {
        key: "prompt",
        label: "User Prompt",
        type: "textarea",
        placeholder: "Analyze this: {{data}}",
        rows: 4,
        description: "Use {{variable}} to include data from previous nodes",
        required: true,
      },
    ],
    zodSchema: z.object({
      model: z.string().optional(),
      systemPrompt: z.string().optional(),
      prompt: z.string().optional(),
    }),
  },

  // GMAIL
  "gmail-send-email": {
    fields: [
      {
        key: "to",
        label: "To",
        type: "text",
        placeholder: "recipient@example.com",
        required: true,
        description: "Use {{variable}} for dynamic recipients",
      },
      {
        key: "subject",
        label: "Subject",
        type: "text",
        placeholder: "Hello from AutoFlow",
        required: true,
        description: "Use {{variable}} for dynamic subjects",
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        placeholder: "Hello,\n\n{{content}}\n\nRegards",
        rows: 6,
        required: true,
        description: "Use {{variable}} to include data from previous nodes",
      },
      {
        key: "isHtml",
        label: "Send as HTML",
        type: "switch",
        defaultValue: false,
      },
    ],
    zodSchema: z.object({
      to: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      isHtml: z.boolean().optional(),
    }),
  },

  "gmail-get-email": {
    fields: [
      {
        key: "messageId",
        label: "Message ID",
        type: "text",
        placeholder: "{{email.id}}",
        description: "Gmail message ID from a trigger or previous node",
      },
      {
        key: "query",
        label: "Search Query",
        type: "text",
        placeholder: "from:boss@company.com is:unread",
        description: "Gmail search query (used if no Message ID provided)",
      },
    ],
    zodSchema: z.object({
      messageId: z.string().optional(),
      query: z.string().optional(),
    }),
  },

  // SLACK
  "slack-send-message": {
    fields: [
      {
        key: "channel",
        label: "Channel",
        type: "text",
        placeholder: "#general or C024BE91L",
        required: true,
        description: "Channel name (with #) or channel ID",
      },
      {
        key: "text",
        label: "Message",
        type: "textarea",
        placeholder: "Hello from AutoFlow! Result: {{result}}",
        rows: 4,
        required: true,
        description: "Use {{variable}} to include data from previous nodes",
      },
      {
        key: "username",
        label: "Bot Username",
        type: "text",
        placeholder: "AutoFlow Bot",
        description: "Override the default bot name",
      },
    ],
    zodSchema: z.object({
      channel: z.string().optional(),
      text: z.string().optional(),
      username: z.string().optional(),
    }),
  },

  "slack-dm": {
    fields: [
      {
        key: "user",
        label: "User",
        type: "text",
        placeholder: "@username or U024BE91L",
        required: true,
        description: "Slack username (with @) or user ID",
      },
      {
        key: "text",
        label: "Message",
        type: "textarea",
        placeholder: "Hey! Here's your update: {{result}}",
        rows: 4,
        required: true,
        description: "Use {{variable}} to include data from previous nodes",
      },
    ],
    zodSchema: z.object({
      user: z.string().optional(),
      text: z.string().optional(),
    }),
  },

  // DISCORD
  "discord-send-message": {
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        type: "text",
        placeholder: "https://discord.com/api/webhooks/...",
        required: true,
        description: "Discord channel webhook URL (Server Settings → Integrations → Webhooks)",
      },
      {
        key: "content",
        label: "Message",
        type: "textarea",
        placeholder: "Workflow update: {{result}}",
        rows: 4,
        required: true,
        description: "Use {{variable}} to include data from previous nodes",
      },
      {
        key: "username",
        label: "Bot Name",
        type: "text",
        placeholder: "AutoFlow",
        description: "Override the webhook's default name",
      },
    ],
    zodSchema: z.object({
      webhookUrl: z.string().optional(),
      content: z.string().optional(),
      username: z.string().optional(),
    }),
  },

  // NOTION
  "notion-create-page": {
    fields: [
      {
        key: "databaseId",
        label: "Database ID",
        type: "text",
        placeholder: "32-character database ID",
        required: true,
        description: "Notion database ID (from the database URL)",
      },
      {
        key: "title",
        label: "Page Title",
        type: "text",
        placeholder: "New entry: {{name}}",
        required: true,
        description: "Use {{variable}} for dynamic titles",
      },
      {
        key: "properties",
        label: "Properties (JSON)",
        type: "json",
        placeholder: '{"Status": {"select": {"name": "Active"}}}',
        rows: 5,
        description: "Notion page properties in JSON format",
      },
    ],
    zodSchema: z.object({
      databaseId: z.string().optional(),
      title: z.string().optional(),
      properties: z.string().optional(),
    }),
  },

  "notion-update-page": {
    fields: [
      {
        key: "pageId",
        label: "Page ID",
        type: "text",
        placeholder: "{{page.id}}",
        required: true,
        description: "Notion page ID to update",
      },
      {
        key: "properties",
        label: "Properties (JSON)",
        type: "json",
        placeholder: '{"Status": {"select": {"name": "Done"}}}',
        rows: 5,
        required: true,
        description: "Notion properties to update in JSON format",
      },
    ],
    zodSchema: z.object({
      pageId: z.string().optional(),
      properties: z.string().optional(),
    }),
  },

  "notion-search": {
    fields: [
      {
        key: "query",
        label: "Search Query",
        type: "text",
        placeholder: "Meeting notes",
        description: "Text to search for in Notion",
      },
      {
        key: "filter",
        label: "Filter by",
        type: "select",
        options: [
          { label: "All", value: "" },
          { label: "Pages only", value: "page" },
          { label: "Databases only", value: "database" },
        ],
        defaultValue: "",
      },
    ],
    zodSchema: z.object({
      query: z.string().optional(),
      filter: z.string().optional(),
    }),
  },

  // GITHUB
  "github-create-issue": {
    fields: [
      {
        key: "owner",
        label: "Owner",
        type: "text",
        placeholder: "octocat",
        required: true,
        description: "GitHub username or organization",
      },
      {
        key: "repo",
        label: "Repository",
        type: "text",
        placeholder: "hello-world",
        required: true,
      },
      {
        key: "title",
        label: "Issue Title",
        type: "text",
        placeholder: "Bug: {{error}}",
        required: true,
        description: "Use {{variable}} for dynamic titles",
      },
      {
        key: "body",
        label: "Issue Body",
        type: "textarea",
        placeholder: "## Description\n\n{{description}}",
        rows: 5,
        description: "Markdown supported. Use {{variable}} for dynamic content.",
      },
      {
        key: "labels",
        label: "Labels",
        type: "text",
        placeholder: "bug, enhancement",
        description: "Comma-separated list of labels",
      },
    ],
    zodSchema: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      title: z.string().optional(),
      body: z.string().optional(),
      labels: z.string().optional(),
    }),
  },

  "github-create-pr": {
    fields: [
      {
        key: "owner",
        label: "Owner",
        type: "text",
        placeholder: "octocat",
        required: true,
      },
      {
        key: "repo",
        label: "Repository",
        type: "text",
        placeholder: "hello-world",
        required: true,
      },
      {
        key: "title",
        label: "PR Title",
        type: "text",
        placeholder: "feat: {{feature}}",
        required: true,
      },
      {
        key: "head",
        label: "Head Branch",
        type: "text",
        placeholder: "feature/my-branch",
        required: true,
        description: "Branch to merge from",
      },
      {
        key: "base",
        label: "Base Branch",
        type: "text",
        placeholder: "main",
        defaultValue: "main",
        description: "Branch to merge into",
      },
      {
        key: "body",
        label: "PR Description",
        type: "textarea",
        placeholder: "## Changes\n\n{{description}}",
        rows: 4,
      },
    ],
    zodSchema: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      title: z.string().optional(),
      head: z.string().optional(),
      base: z.string().optional(),
      body: z.string().optional(),
    }),
  },

  "github-get-repo": {
    fields: [
      {
        key: "owner",
        label: "Owner",
        type: "text",
        placeholder: "octocat",
        required: true,
      },
      {
        key: "repo",
        label: "Repository",
        type: "text",
        placeholder: "hello-world",
        required: true,
      },
    ],
    zodSchema: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
    }),
  },

  // GOOGLE SHEETS
  "sheets-add-row": {
    fields: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        required: true,
        description: "From the Google Sheets URL: /spreadsheets/d/{ID}/",
      },
      {
        key: "range",
        label: "Sheet Range",
        type: "text",
        placeholder: "Sheet1!A:Z",
        defaultValue: "Sheet1",
        required: true,
        description: "Sheet name or A1 range to append to",
      },
      {
        key: "values",
        label: "Row Values (JSON array)",
        type: "json",
        placeholder: '["{{name}}", "{{email}}", "{{date}}"]',
        rows: 3,
        required: true,
        description: "Array of cell values for the new row",
      },
    ],
    zodSchema: z.object({
      spreadsheetId: z.string().optional(),
      range: z.string().optional(),
      values: z.string().optional(),
    }),
  },

  "sheets-get-rows": {
    fields: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        required: true,
      },
      {
        key: "range",
        label: "Range",
        type: "text",
        placeholder: "Sheet1!A1:Z100",
        defaultValue: "Sheet1",
        required: true,
        description: "A1 notation range to read",
      },
    ],
    zodSchema: z.object({
      spreadsheetId: z.string().optional(),
      range: z.string().optional(),
    }),
  },

  "sheets-update-row": {
    fields: [
      {
        key: "spreadsheetId",
        label: "Spreadsheet ID",
        type: "text",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        required: true,
      },
      {
        key: "range",
        label: "Range",
        type: "text",
        placeholder: "Sheet1!A2:D2",
        required: true,
        description: "Exact A1 range of the cells to update",
      },
      {
        key: "values",
        label: "Values (JSON array)",
        type: "json",
        placeholder: '["{{name}}", "{{email}}"]',
        rows: 3,
        required: true,
      },
    ],
    zodSchema: z.object({
      spreadsheetId: z.string().optional(),
      range: z.string().optional(),
      values: z.string().optional(),
    }),
  },

  // LOGIC & TOOLS
  "http-request": {
    fields: [
      {
        key: "method",
        label: "Method",
        type: "select",
        options: HTTP_METHODS,
        defaultValue: "GET",
      },
      {
        key: "url",
        label: "URL",
        type: "text",
        placeholder: "https://api.example.com/endpoint",
        required: true,
      },
      {
        key: "headers",
        label: "Headers",
        type: "key-value",
        description: "Request headers as key-value pairs",
        defaultValue: {},
      },
      {
        key: "body",
        label: "Body (JSON)",
        type: "json",
        placeholder: '{"key": "{{value}}"}',
        rows: 5,
        description: "Use {{variable}} to interpolate data from previous nodes",
        condition: (values) => values.method !== "GET",
      },
    ],
    zodSchema: z.object({
      method: z.string().optional(),
      url: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.string().optional(),
    }),
  },

  filter: {
    fields: [
      {
        key: "field",
        label: "Field",
        type: "text",
        placeholder: "status",
        required: true,
        description: "The key to check from the previous node's output",
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { label: "equals", value: "eq" },
          { label: "not equals", value: "neq" },
          { label: "contains", value: "contains" },
          { label: "does not contain", value: "not_contains" },
          { label: "greater than", value: "gt" },
          { label: "less than", value: "lt" },
          { label: "is truthy", value: "truthy" },
          { label: "is falsy", value: "falsy" },
        ],
        defaultValue: "eq",
      },
      {
        key: "value",
        label: "Value",
        type: "text",
        placeholder: "success",
        description: "Value to compare against (not needed for truthy/falsy)",
        condition: (v) => !["truthy", "falsy"].includes(v.operator as string),
      },
    ],
    zodSchema: z.object({
      field: z.string().optional(),
      operator: z.string().optional(),
      value: z.string().optional(),
    }),
  },

  transform: {
    fields: [
      {
        key: "mapping",
        label: "Output Mapping (JSON)",
        type: "json",
        placeholder: '{\n  "name": "{{user.name}}",\n  "email": "{{user.email}}"\n}',
        rows: 8,
        required: true,
        description: "Map data to a new shape. Use {{variable}} to reference previous node output.",
      },
    ],
    zodSchema: z.object({
      mapping: z.string().optional(),
    }),
  },

  delay: {
    fields: [
      {
        key: "delayMs",
        label: "Delay (milliseconds)",
        type: "number",
        placeholder: "1000",
        min: 0,
        defaultValue: 1000,
        description: "Duration to wait before continuing to the next node",
      },
    ],
    zodSchema: z.object({
      delayMs: z.coerce.number().min(0).optional(),
    }),
  },

  log: {
    fields: [
      { key: "message", label: "Message", type: "textarea", placeholder: "Logging: {{data}}", rows: 3, description: "Use {{variable}} to include data from previous nodes" },
    ],
    zodSchema: z.object({ message: z.string().optional() }),
  },

  // ── NEW REGISTRY NODES ───────────────────────────────────────────────────────

  "interval-trigger": {
    fields: [
      { key: "interval", label: "Interval (seconds)", type: "number", placeholder: "60", defaultValue: 60, min: 1, description: "Number of seconds between runs" },
    ],
    zodSchema: z.object({ interval: z.coerce.number().min(1).optional() }),
  },

  "ai-summarize": {
    fields: [
      { key: "text", label: "Text to Summarize", type: "textarea", placeholder: "{{content}}", rows: 3, required: true, description: "Use {{variable}} for dynamic content" },
      { key: "maxSentences", label: "Max Sentences", type: "number", min: 1, max: 20, defaultValue: 3 },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), maxSentences: z.coerce.number().optional(), model: z.string().optional() }),
  },

  "ai-translate": {
    fields: [
      { key: "text", label: "Text to Translate", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "targetLanguage", label: "Target Language", type: "text", placeholder: "Spanish", required: true, description: "e.g. Spanish, French, German, Japanese" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), targetLanguage: z.string().optional(), model: z.string().optional() }),
  },

  "ai-classify": {
    fields: [
      { key: "text", label: "Text to Classify", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "categories", label: "Categories", type: "text", placeholder: "positive, negative, neutral", required: true, description: "Comma-separated list of possible categories" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), categories: z.string().optional(), model: z.string().optional() }),
  },

  "ai-sentiment": {
    fields: [
      { key: "text", label: "Text", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), model: z.string().optional() }),
  },

  "ai-extract-json": {
    fields: [
      { key: "text", label: "Input Text", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "schema", label: "Schema (describe fields to extract)", type: "textarea", placeholder: '{"name":"string","email":"string"}', rows: 4, required: true, description: "Describe what to extract as a JSON shape" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), schema: z.string().optional(), model: z.string().optional() }),
  },

  "if-condition": {
    fields: [
      { key: "field", label: "Field to Check", type: "text", placeholder: "status", required: true, description: "Dot-notation path in the input (e.g. user.role)" },
      {
        key: "operator", label: "Operator", type: "select",
        options: [
          { label: "equals", value: "eq" }, { label: "not equals", value: "neq" },
          { label: "contains", value: "contains" }, { label: "does not contain", value: "not_contains" },
          { label: "greater than", value: "gt" }, { label: "less than", value: "lt" },
          { label: "is empty", value: "empty" }, { label: "is not empty", value: "not_empty" },
          { label: "is truthy", value: "truthy" }, { label: "is falsy", value: "falsy" },
        ],
        defaultValue: "eq",
      },
      { key: "value", label: "Value", type: "text", placeholder: "success", condition: (v) => !["truthy", "falsy", "empty", "not_empty"].includes(v.operator as string) },
    ],
    zodSchema: z.object({ field: z.string().optional(), operator: z.string().optional(), value: z.string().optional() }),
  },

  "merge": {
    fields: [
      { key: "data", label: "Data to Merge (JSON)", type: "json", placeholder: '{"key": "{{value}}"}', rows: 5, description: "JSON to merge into the current input. Use {{variable}} for dynamic values." },
    ],
    zodSchema: z.object({ data: z.string().optional() }),
  },

  "set-variable": {
    fields: [
      { key: "name", label: "Variable Name", type: "text", placeholder: "myVariable", required: true },
      { key: "value", label: "Value", type: "text", placeholder: "{{content}}", required: true, description: "Use {{variable}} to set from previous output" },
    ],
    zodSchema: z.object({ name: z.string().optional(), value: z.string().optional() }),
  },

  "get-variable": {
    fields: [
      { key: "name", label: "Variable Name", type: "text", placeholder: "myVariable", required: true },
      { key: "defaultValue", label: "Default Value", type: "text", placeholder: "(empty)", description: "Value to use if the variable is not set" },
    ],
    zodSchema: z.object({ name: z.string().optional(), defaultValue: z.string().optional() }),
  },

  "stop-workflow": {
    fields: [
      { key: "message", label: "Stop Message", type: "text", placeholder: "Workflow stopped: {{reason}}", description: "Optional message explaining why the workflow stopped" },
    ],
    zodSchema: z.object({ message: z.string().optional() }),
  },

  "json-parse": {
    fields: [
      { key: "json", label: "JSON String", type: "textarea", placeholder: "{{content}}", rows: 3, required: true, description: "Use {{variable}} to pass JSON from previous nodes" },
    ],
    zodSchema: z.object({ json: z.string().optional() }),
  },

  "json-stringify": {
    fields: [
      { key: "indent", label: "Pretty Print (indent spaces)", type: "number", min: 0, max: 8, defaultValue: 0, description: "Set to 2 or 4 for readable output" },
    ],
    zodSchema: z.object({ indent: z.coerce.number().min(0).max(8).optional() }),
  },

  "text-transform": {
    fields: [
      { key: "text", label: "Input Text", type: "text", placeholder: "{{content}}", required: true },
      {
        key: "operation", label: "Operation", type: "select",
        options: [
          { label: "Uppercase", value: "uppercase" }, { label: "Lowercase", value: "lowercase" },
          { label: "Title Case", value: "titlecase" }, { label: "Trim whitespace", value: "trim" },
          { label: "Replace", value: "replace" }, { label: "Regex Replace", value: "regex_replace" },
          { label: "Split to array", value: "split" }, { label: "Truncate", value: "truncate" },
          { label: "Reverse", value: "reverse" }, { label: "Remove HTML tags", value: "strip_html" },
          { label: "URL Encode", value: "url_encode" }, { label: "URL Decode", value: "url_decode" },
        ],
        defaultValue: "trim",
      },
      { key: "find", label: "Find", type: "text", placeholder: "hello", condition: (v) => ["replace", "regex_replace"].includes(v.operation as string) },
      { key: "replacement", label: "Replace With", type: "text", placeholder: "world", condition: (v) => ["replace", "regex_replace"].includes(v.operation as string) },
      { key: "separator", label: "Separator", type: "text", placeholder: ",", condition: (v) => v.operation === "split" },
      { key: "maxLength", label: "Max Length", type: "number", min: 1, defaultValue: 100, condition: (v) => v.operation === "truncate" },
    ],
    zodSchema: z.object({ text: z.string().optional(), operation: z.string().optional(), find: z.string().optional(), replacement: z.string().optional(), separator: z.string().optional(), maxLength: z.coerce.number().optional() }),
  },

  "date-format": {
    fields: [
      { key: "date", label: "Date Input", type: "text", placeholder: "{{createdAt}} or now", description: "Use 'now' for current time, or {{variable}} for dynamic dates" },
      {
        key: "outputFormat", label: "Output Format", type: "select",
        options: [
          { label: "ISO 8601 (2024-01-15T10:30:00Z)", value: "iso" },
          { label: "Date only (2024-01-15)", value: "date" },
          { label: "Time only (10:30:00)", value: "time" },
          { label: "US Date (01/15/2024)", value: "us" },
          { label: "Readable (January 15, 2024)", value: "readable" },
          { label: "Unix Timestamp", value: "unix" },
          { label: "Relative (2 hours ago)", value: "relative" },
        ],
        defaultValue: "iso",
      },
    ],
    zodSchema: z.object({ date: z.string().optional(), outputFormat: z.string().optional() }),
  },

  "math": {
    fields: [
      { key: "a", label: "Value A", type: "text", placeholder: "{{price}}", required: true, description: "First number or {{variable}}" },
      {
        key: "operation", label: "Operation", type: "select",
        options: [
          { label: "Add (A + B)", value: "add" }, { label: "Subtract (A - B)", value: "sub" },
          { label: "Multiply (A × B)", value: "mul" }, { label: "Divide (A / B)", value: "div" },
          { label: "Modulo (A % B)", value: "mod" }, { label: "Power (A ^ B)", value: "pow" },
          { label: "Round", value: "round" }, { label: "Floor", value: "floor" },
          { label: "Ceil", value: "ceil" }, { label: "Abs", value: "abs" },
          { label: "Percentage of B", value: "percent" },
        ],
        defaultValue: "add",
      },
      { key: "b", label: "Value B", type: "text", placeholder: "{{tax}}", condition: (v) => !["round", "floor", "ceil", "abs"].includes(v.operation as string) },
    ],
    zodSchema: z.object({ a: z.string().optional(), operation: z.string().optional(), b: z.string().optional() }),
  },

  "uuid": {
    fields: [
      { key: "count", label: "Count", type: "number", min: 1, max: 100, defaultValue: 1, description: "Number of UUIDs to generate" },
    ],
    zodSchema: z.object({ count: z.coerce.number().min(1).max(100).optional() }),
  },

  "base64": {
    fields: [
      { key: "text", label: "Input", type: "text", placeholder: "{{content}}", required: true },
      { key: "operation", label: "Operation", type: "select", options: [{ label: "Encode to Base64", value: "encode" }, { label: "Decode from Base64", value: "decode" }], defaultValue: "encode" },
    ],
    zodSchema: z.object({ text: z.string().optional(), operation: z.string().optional() }),
  },

  "hash": {
    fields: [
      { key: "text", label: "Input", type: "text", placeholder: "{{content}}", required: true },
      { key: "algorithm", label: "Algorithm", type: "select", options: [{ label: "SHA-256 (recommended)", value: "sha256" }, { label: "SHA-512", value: "sha512" }, { label: "SHA-1", value: "sha1" }, { label: "MD5", value: "md5" }], defaultValue: "sha256" },
      { key: "encoding", label: "Output Encoding", type: "select", options: [{ label: "Hex", value: "hex" }, { label: "Base64", value: "base64" }], defaultValue: "hex" },
    ],
    zodSchema: z.object({ text: z.string().optional(), algorithm: z.string().optional(), encoding: z.string().optional() }),
  },

  "regex": {
    fields: [
      { key: "text", label: "Input Text", type: "text", placeholder: "{{content}}", required: true },
      { key: "pattern", label: "Regex Pattern", type: "text", placeholder: "\\d+", required: true, description: "Regular expression pattern (without / delimiters)" },
      {
        key: "operation", label: "Operation", type: "select",
        options: [
          { label: "Test (true/false)", value: "test" }, { label: "Match first", value: "match" },
          { label: "Match all", value: "matchAll" }, { label: "Replace", value: "replace" },
          { label: "Extract groups", value: "groups" },
        ],
        defaultValue: "match",
      },
      { key: "replacement", label: "Replacement", type: "text", placeholder: "new value", condition: (v) => v.operation === "replace" },
      { key: "flags", label: "Flags", type: "text", placeholder: "gi", description: "g (global), i (case-insensitive), m (multiline)" },
    ],
    zodSchema: z.object({ text: z.string().optional(), pattern: z.string().optional(), operation: z.string().optional(), replacement: z.string().optional(), flags: z.string().optional() }),
  },

  "graphql": {
    fields: [
      { key: "url", label: "Endpoint URL", type: "text", placeholder: "https://api.example.com/graphql", required: true },
      { key: "headers", label: "Headers (JSON)", type: "json", placeholder: '{"Authorization": "Bearer {{token}}"}', rows: 3 },
      { key: "query", label: "Query or Mutation", type: "textarea", placeholder: `query {\n  user(id: "{{userId}}") {\n    name\n    email\n  }\n}`, rows: 8, required: true },
      { key: "variables", label: "Variables (JSON)", type: "json", placeholder: '{"userId": "{{userId}}"}', rows: 3, description: "GraphQL variables as JSON" },
    ],
    zodSchema: z.object({ url: z.string().optional(), headers: z.string().optional(), query: z.string().optional(), variables: z.string().optional() }),
  },

  "gmail-send": {
    fields: [
      { key: "to", label: "To", type: "text", placeholder: "user@example.com or {{email}}", required: true },
      { key: "cc", label: "CC", type: "text", placeholder: "cc@example.com", description: "Comma-separated email addresses" },
      { key: "subject", label: "Subject", type: "text", placeholder: "Hello {{name}}", required: true },
      { key: "body", label: "Body", type: "textarea", placeholder: "Hi {{name}},\n\n{{message}}", rows: 6, required: true },
      { key: "bodyType", label: "Body Type", type: "select", options: [{ label: "Plain Text", value: "plain" }, { label: "HTML", value: "html" }], defaultValue: "plain" },
    ],
    zodSchema: z.object({ to: z.string().optional(), cc: z.string().optional(), subject: z.string().optional(), body: z.string().optional(), bodyType: z.string().optional() }),
  },

  "gmail-get": {
    fields: [
      { key: "messageId", label: "Message ID", type: "text", placeholder: "{{messageId}}", required: true, description: "Gmail message ID from a previous trigger or node" },
    ],
    zodSchema: z.object({ messageId: z.string().optional() }),
  },

  "slack-message": {
    fields: [
      { key: "channel", label: "Channel", type: "text", placeholder: "#general or {{channel}}", required: true, description: "Channel name with # or channel ID" },
      { key: "text", label: "Message Text", type: "textarea", placeholder: "Hello {{name}}! New event: {{title}}", rows: 4, required: true, description: "Supports Slack markdown. Use {{variable}} for dynamic content." },
      { key: "username", label: "Bot Name (optional)", type: "text", placeholder: "AutoFlow Bot" },
      { key: "emoji", label: "Icon Emoji (optional)", type: "text", placeholder: ":robot_face:" },
    ],
    zodSchema: z.object({ channel: z.string().optional(), text: z.string().optional(), username: z.string().optional(), emoji: z.string().optional() }),
  },

  "discord-message": {
    fields: [
      { key: "mode", label: "Send via", type: "select", options: [{ label: "Webhook URL", value: "webhook" }, { label: "Bot + Channel ID", value: "bot" }], defaultValue: "webhook" },
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/...", condition: (v) => v.mode !== "bot", required: true },
      { key: "channelId", label: "Channel ID", type: "text", placeholder: "1234567890123456789", condition: (v) => v.mode === "bot", required: true },
      { key: "content", label: "Message", type: "textarea", placeholder: "{{notification}}", rows: 4, required: true },
      { key: "username", label: "Username Override", type: "text", placeholder: "AutoFlow Bot", condition: (v) => v.mode !== "bot" },
    ],
    zodSchema: z.object({ mode: z.string().optional(), webhookUrl: z.string().optional(), channelId: z.string().optional(), content: z.string().optional(), username: z.string().optional() }),
  },

  "notion-create": {
    fields: [
      { key: "databaseId", label: "Database ID", type: "text", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true, description: "Find in Notion URL or Share menu" },
      { key: "title", label: "Title", type: "text", placeholder: "{{subject}}", required: true },
      { key: "properties", label: "Properties (JSON)", type: "json", placeholder: '{"Status": "{{status}}", "Priority": "High"}', rows: 5, description: "Additional Notion database properties as key-value JSON" },
      { key: "content", label: "Page Content", type: "textarea", placeholder: "{{body}}", rows: 5, description: "Text content for the page body" },
    ],
    zodSchema: z.object({ databaseId: z.string().optional(), title: z.string().optional(), properties: z.string().optional(), content: z.string().optional() }),
  },

  "notion-update": {
    fields: [
      { key: "pageId", label: "Page ID", type: "text", placeholder: "{{pageId}}", required: true },
      { key: "properties", label: "Properties to Update (JSON)", type: "json", placeholder: '{"Status": "Done", "Reviewed": "{{reviewer}}"}', rows: 5, required: true, description: "Notion page properties to update as key-value JSON" },
    ],
    zodSchema: z.object({ pageId: z.string().optional(), properties: z.string().optional() }),
  },

  "github-issue": {
    fields: [
      { key: "owner", label: "Owner (username or org)", type: "text", placeholder: "myorg", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "my-repo", required: true },
      { key: "title", label: "Issue Title", type: "text", placeholder: "Bug: {{errorMessage}}", required: true },
      { key: "body", label: "Issue Body", type: "textarea", placeholder: "## Description\n\n{{description}}", rows: 6 },
      { key: "labels", label: "Labels", type: "text", placeholder: "bug, priority-high", description: "Comma-separated label names" },
      { key: "assignees", label: "Assignees", type: "text", placeholder: "username1, username2", description: "Comma-separated GitHub usernames" },
    ],
    zodSchema: z.object({ owner: z.string().optional(), repo: z.string().optional(), title: z.string().optional(), body: z.string().optional(), labels: z.string().optional(), assignees: z.string().optional() }),
  },

  "github-pr": {
    fields: [
      { key: "owner", label: "Owner", type: "text", placeholder: "myorg", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "my-repo", required: true },
      { key: "title", label: "PR Title", type: "text", placeholder: "Feature: {{featureName}}", required: true },
      { key: "body", label: "PR Description", type: "textarea", placeholder: "## Changes\n\n{{description}}", rows: 6 },
      { key: "head", label: "Head Branch", type: "text", placeholder: "feature/{{branchName}}", required: true, description: "The branch with your changes" },
      { key: "base", label: "Base Branch", type: "text", placeholder: "main", defaultValue: "main", description: "The branch to merge into" },
      { key: "draft", label: "Draft PR", type: "switch", defaultValue: false },
    ],
    zodSchema: z.object({ owner: z.string().optional(), repo: z.string().optional(), title: z.string().optional(), body: z.string().optional(), head: z.string().optional(), base: z.string().optional(), draft: z.boolean().optional() }),
  },

  "github-repo": {
    fields: [
      { key: "owner", label: "Owner", type: "text", placeholder: "octocat", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "Hello-World", required: true },
    ],
    zodSchema: z.object({ owner: z.string().optional(), repo: z.string().optional() }),
  },
};

export function getNodeSchema(type: string): NodeSchemaDefinition {
  return (NODE_SCHEMAS as Record<string, NodeSchemaDefinition>)[type] ?? { fields: [], zodSchema: z.object({}) };
}

export function getFieldDefault(field: FieldDefinition): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "switch") return false;
  if (field.type === "number") return "";
  if (field.type === "key-value") return {};
  if (field.type === "json") return "";
  return "";
}
