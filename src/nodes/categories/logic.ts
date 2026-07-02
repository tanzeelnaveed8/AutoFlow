import { z } from "zod";
import { interp, resolveField } from "../helpers";
import { StopWorkflowError } from "../base-types";
import type { NodePlugin } from "../base-types";

export const LOGIC_NODES: NodePlugin[] = [
  {
    id: "if-condition",
    name: "If Condition",
    category: "action",
    group: "Logic",
    icon: "git-branch",
    color: "#8b5cf6",
    bgColor: "#1e0f3a",
    description: "Continue only if a condition is true, otherwise stop",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "default", label: "Output (if true)", type: "any" }],
    configFields: [
      { key: "field", label: "Field to Check", type: "text", placeholder: "status", required: true, description: "Dot-notation path in the input (e.g. user.role)" },
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
          { label: "is empty", value: "empty" },
          { label: "is not empty", value: "not_empty" },
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
        condition: (v) => !["truthy", "falsy", "empty", "not_empty"].includes(v.operator as string),
      },
    ],
    zodSchema: z.object({ field: z.string().optional(), operator: z.string().optional(), value: z.string().optional() }),
    execute: async (config, input) => {
      const field = (config.field as string) ?? "";
      const operator = (config.operator as string) ?? "eq";
      const expected = (config.value as string) ?? "";
      const actual = resolveField(input, field);
      const actualStr = actual !== undefined ? String(actual) : "";
      let passed = false;
      switch (operator) {
        case "eq":          passed = actualStr === expected; break;
        case "neq":         passed = actualStr !== expected; break;
        case "contains":    passed = actualStr.includes(expected); break;
        case "not_contains":passed = !actualStr.includes(expected); break;
        case "gt":          passed = Number(actual) > Number(expected); break;
        case "lt":          passed = Number(actual) < Number(expected); break;
        case "empty":       passed = !actual || actualStr === ""; break;
        case "not_empty":   passed = !!actual && actualStr !== ""; break;
        case "truthy":      passed = Boolean(actual); break;
        case "falsy":       passed = !actual; break;
      }
      if (!passed) throw new StopWorkflowError(`Condition not met: "${field}" (${actualStr}) ${operator} "${expected}"`);
      return { passed: true, field, value: actual, ...input };
    },
  },
  {
    id: "filter",
    name: "Filter",
    category: "action",
    group: "Logic",
    icon: "filter",
    color: "#6366f1",
    bgColor: "#1e1b4b",
    description: "Stop the workflow if a condition is not met",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "default", label: "Output (passed)", type: "any" }],
    configFields: [
      { key: "field", label: "Field", type: "text", placeholder: "status", required: true },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          { label: "equals", value: "eq" }, { label: "not equals", value: "neq" },
          { label: "contains", value: "contains" }, { label: "does not contain", value: "not_contains" },
          { label: "greater than", value: "gt" }, { label: "less than", value: "lt" },
          { label: "is truthy", value: "truthy" }, { label: "is falsy", value: "falsy" },
        ],
        defaultValue: "eq",
      },
      { key: "value", label: "Value", type: "text", placeholder: "success", condition: (v) => !["truthy", "falsy"].includes(v.operator as string) },
    ],
    zodSchema: z.object({ field: z.string().optional(), operator: z.string().optional(), value: z.string().optional() }),
    execute: async (config, input) => {
      const field = (config.field as string) ?? "";
      const operator = (config.operator as string) ?? "eq";
      const expected = (config.value as string) ?? "";
      const actual = resolveField(input, field);
      const actualStr = actual !== undefined ? String(actual) : "";
      let passed = false;
      switch (operator) {
        case "eq":           passed = actualStr === expected; break;
        case "neq":          passed = actualStr !== expected; break;
        case "contains":     passed = actualStr.includes(expected); break;
        case "not_contains": passed = !actualStr.includes(expected); break;
        case "gt":           passed = Number(actual) > Number(expected); break;
        case "lt":           passed = Number(actual) < Number(expected); break;
        case "truthy":       passed = Boolean(actual); break;
        case "falsy":        passed = !actual; break;
      }
      if (!passed) throw new StopWorkflowError(`Filter: "${field}" (${actualStr}) ${operator} "${expected}" — condition not met`);
      return { passed: true, field, value: actual };
    },
  },
  {
    id: "merge",
    name: "Merge",
    category: "action",
    group: "Logic",
    icon: "git-merge",
    color: "#14b8a6",
    bgColor: "#042f2e",
    description: "Merge the current input with additional static data",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "merged", label: "Merged Data", type: "object" }],
    configFields: [
      {
        key: "data",
        label: "Data to Merge (JSON)",
        type: "json",
        placeholder: '{"key": "{{value}}", "static": "data"}',
        rows: 5,
        description: "JSON object to merge into the current input. Use {{variable}} for dynamic values.",
      },
    ],
    zodSchema: z.object({ data: z.string().optional() }),
    execute: async (config, input) => {
      const raw = interp((config.data as string) ?? "{}", input);
      try {
        const extra = JSON.parse(raw) as Record<string, unknown>;
        return { ...input, ...extra };
      } catch {
        throw new Error("Merge data is not valid JSON after interpolation");
      }
    },
  },
  {
    id: "transform",
    name: "Transform",
    category: "action",
    group: "Logic",
    icon: "code",
    color: "#06b6d4",
    bgColor: "#0a2233",
    description: "Reshape data into a new structure using template expressions",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "result", label: "Transformed Data", type: "object" }],
    configFields: [
      {
        key: "mapping",
        label: "Output Mapping (JSON)",
        type: "json",
        placeholder: '{\n  "name": "{{user.name}}",\n  "email": "{{user.email}}"\n}',
        rows: 8,
        required: true,
        description: "Map data to a new shape using {{variable}} expressions",
      },
    ],
    zodSchema: z.object({ mapping: z.string().optional() }),
    execute: async (config, input) => {
      const raw = interp((config.mapping as string) ?? "{}", input);
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error("Transform mapping produced invalid JSON after interpolation");
      }
    },
  },
  {
    id: "set-variable",
    name: "Set Variable",
    category: "action",
    group: "Logic",
    icon: "database",
    color: "#f59e0b",
    bgColor: "#1c1008",
    description: "Store a value in a workflow variable for later use",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "default", label: "Pass-through", type: "any" }],
    configFields: [
      { key: "name", label: "Variable Name", type: "text", placeholder: "myVariable", required: true },
      { key: "value", label: "Value", type: "text", placeholder: "{{content}}", required: true, description: "Use {{variable}} to set from previous node output" },
    ],
    zodSchema: z.object({ name: z.string().optional(), value: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const name = (config.name as string) ?? "";
      const value = interp((config.value as string) ?? "", input);
      if (ctx.variables) ctx.variables.set(name, value);
      return { ...input, [`$${name}`]: value };
    },
  },
  {
    id: "get-variable",
    name: "Get Variable",
    category: "action",
    group: "Logic",
    icon: "database",
    color: "#f59e0b",
    bgColor: "#1c1008",
    description: "Retrieve a previously stored workflow variable",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "value", label: "Variable Value", type: "any" }],
    configFields: [
      { key: "name", label: "Variable Name", type: "text", placeholder: "myVariable", required: true },
      { key: "defaultValue", label: "Default Value", type: "text", placeholder: "(empty)", description: "Value to use if the variable is not set" },
    ],
    zodSchema: z.object({ name: z.string().optional(), defaultValue: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const name = (config.name as string) ?? "";
      const fallback = (config.defaultValue as string) ?? "";
      const value = ctx.variables?.get(name) ?? fallback;
      return { ...input, [`$${name}`]: value, value };
    },
  },
  {
    id: "stop-workflow",
    name: "Stop Workflow",
    category: "action",
    group: "Logic",
    icon: "octagon",
    color: "#ef4444",
    bgColor: "#2c0a0a",
    description: "Immediately stop the workflow execution with an optional message",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [],
    configFields: [
      { key: "message", label: "Stop Message", type: "text", placeholder: "Workflow stopped: {{reason}}", description: "Optional message explaining why the workflow stopped" },
    ],
    zodSchema: z.object({ message: z.string().optional() }),
    execute: async (config, input) => {
      const message = interp((config.message as string) ?? "Workflow stopped", input);
      throw new StopWorkflowError(message);
    },
  },
  {
    id: "delay",
    name: "Delay",
    category: "action",
    group: "Logic",
    icon: "clock",
    color: "#f59e0b",
    bgColor: "#1c1008",
    description: "Wait for a specified duration before continuing",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "default", label: "Pass-through", type: "any" }],
    configFields: [
      {
        key: "delayMs",
        label: "Delay (milliseconds)",
        type: "number",
        min: 0,
        defaultValue: 1000,
        description: "Duration to wait. 1000ms = 1 second",
      },
    ],
    zodSchema: z.object({ delayMs: z.coerce.number().min(0).optional() }),
    execute: async (config, input) => {
      const ms = (config.delayMs as number) ?? 1000;
      await new Promise((r) => setTimeout(r, ms));
      return { delayed: true, ms, ...input };
    },
  },
];
