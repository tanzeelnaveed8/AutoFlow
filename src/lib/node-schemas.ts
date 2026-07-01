import { z } from "zod";
import type { NodeType } from "@/types";

export type FieldType =
  | "text"
  | "textarea"
  | "password"
  | "select"
  | "switch"
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
  { label: "o1 Mini", value: "o1-mini" },
  { label: "o1 Preview", value: "o1-preview" },
];

const NODE_SCHEMAS: Record<NodeType, NodeSchemaDefinition> = {
  "webhook-trigger": {
    fields: [],
    zodSchema: z.object({}),
  },

  "manual-trigger": {
    fields: [],
    zodSchema: z.object({}),
  },

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
        description: 'Use {{variable}} to interpolate data from previous nodes',
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
        description: 'Use {{variable}} to include data from previous nodes',
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
      {
        key: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Logging: {{data}}",
        rows: 3,
        description: 'Use {{variable}} to include data from previous nodes',
      },
    ],
    zodSchema: z.object({
      message: z.string().optional(),
    }),
  },
};

export function getNodeSchema(type: NodeType | string): NodeSchemaDefinition {
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
