import { z } from "zod";
import { interp } from "../helpers";
import type { NodePlugin } from "../base-types";
import { createHash } from "crypto";

export const DATA_NODES: NodePlugin[] = [
  {
    id: "json-parse",
    name: "JSON Parse",
    category: "action",
    group: "Data",
    icon: "braces",
    color: "#f59e0b",
    bgColor: "#1c1008",
    description: "Parse a JSON string into an object",
    inputs: [{ id: "json", label: "JSON String", type: "string" }],
    outputs: [{ id: "data", label: "Parsed Object", type: "object" }],
    configFields: [
      { key: "json", label: "JSON String", type: "textarea", placeholder: '{{content}}', rows: 3, required: true, description: "Use {{variable}} to pass JSON from previous nodes" },
    ],
    zodSchema: z.object({ json: z.string().optional() }),
    execute: async (config, input) => {
      const raw = interp((config.json as string) ?? "", input);
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error(`JSON Parse failed: "${raw.slice(0, 100)}"`);
      }
    },
  },
  {
    id: "json-stringify",
    name: "JSON Stringify",
    category: "action",
    group: "Data",
    icon: "braces",
    color: "#f59e0b",
    bgColor: "#1c1008",
    description: "Convert an object to a JSON string",
    inputs: [{ id: "data", label: "Object", type: "object" }],
    outputs: [{ id: "json", label: "JSON String", type: "string" }],
    configFields: [
      { key: "indent", label: "Pretty Print (indent spaces)", type: "number", min: 0, max: 8, defaultValue: 0, description: "Set to 2 or 4 for readable output" },
    ],
    zodSchema: z.object({ indent: z.coerce.number().min(0).max(8).optional() }),
    execute: async (config, input) => {
      const indent = (config.indent as number) ?? 0;
      const json = JSON.stringify(input, null, indent || undefined);
      return { json, length: json.length };
    },
  },
  {
    id: "text-transform",
    name: "Text Transform",
    category: "action",
    group: "Data",
    icon: "type",
    color: "#06b6d4",
    bgColor: "#0a2233",
    description: "Transform text: uppercase, lowercase, trim, replace, and more",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "result", label: "Transformed Text", type: "string" }],
    configFields: [
      { key: "text", label: "Input Text", type: "text", placeholder: "{{content}}", required: true },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Uppercase", value: "uppercase" },
          { label: "Lowercase", value: "lowercase" },
          { label: "Title Case", value: "titlecase" },
          { label: "Trim whitespace", value: "trim" },
          { label: "Replace", value: "replace" },
          { label: "Regex Replace", value: "regex_replace" },
          { label: "Split to array", value: "split" },
          { label: "Truncate", value: "truncate" },
          { label: "Reverse", value: "reverse" },
          { label: "Remove HTML tags", value: "strip_html" },
          { label: "URL Encode", value: "url_encode" },
          { label: "URL Decode", value: "url_decode" },
        ],
        defaultValue: "trim",
      },
      { key: "find", label: "Find", type: "text", placeholder: "hello", condition: (v) => ["replace", "regex_replace"].includes(v.operation as string) },
      { key: "replacement", label: "Replace With", type: "text", placeholder: "world", condition: (v) => ["replace", "regex_replace"].includes(v.operation as string) },
      { key: "separator", label: "Separator", type: "text", placeholder: ",", condition: (v) => v.operation === "split" },
      { key: "maxLength", label: "Max Length", type: "number", min: 1, defaultValue: 100, condition: (v) => v.operation === "truncate" },
    ],
    zodSchema: z.object({
      text: z.string().optional(), operation: z.string().optional(),
      find: z.string().optional(), replacement: z.string().optional(),
      separator: z.string().optional(), maxLength: z.coerce.number().optional(),
    }),
    execute: async (config, input) => {
      let text = interp((config.text as string) ?? "", input);
      const op = (config.operation as string) ?? "trim";
      switch (op) {
        case "uppercase":     text = text.toUpperCase(); break;
        case "lowercase":     text = text.toLowerCase(); break;
        case "titlecase":     text = text.replace(/\b\w/g, (c) => c.toUpperCase()); break;
        case "trim":          text = text.trim(); break;
        case "replace":       text = text.replaceAll((config.find as string) ?? "", (config.replacement as string) ?? ""); break;
        case "regex_replace": text = text.replace(new RegExp((config.find as string) ?? "", "g"), (config.replacement as string) ?? ""); break;
        case "split":         return { result: text.split((config.separator as string) ?? ","), original: text };
        case "truncate":      text = text.slice(0, (config.maxLength as number) ?? 100); break;
        case "reverse":       text = text.split("").reverse().join(""); break;
        case "strip_html":    text = text.replace(/<[^>]*>/g, ""); break;
        case "url_encode":    text = encodeURIComponent(text); break;
        case "url_decode":    text = decodeURIComponent(text); break;
      }
      return { result: text, length: text.length };
    },
  },
  {
    id: "date-format",
    name: "Date Format",
    category: "action",
    group: "Data",
    icon: "calendar",
    color: "#ec4899",
    bgColor: "#2d0a1e",
    description: "Format, parse, or calculate with dates and times",
    inputs: [{ id: "date", label: "Date", type: "string" }],
    outputs: [{ id: "formatted", label: "Formatted Date", type: "string" }],
    configFields: [
      { key: "date", label: "Date Input", type: "text", placeholder: "{{createdAt}} or now", description: "Use 'now' for current time, or {{variable}} for dynamic dates" },
      {
        key: "outputFormat",
        label: "Output Format",
        type: "select",
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
    execute: async (config, input) => {
      const raw = interp((config.date as string) ?? "now", input);
      const d = raw.toLowerCase() === "now" ? new Date() : new Date(raw);
      if (isNaN(d.getTime())) throw new Error(`Cannot parse date: "${raw}"`);
      const fmt = (config.outputFormat as string) ?? "iso";
      let formatted: string;
      switch (fmt) {
        case "iso":      formatted = d.toISOString(); break;
        case "date":     formatted = d.toISOString().split("T")[0]; break;
        case "time":     formatted = d.toISOString().split("T")[1].split(".")[0]; break;
        case "us":       formatted = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`; break;
        case "readable": formatted = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); break;
        case "unix":     formatted = String(Math.floor(d.getTime() / 1000)); break;
        case "relative": {
          const diff = Date.now() - d.getTime();
          const secs = Math.abs(Math.floor(diff / 1000));
          const mins = Math.floor(secs / 60);
          const hrs = Math.floor(mins / 60);
          const days = Math.floor(hrs / 24);
          const past = diff > 0;
          if (secs < 60) formatted = `${secs} seconds ${past ? "ago" : "from now"}`;
          else if (mins < 60) formatted = `${mins} minutes ${past ? "ago" : "from now"}`;
          else if (hrs < 24) formatted = `${hrs} hours ${past ? "ago" : "from now"}`;
          else formatted = `${days} days ${past ? "ago" : "from now"}`;
          break;
        }
        default: formatted = d.toISOString();
      }
      return { formatted, iso: d.toISOString(), timestamp: d.getTime() };
    },
  },
  {
    id: "math",
    name: "Math",
    category: "action",
    group: "Data",
    icon: "calculator",
    color: "#84cc16",
    bgColor: "#1a2e05",
    description: "Perform math operations: add, subtract, multiply, divide, round, and more",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "result", label: "Result", type: "number" }],
    configFields: [
      { key: "a", label: "Value A", type: "text", placeholder: "{{price}}", required: true, description: "First number or {{variable}}" },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Add (A + B)", value: "add" },
          { label: "Subtract (A - B)", value: "sub" },
          { label: "Multiply (A × B)", value: "mul" },
          { label: "Divide (A / B)", value: "div" },
          { label: "Modulo (A % B)", value: "mod" },
          { label: "Power (A ^ B)", value: "pow" },
          { label: "Round", value: "round" },
          { label: "Floor", value: "floor" },
          { label: "Ceil", value: "ceil" },
          { label: "Abs", value: "abs" },
          { label: "Percentage of B", value: "percent" },
        ],
        defaultValue: "add",
      },
      { key: "b", label: "Value B", type: "text", placeholder: "{{tax}}", condition: (v) => !["round", "floor", "ceil", "abs"].includes(v.operation as string) },
    ],
    zodSchema: z.object({ a: z.string().optional(), operation: z.string().optional(), b: z.string().optional() }),
    execute: async (config, input) => {
      const a = Number(interp((config.a as string) ?? "0", input));
      const b = Number(interp((config.b as string) ?? "0", input));
      const op = (config.operation as string) ?? "add";
      let result: number;
      switch (op) {
        case "add":     result = a + b; break;
        case "sub":     result = a - b; break;
        case "mul":     result = a * b; break;
        case "div":     if (b === 0) throw new Error("Division by zero"); result = a / b; break;
        case "mod":     result = a % b; break;
        case "pow":     result = Math.pow(a, b); break;
        case "round":   result = Math.round(a); break;
        case "floor":   result = Math.floor(a); break;
        case "ceil":    result = Math.ceil(a); break;
        case "abs":     result = Math.abs(a); break;
        case "percent": result = (a / b) * 100; break;
        default:        result = a;
      }
      return { result, a, b, operation: op };
    },
  },
  {
    id: "uuid",
    name: "Generate UUID",
    category: "action",
    group: "Data",
    icon: "fingerprint",
    color: "#6366f1",
    bgColor: "#1e1b4b",
    description: "Generate a random UUID v4",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "uuid", label: "UUID", type: "string" }],
    configFields: [
      { key: "count", label: "Count", type: "number", min: 1, max: 100, defaultValue: 1, description: "Number of UUIDs to generate" },
    ],
    zodSchema: z.object({ count: z.coerce.number().min(1).max(100).optional() }),
    execute: async (config, input) => {
      const count = (config.count as number) ?? 1;
      const uuids = Array.from({ length: count }, () => crypto.randomUUID());
      return { ...input, uuid: uuids[0], uuids };
    },
  },
  {
    id: "base64",
    name: "Base64",
    category: "action",
    group: "Data",
    icon: "binary",
    color: "#14b8a6",
    bgColor: "#042f2e",
    description: "Encode or decode data with Base64",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "result", label: "Result", type: "string" }],
    configFields: [
      { key: "text", label: "Input", type: "text", placeholder: "{{content}}", required: true },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Encode to Base64", value: "encode" },
          { label: "Decode from Base64", value: "decode" },
        ],
        defaultValue: "encode",
      },
    ],
    zodSchema: z.object({ text: z.string().optional(), operation: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const op = (config.operation as string) ?? "encode";
      const result = op === "encode"
        ? Buffer.from(text, "utf-8").toString("base64")
        : Buffer.from(text, "base64").toString("utf-8");
      return { result, operation: op };
    },
  },
  {
    id: "hash",
    name: "Hash",
    category: "action",
    group: "Data",
    icon: "hash",
    color: "#8b5cf6",
    bgColor: "#1e0f3a",
    description: "Hash text with MD5, SHA-1, SHA-256, or SHA-512",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "hash", label: "Hash", type: "string" }],
    configFields: [
      { key: "text", label: "Input", type: "text", placeholder: "{{content}}", required: true },
      {
        key: "algorithm",
        label: "Algorithm",
        type: "select",
        options: [
          { label: "SHA-256 (recommended)", value: "sha256" },
          { label: "SHA-512", value: "sha512" },
          { label: "SHA-1", value: "sha1" },
          { label: "MD5", value: "md5" },
        ],
        defaultValue: "sha256",
      },
      {
        key: "encoding",
        label: "Output Encoding",
        type: "select",
        options: [{ label: "Hex", value: "hex" }, { label: "Base64", value: "base64" }],
        defaultValue: "hex",
      },
    ],
    zodSchema: z.object({ text: z.string().optional(), algorithm: z.string().optional(), encoding: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const algo = (config.algorithm as string) ?? "sha256";
      const enc = ((config.encoding as string) ?? "hex") as "hex" | "base64";
      const hash = createHash(algo).update(text).digest(enc);
      return { hash, algorithm: algo, encoding: enc };
    },
  },
  {
    id: "regex",
    name: "Regex",
    category: "action",
    group: "Data",
    icon: "regex",
    color: "#f97316",
    bgColor: "#431407",
    description: "Test and extract data with regular expressions",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "match", label: "Match", type: "string" }],
    configFields: [
      { key: "text", label: "Input Text", type: "text", placeholder: "{{content}}", required: true },
      { key: "pattern", label: "Regex Pattern", type: "text", placeholder: "\\d+", required: true, description: "Regular expression pattern (without / delimiters)" },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Test (true/false)", value: "test" },
          { label: "Match first", value: "match" },
          { label: "Match all", value: "matchAll" },
          { label: "Replace", value: "replace" },
          { label: "Extract groups", value: "groups" },
        ],
        defaultValue: "match",
      },
      { key: "replacement", label: "Replacement", type: "text", placeholder: "new value", condition: (v) => v.operation === "replace" },
      {
        key: "flags",
        label: "Flags",
        type: "text",
        placeholder: "gi",
        description: "Regex flags: g (global), i (case-insensitive), m (multiline)",
      },
    ],
    zodSchema: z.object({
      text: z.string().optional(), pattern: z.string().optional(),
      operation: z.string().optional(), replacement: z.string().optional(), flags: z.string().optional(),
    }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const pattern = (config.pattern as string) ?? "";
      const flags = (config.flags as string) ?? "";
      const op = (config.operation as string) ?? "match";
      const re = new RegExp(pattern, flags);
      switch (op) {
        case "test":     return { result: re.test(text), matches: re.test(text) };
        case "match":    { const m = text.match(re); return { match: m?.[0] ?? null, found: m !== null }; }
        case "matchAll": { const all = [...text.matchAll(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"))].map((m) => m[0]); return { matches: all, count: all.length }; }
        case "replace":  return { result: text.replace(re, (config.replacement as string) ?? "") };
        case "groups":   { const gm = text.match(re); return { match: gm?.[0] ?? null, groups: gm?.groups ?? {}, captures: gm ? [...gm].slice(1) : [] }; }
        default: return { text };
      }
    },
  },
];
