import { z } from "zod";
import { interp } from "../helpers";
import type { NodePlugin } from "../base-types";

const OPENAI_MODELS = [
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
  { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
];

const CLAUDE_MODELS = [
  { label: "Claude Opus 4.8", value: "claude-opus-4-8" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
];

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY env var is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const d = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return d.choices[0]?.message?.content ?? "";
}

async function callClaude(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY env var is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
  const d = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return d.content.find((b) => b.type === "text")?.text ?? "";
}

export const AI_NODES: NodePlugin[] = [
  {
    id: "openai",
    name: "OpenAI Chat",
    category: "action",
    group: "AI",
    icon: "openai",
    color: "#10b981",
    bgColor: "#052e16",
    description: "Generate text with GPT-4o and other OpenAI models",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "content", label: "Generated Text", type: "string" }],
    configFields: [
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
      { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
      { key: "systemPrompt", label: "System Prompt", type: "textarea", placeholder: "You are a helpful assistant.", rows: 2 },
      { key: "prompt", label: "User Prompt", type: "textarea", placeholder: "Summarize: {{data}}", rows: 4, required: true, description: "Use {{variable}} to include data from previous nodes" },
    ],
    zodSchema: z.object({
      model: z.string().optional(),
      temperature: z.coerce.number().optional(),
      systemPrompt: z.string().optional(),
      prompt: z.string().optional(),
    }),
    execute: async (config, input) => {
      const content = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        (config.systemPrompt as string) ?? "You are a helpful assistant.",
        interp((config.prompt as string) ?? "", input)
      );
      return { content };
    },
  },
  {
    id: "anthropic",
    name: "Claude AI",
    category: "action",
    group: "AI",
    icon: "anthropic",
    color: "#d97706",
    bgColor: "#1c1008",
    description: "Generate text using Claude Opus, Sonnet or Haiku",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "content", label: "Generated Text", type: "string" }],
    configFields: [
      { key: "model", label: "Model", type: "select", options: CLAUDE_MODELS, defaultValue: "claude-opus-4-8" },
      { key: "systemPrompt", label: "System Prompt", type: "textarea", placeholder: "You are a helpful assistant.", rows: 2 },
      { key: "prompt", label: "User Prompt", type: "textarea", placeholder: "Analyze this: {{data}}", rows: 4, required: true, description: "Use {{variable}} for dynamic content" },
    ],
    zodSchema: z.object({
      model: z.string().optional(),
      systemPrompt: z.string().optional(),
      prompt: z.string().optional(),
    }),
    execute: async (config, input) => {
      const content = await callClaude(
        (config.model as string) ?? "claude-opus-4-8",
        (config.systemPrompt as string) ?? "You are a helpful assistant.",
        interp((config.prompt as string) ?? "", input)
      );
      return { content };
    },
  },
  {
    id: "ai-summarize",
    name: "AI Summarize",
    category: "action",
    group: "AI",
    icon: "sparkles",
    color: "#8b5cf6",
    bgColor: "#1e0f3a",
    description: "Summarize any text to a concise summary",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "summary", label: "Summary", type: "string" }],
    configFields: [
      { key: "text", label: "Text to Summarize", type: "textarea", placeholder: "{{content}}", rows: 3, required: true, description: "Use {{variable}} to pass text from previous nodes" },
      { key: "maxSentences", label: "Max Sentences", type: "number", min: 1, max: 20, defaultValue: 3 },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), maxSentences: z.coerce.number().optional(), model: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const max = (config.maxSentences as number) ?? 3;
      const summary = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        `Summarize the following text in at most ${max} sentences. Return only the summary, no preamble.`,
        text
      );
      return { summary, originalLength: text.length, summaryLength: summary.length };
    },
  },
  {
    id: "ai-translate",
    name: "AI Translate",
    category: "action",
    group: "AI",
    icon: "sparkles",
    color: "#06b6d4",
    bgColor: "#0a2233",
    description: "Translate text to any language using AI",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "translation", label: "Translation", type: "string" }],
    configFields: [
      { key: "text", label: "Text to Translate", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "targetLanguage", label: "Target Language", type: "text", placeholder: "Spanish", required: true, description: "e.g. Spanish, French, German, Japanese" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), targetLanguage: z.string().optional(), model: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const lang = (config.targetLanguage as string) ?? "English";
      const translation = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        `Translate the following text to ${lang}. Return only the translation, no preamble.`,
        text
      );
      return { translation, targetLanguage: lang };
    },
  },
  {
    id: "ai-classify",
    name: "AI Classify",
    category: "action",
    group: "AI",
    icon: "sparkles",
    color: "#ec4899",
    bgColor: "#2d0a1e",
    description: "Classify text into one of your defined categories",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "label", label: "Category", type: "string" }],
    configFields: [
      { key: "text", label: "Text to Classify", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "categories", label: "Categories", type: "text", placeholder: "positive, negative, neutral", required: true, description: "Comma-separated list of possible categories" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), categories: z.string().optional(), model: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const categories = ((config.categories as string) ?? "").split(",").map((c) => c.trim());
      const label = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        `Classify the text into exactly one of these categories: ${categories.join(", ")}. Return ONLY the category name, nothing else.`,
        text
      );
      return { label: label.trim(), categories, text };
    },
  },
  {
    id: "ai-sentiment",
    name: "AI Sentiment",
    category: "action",
    group: "AI",
    icon: "sparkles",
    color: "#f97316",
    bgColor: "#431407",
    description: "Analyze the sentiment of text (positive, negative, neutral)",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "sentiment", label: "Sentiment", type: "object" }],
    configFields: [
      { key: "text", label: "Text", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), model: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const result = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        `Analyze the sentiment of the text. Return JSON: {"sentiment":"positive|negative|neutral","score":0.0-1.0,"explanation":"one sentence"}. Return ONLY valid JSON.`,
        text
      );
      try {
        return { ...JSON.parse(result) as Record<string, unknown>, text };
      } catch {
        return { sentiment: result.trim(), text };
      }
    },
  },
  {
    id: "ai-extract-json",
    name: "AI Extract JSON",
    category: "action",
    group: "AI",
    icon: "sparkles",
    color: "#0ea5e9",
    bgColor: "#0c1a27",
    description: "Extract structured JSON data from unstructured text",
    inputs: [{ id: "text", label: "Text", type: "string" }],
    outputs: [{ id: "data", label: "Extracted Data", type: "object" }],
    configFields: [
      { key: "text", label: "Input Text", type: "textarea", placeholder: "{{content}}", rows: 3, required: true },
      { key: "schema", label: "JSON Schema (describe what to extract)", type: "textarea", placeholder: '{"name":"string","email":"string","amount":"number"}', rows: 4, required: true, description: "Describe the fields to extract as a JSON shape" },
      { key: "model", label: "Model", type: "select", options: OPENAI_MODELS, defaultValue: "gpt-4o-mini" },
    ],
    zodSchema: z.object({ text: z.string().optional(), schema: z.string().optional(), model: z.string().optional() }),
    execute: async (config, input) => {
      const text = interp((config.text as string) ?? "", input);
      const schema = (config.schema as string) ?? "{}";
      const result = await callOpenAI(
        (config.model as string) ?? "gpt-4o-mini",
        `Extract structured data from the text according to this schema: ${schema}. Return ONLY valid JSON matching the schema.`,
        text
      );
      try {
        return JSON.parse(result) as Record<string, unknown>;
      } catch {
        throw new Error(`AI returned invalid JSON: ${result.slice(0, 100)}`);
      }
    },
  },
];
