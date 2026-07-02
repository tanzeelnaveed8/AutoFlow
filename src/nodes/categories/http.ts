import { z } from "zod";
import { interp } from "../helpers";
import type { NodePlugin } from "../base-types";

export const HTTP_NODES: NodePlugin[] = [
  {
    id: "http-request",
    name: "HTTP Request",
    category: "action",
    group: "Developer",
    icon: "globe",
    color: "#6366f1",
    bgColor: "#1e1b4b",
    description: "Make any HTTP request — GET, POST, PUT, DELETE with custom headers and body",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "response", label: "Response", type: "object" }],
    configFields: [
      {
        key: "method",
        label: "Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ],
        defaultValue: "GET",
      },
      { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/endpoint", required: true, description: "Use {{variable}} for dynamic URLs" },
      {
        key: "headers",
        label: "Headers (JSON)",
        type: "json",
        placeholder: '{\n  "Authorization": "Bearer {{token}}",\n  "Content-Type": "application/json"\n}',
        rows: 4,
        description: "HTTP headers as JSON object",
      },
      {
        key: "body",
        label: "Body (JSON or text)",
        type: "json",
        placeholder: '{\n  "message": "{{content}}"\n}',
        rows: 5,
        condition: (v) => ["POST", "PUT", "PATCH"].includes(v.method as string),
        description: "Request body (JSON object or raw text). Supports {{variables}}.",
      },
      { key: "timeout", label: "Timeout (seconds)", type: "number", min: 1, max: 60, defaultValue: 30 },
    ],
    zodSchema: z.object({
      method: z.string().optional(),
      url: z.string().optional(),
      headers: z.string().optional(),
      body: z.string().optional(),
      timeout: z.coerce.number().min(1).max(60).optional(),
    }),
    execute: async (config, input) => {
      const method = (config.method as string) ?? "GET";
      const url = interp((config.url as string) ?? "", input);
      const timeoutMs = ((config.timeout as number) ?? 30) * 1000;
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.headers) {
        try {
          const raw = interp(config.headers as string, input);
          headers = { ...headers, ...(JSON.parse(raw) as Record<string, string>) };
        } catch { /* use defaults */ }
      }
      const fetchOptions: RequestInit = { method, headers, signal: AbortSignal.timeout(timeoutMs) };
      if (["POST", "PUT", "PATCH"].includes(method) && config.body) {
        const bodyStr = interp(config.body as string, input);
        fetchOptions.body = bodyStr;
      }
      const res = await fetch(url, fetchOptions);
      const contentType = res.headers.get("content-type") ?? "";
      let data: unknown;
      if (contentType.includes("application/json")) {
        data = await res.json() as unknown;
      } else {
        data = await res.text();
      }
      return {
        status: res.status,
        ok: res.ok,
        data,
        headers: Object.fromEntries(res.headers.entries()),
      };
    },
  },
  {
    id: "graphql",
    name: "GraphQL",
    category: "action",
    group: "Developer",
    icon: "globe",
    color: "#e535ab",
    bgColor: "#2d0a1e",
    description: "Execute a GraphQL query or mutation",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "data", label: "GraphQL Data", type: "object" }],
    configFields: [
      { key: "url", label: "Endpoint URL", type: "text", placeholder: "https://api.example.com/graphql", required: true },
      {
        key: "headers",
        label: "Headers (JSON)",
        type: "json",
        placeholder: '{"Authorization": "Bearer {{token}}"}',
        rows: 3,
      },
      {
        key: "query",
        label: "Query or Mutation",
        type: "textarea",
        placeholder: `query {\n  user(id: "{{userId}}") {\n    name\n    email\n  }\n}`,
        rows: 8,
        required: true,
      },
      {
        key: "variables",
        label: "Variables (JSON)",
        type: "json",
        placeholder: '{"userId": "{{userId}}"}',
        rows: 3,
        description: "GraphQL variables as JSON",
      },
    ],
    zodSchema: z.object({
      url: z.string().optional(),
      headers: z.string().optional(),
      query: z.string().optional(),
      variables: z.string().optional(),
    }),
    execute: async (config, input) => {
      const url = interp((config.url as string) ?? "", input);
      const query = interp((config.query as string) ?? "", input);
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.headers) {
        try { headers = { ...headers, ...(JSON.parse(interp(config.headers as string, input)) as Record<string, string>) }; } catch { /* ignore */ }
      }
      let variables: Record<string, unknown> = {};
      if (config.variables) {
        try { variables = JSON.parse(interp(config.variables as string, input)) as Record<string, unknown>; } catch { /* ignore */ }
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
      const result = await res.json() as { data?: unknown; errors?: unknown };
      if (result.errors) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      return { data: result.data as Record<string, unknown>, ...result };
    },
  },
];
