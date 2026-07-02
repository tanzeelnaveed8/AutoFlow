import { db } from "@/lib/db";
import type { WorkflowNode, WorkflowEdge } from "@prisma/client";
import { WorkflowNodeConfig, WorkflowNodeData, WorkflowEdgeData } from "@/types";
import { getNode } from "@/nodes/registry";
import { StopWorkflowError } from "@/nodes/base-types";

type NodeOutput = Record<string, unknown>;

export interface ExecutionContext {
  userId?: string;
  variables?: Map<string, unknown>;
}

export function interpolateTemplate(
  template: string,
  data: NodeOutput
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
    const keys = key.split(".");
    let value: unknown = data;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

async function getAccessToken(slug: string, userId?: string): Promise<string> {
  if (!userId) {
    throw new Error(
      `This node requires ${slug} to be connected. Go to Integrations to connect it.`
    );
  }
  const row = await db.userIntegration.findFirst({ where: { userId, slug } });
  if (!row?.accessToken) {
    throw new Error(
      `${slug} is not connected. Go to Integrations and connect it first.`
    );
  }
  return row.accessToken;
}

export async function executeNodeStandalone(
  nodeType: string,
  config: WorkflowNodeConfig,
  input: NodeOutput,
  ctx?: ExecutionContext
): Promise<NodeOutput> {
  // Try the plugin registry first — handles all new node types
  const plugin = getNode(nodeType);
  if (plugin) {
    return plugin.execute(config, input, {
      userId: ctx?.userId,
      variables: ctx?.variables ?? new Map(),
    });
  }

  // Legacy switch statement for backward compatibility with old node IDs stored in DB
  const interp = (s: string) => interpolateTemplate(s, input);

  switch (nodeType) {
    // ── Triggers ──────────────────────────────────────────────
    case "manual-trigger":
    case "webhook-trigger":
    case "schedule-trigger":
    case "gmail-trigger":
      return { trigger: nodeType, data: input };

    // ── AI: OpenAI ────────────────────────────────────────────
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY env var is not set");
      const prompt = interp((config.prompt as string | undefined) ?? "");
      const systemPrompt = (config.systemPrompt as string | undefined) ?? "You are a helpful assistant.";
      const model = (config.model as string | undefined) ?? "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
      const result = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return { content: result.choices[0]?.message?.content ?? "" };
    }

    // ── AI: Anthropic Claude ──────────────────────────────────
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY env var is not set");
      const prompt = interp((config.prompt as string | undefined) ?? "");
      const systemPrompt = (config.systemPrompt as string | undefined) ?? "You are a helpful assistant.";
      const model = (config.model as string | undefined) ?? "claude-opus-4-8";
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
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
      const result = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
      };
      const text = result.content.find((b) => b.type === "text")?.text ?? "";
      return { content: text };
    }

    // ── Gmail: Send Email ─────────────────────────────────────
    case "gmail-send-email": {
      const token = await getAccessToken("gmail", ctx?.userId);
      const to = interp((config.to as string | undefined) ?? "");
      const subject = interp((config.subject as string | undefined) ?? "");
      const body = interp((config.body as string | undefined) ?? "");
      const isHtml = (config.isHtml as boolean | undefined) ?? false;

      const contentType = isHtml ? "text/html" : "text/plain";
      const raw = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        body,
      ].join("\r\n");

      const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );
      if (!res.ok) throw new Error(`Gmail send error: ${await res.text()}`);
      const data = (await res.json()) as { id: string; threadId: string };
      return { messageId: data.id, threadId: data.threadId, to, subject };
    }

    // ── Gmail: Get Email ──────────────────────────────────────
    case "gmail-get-email": {
      const token = await getAccessToken("gmail", ctx?.userId);
      const messageId = interp((config.messageId as string | undefined) ?? "");
      const query = interp((config.query as string | undefined) ?? "");

      let id = messageId;
      if (!id && query) {
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!listRes.ok) throw new Error(`Gmail list error: ${await listRes.text()}`);
        const list = (await listRes.json()) as { messages?: Array<{ id: string }> };
        id = list.messages?.[0]?.id ?? "";
      }

      if (!id) throw new Error("No messageId provided and query returned no results");

      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Gmail get error: ${await res.text()}`);
      const msg = (await res.json()) as {
        id: string;
        threadId: string;
        snippet: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          body?: { data?: string };
          parts?: Array<{ mimeType: string; body: { data?: string } }>;
        };
      };

      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

      const bodyData =
        msg.payload?.body?.data ??
        msg.payload?.parts?.find((p) => p.mimeType === "text/plain")?.body?.data ??
        "";
      const decodedBody = bodyData
        ? Buffer.from(bodyData.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
        : msg.snippet;

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        body: decodedBody,
        snippet: msg.snippet,
      };
    }

    // ── Slack: Send Message ───────────────────────────────────
    case "slack-send-message": {
      const token = await getAccessToken("slack", ctx?.userId);
      const channel = interp((config.channel as string | undefined) ?? "");
      const text = interp((config.text as string | undefined) ?? "");
      const username = (config.username as string | undefined) ?? "AutoFlow";

      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel, text, username }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { ok: true, ts: data.ts, channel: data.channel };
    }

    // ── Slack: DM ─────────────────────────────────────────────
    case "slack-dm": {
      const token = await getAccessToken("slack", ctx?.userId);
      const user = interp((config.user as string | undefined) ?? "");
      const text = interp((config.text as string | undefined) ?? "");

      // Open DM channel first
      const openRes = await fetch("https://slack.com/api/conversations.open", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ users: user }),
      });
      const openData = (await openRes.json()) as { ok: boolean; error?: string; channel?: { id: string } };
      if (!openData.ok) throw new Error(`Slack DM open error: ${openData.error}`);

      const dmChannel = openData.channel?.id;
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: dmChannel, text }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; ts?: string };
      if (!data.ok) throw new Error(`Slack DM error: ${data.error}`);
      return { ok: true, ts: data.ts, dmChannel };
    }

    // ── Discord: Send Message ─────────────────────────────────
    case "discord-send-message": {
      const webhookUrl = (config.webhookUrl as string | undefined) ?? "";
      if (!webhookUrl) throw new Error("Webhook URL is required for Discord");
      const content = interp((config.content as string | undefined) ?? "");
      const username = (config.username as string | undefined) ?? "AutoFlow";

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, username }),
      });
      if (!res.ok) throw new Error(`Discord webhook error: ${res.status} ${res.statusText}`);
      return { sent: true, channel: webhookUrl.split("/").at(-2) };
    }

    // ── Notion: Create Page ───────────────────────────────────
    case "notion-create-page": {
      const token = await getAccessToken("notion", ctx?.userId);
      const databaseId = interp((config.databaseId as string | undefined) ?? "");
      const title = interp((config.title as string | undefined) ?? "Untitled");
      let extraProps: Record<string, unknown> = {};
      if (config.properties) {
        try {
          const mapped = interpolateTemplate(config.properties as string, input);
          extraProps = JSON.parse(mapped) as Record<string, unknown>;
        } catch {
          throw new Error("Properties JSON is invalid");
        }
      }

      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            title: { title: [{ text: { content: title } }] },
            ...extraProps,
          },
        }),
      });
      if (!res.ok) throw new Error(`Notion create error: ${await res.text()}`);
      const page = (await res.json()) as { id: string; url: string };
      return { pageId: page.id, url: page.url, title };
    }

    // ── Notion: Update Page ───────────────────────────────────
    case "notion-update-page": {
      const token = await getAccessToken("notion", ctx?.userId);
      const pageId = interp((config.pageId as string | undefined) ?? "");
      if (!pageId) throw new Error("Page ID is required");

      let properties: Record<string, unknown> = {};
      if (config.properties) {
        try {
          const mapped = interpolateTemplate(config.properties as string, input);
          properties = JSON.parse(mapped) as Record<string, unknown>;
        } catch {
          throw new Error("Properties JSON is invalid");
        }
      }

      const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) throw new Error(`Notion update error: ${await res.text()}`);
      const page = (await res.json()) as { id: string; url: string };
      return { pageId: page.id, url: page.url, updated: true };
    }

    // ── Notion: Search ────────────────────────────────────────
    case "notion-search": {
      const token = await getAccessToken("notion", ctx?.userId);
      const query = interp((config.query as string | undefined) ?? "");
      const filter = (config.filter as string | undefined) ?? "";

      const body: Record<string, unknown> = { query };
      if (filter) body.filter = { value: filter, property: "object" };

      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Notion search error: ${await res.text()}`);
      const data = (await res.json()) as { results: unknown[]; has_more: boolean };
      return { results: data.results, count: data.results.length, hasMore: data.has_more };
    }

    // ── GitHub: Create Issue ──────────────────────────────────
    case "github-create-issue": {
      const token = await getAccessToken("github", ctx?.userId);
      const owner = interp((config.owner as string | undefined) ?? "");
      const repo = interp((config.repo as string | undefined) ?? "");
      const title = interp((config.title as string | undefined) ?? "");
      const body = interp((config.body as string | undefined) ?? "");
      const labelsStr = (config.labels as string | undefined) ?? "";
      const labels = labelsStr ? labelsStr.split(",").map((l) => l.trim()) : [];

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({ title, body, labels }),
        }
      );
      if (!res.ok) throw new Error(`GitHub issue error: ${await res.text()}`);
      const issue = (await res.json()) as { number: number; html_url: string; title: string };
      return { issueNumber: issue.number, url: issue.html_url, title: issue.title };
    }

    // ── GitHub: Create PR ─────────────────────────────────────
    case "github-create-pr": {
      const token = await getAccessToken("github", ctx?.userId);
      const owner = interp((config.owner as string | undefined) ?? "");
      const repo = interp((config.repo as string | undefined) ?? "");
      const title = interp((config.title as string | undefined) ?? "");
      const head = interp((config.head as string | undefined) ?? "");
      const base = interp((config.base as string | undefined) ?? "main");
      const body = interp((config.body as string | undefined) ?? "");

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({ title, head, base, body }),
        }
      );
      if (!res.ok) throw new Error(`GitHub PR error: ${await res.text()}`);
      const pr = (await res.json()) as { number: number; html_url: string; title: string };
      return { prNumber: pr.number, url: pr.html_url, title: pr.title };
    }

    // ── GitHub: Get Repo ──────────────────────────────────────
    case "github-get-repo": {
      const token = await getAccessToken("github", ctx?.userId);
      const owner = interp((config.owner as string | undefined) ?? "");
      const repo = interp((config.repo as string | undefined) ?? "");

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!res.ok) throw new Error(`GitHub repo error: ${await res.text()}`);
      const data = (await res.json()) as {
        full_name: string;
        description: string | null;
        stargazers_count: number;
        open_issues_count: number;
        forks_count: number;
        html_url: string;
        default_branch: string;
      };
      return {
        fullName: data.full_name,
        description: data.description,
        stars: data.stargazers_count,
        openIssues: data.open_issues_count,
        forks: data.forks_count,
        url: data.html_url,
        defaultBranch: data.default_branch,
      };
    }

    // ── Google Sheets: Add Row ────────────────────────────────
    case "sheets-add-row": {
      const token = await getAccessToken("google-sheets", ctx?.userId);
      const spreadsheetId = interp((config.spreadsheetId as string | undefined) ?? "");
      const range = interp((config.range as string | undefined) ?? "Sheet1");
      const valuesStr = interpolateTemplate((config.values as string | undefined) ?? "[]", input);
      let values: unknown[][];
      try {
        const parsed = JSON.parse(valuesStr) as unknown;
        values = Array.isArray(parsed) && Array.isArray(parsed[0])
          ? (parsed as unknown[][])
          : [parsed as unknown[]];
      } catch {
        throw new Error("Row values must be a valid JSON array");
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );
      if (!res.ok) throw new Error(`Sheets add row error: ${await res.text()}`);
      const data = (await res.json()) as { updates?: { updatedRange: string; updatedRows: number } };
      return {
        updatedRange: data.updates?.updatedRange,
        updatedRows: data.updates?.updatedRows,
        added: true,
      };
    }

    // ── Google Sheets: Get Rows ───────────────────────────────
    case "sheets-get-rows": {
      const token = await getAccessToken("google-sheets", ctx?.userId);
      const spreadsheetId = interp((config.spreadsheetId as string | undefined) ?? "");
      const range = interp((config.range as string | undefined) ?? "Sheet1");

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Sheets get rows error: ${await res.text()}`);
      const data = (await res.json()) as { values?: unknown[][]; range: string };
      return {
        rows: data.values ?? [],
        count: (data.values ?? []).length,
        range: data.range,
      };
    }

    // ── Google Sheets: Update Row ─────────────────────────────
    case "sheets-update-row": {
      const token = await getAccessToken("google-sheets", ctx?.userId);
      const spreadsheetId = interp((config.spreadsheetId as string | undefined) ?? "");
      const range = interp((config.range as string | undefined) ?? "");
      const valuesStr = interpolateTemplate((config.values as string | undefined) ?? "[]", input);
      let values: unknown[][];
      try {
        const parsed = JSON.parse(valuesStr) as unknown;
        values = Array.isArray(parsed) && Array.isArray(parsed[0])
          ? (parsed as unknown[][])
          : [parsed as unknown[]];
      } catch {
        throw new Error("Values must be a valid JSON array");
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );
      if (!res.ok) throw new Error(`Sheets update error: ${await res.text()}`);
      const data = (await res.json()) as { updatedRange: string; updatedRows: number };
      return { updatedRange: data.updatedRange, updatedRows: data.updatedRows, updated: true };
    }

    // ── HTTP Request ──────────────────────────────────────────
    case "http-request": {
      const url = (config.url as string | undefined) ?? "";
      if (!url) throw new Error("URL is required");
      const method = (config.method as string | undefined) ?? "GET";
      const headers: Record<string, string> =
        (config.headers as Record<string, string> | undefined) ?? {};
      let body: string | undefined;
      if (config.body && method !== "GET") {
        body = interpolateTemplate(config.body as string, input);
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body,
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: res.status, statusText: res.statusText, data };
    }

    // ── Filter ────────────────────────────────────────────────
    case "filter": {
      const field = (config.field as string | undefined) ?? "";
      const operator = (config.operator as string | undefined) ?? "eq";
      const expectedValue = (config.value as string | undefined) ?? "";

      const keys = field.split(".");
      let actual: unknown = input;
      for (const k of keys) {
        if (actual && typeof actual === "object") {
          actual = (actual as Record<string, unknown>)[k];
        } else {
          actual = undefined;
          break;
        }
      }

      let passed = false;
      const actualStr = actual !== undefined ? String(actual) : "";

      switch (operator) {
        case "eq":         passed = actualStr === expectedValue; break;
        case "neq":        passed = actualStr !== expectedValue; break;
        case "contains":   passed = actualStr.includes(expectedValue); break;
        case "not_contains": passed = !actualStr.includes(expectedValue); break;
        case "gt":         passed = Number(actual) > Number(expectedValue); break;
        case "lt":         passed = Number(actual) < Number(expectedValue); break;
        case "truthy":     passed = Boolean(actual); break;
        case "falsy":      passed = !actual; break;
      }

      if (!passed) {
        throw new Error(
          `Filter condition not met: "${field}" (${actualStr}) ${operator} "${expectedValue}"`
        );
      }
      return { passed: true, field, value: actual };
    }

    // ── Transform ─────────────────────────────────────────────
    case "transform": {
      const mappingStr = (config.mapping as string | undefined) ?? "{}";
      const interpolated = interpolateTemplate(mappingStr, input);
      try {
        const result = JSON.parse(interpolated) as Record<string, unknown>;
        return result;
      } catch {
        throw new Error("Transform mapping produced invalid JSON after interpolation");
      }
    }

    // ── Delay ─────────────────────────────────────────────────
    case "delay": {
      const ms = (config.delayMs as number | undefined) ?? 1000;
      await new Promise((r) => setTimeout(r, ms));
      return { delayed: true, ms };
    }

    // ── Log ───────────────────────────────────────────────────
    case "log": {
      const message = interpolateTemplate(
        (config.message as string | undefined) ?? "Log node executed",
        input
      );
      return { logged: true, message, input };
    }

    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

export class WorkflowEngine {
  private executionId: string;
  private userId: string;

  constructor(executionId: string, userId: string) {
    this.executionId = executionId;
    this.userId = userId;
  }

  async execute(
    nodes: WorkflowNodeData[],
    edges: WorkflowEdgeData[],
    triggerData?: unknown
  ) {
    await db.execution.update({
      where: { id: this.executionId },
      data: { status: "RUNNING" },
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const executionOrder = this.topologicalSort(nodes, edges);
    const outputs: Map<string, NodeOutput> = new Map();
    const ctx: ExecutionContext = { userId: this.userId, variables: new Map() };

    try {
      for (const nodeId of executionOrder) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const incomingEdges = edges.filter((e) => e.target === nodeId);
        const inputData: NodeOutput = {};

        for (const edge of incomingEdges) {
          const sourceOutput = outputs.get(edge.source);
          if (sourceOutput) Object.assign(inputData, sourceOutput);
        }

        const registryPlugin = getNode(node.type);
        const isTrigger = registryPlugin
          ? registryPlugin.category === "trigger"
          : ["webhook-trigger", "manual-trigger", "schedule-trigger", "gmail-trigger", "interval-trigger"].includes(node.type);
        if (isTrigger) Object.assign(inputData, triggerData ?? {});

        const logEntry = await db.executionLog.create({
          data: {
            executionId: this.executionId,
            nodeId: node.id,
            nodeType: node.type,
            status: "RUNNING",
            input: inputData as unknown as import("@prisma/client").Prisma.InputJsonValue,
          },
        });

        try {
          const output = await this.executeNode(node, inputData, ctx);
          outputs.set(nodeId, output);

          await db.executionLog.update({
            where: { id: logEntry.id },
            data: {
              status: "SUCCESS",
              output: output as unknown as import("@prisma/client").Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
        } catch (nodeError) {
          if (nodeError instanceof StopWorkflowError) {
            await db.executionLog.update({
              where: { id: logEntry.id },
              data: { status: "SUCCESS", output: { stopped: true, message: nodeError.message } as unknown as import("@prisma/client").Prisma.InputJsonValue, finishedAt: new Date() },
            });
            throw nodeError;
          }
          const errMsg = nodeError instanceof Error ? nodeError.message : String(nodeError);
          await db.executionLog.update({
            where: { id: logEntry.id },
            data: { status: "FAILED", error: errMsg, finishedAt: new Date() },
          });
          throw new Error(`Node "${node.label}" failed: ${errMsg}`);
        }
      }

      const finishedAt = new Date();
      const startedAt = (
        await db.execution.findUnique({ where: { id: this.executionId } })
      )?.startedAt;

      await db.execution.update({
        where: { id: this.executionId },
        data: {
          status: "SUCCESS",
          finishedAt,
          duration: startedAt ? finishedAt.getTime() - startedAt.getTime() : null,
        },
      });
    } catch (error) {
      const finishedAt = new Date();
      const startedAt = (
        await db.execution.findUnique({ where: { id: this.executionId } })
      )?.startedAt;
      const duration = startedAt ? finishedAt.getTime() - startedAt.getTime() : null;

      if (error instanceof StopWorkflowError) {
        await db.execution.update({
          where: { id: this.executionId },
          data: { status: "SUCCESS", finishedAt, duration },
        });
      } else {
        await db.execution.update({
          where: { id: this.executionId },
          data: {
            status: "FAILED",
            finishedAt,
            duration,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  private async executeNode(
    node: WorkflowNodeData,
    input: NodeOutput,
    ctx: ExecutionContext
  ): Promise<NodeOutput> {
    if (node.type === "log") {
      const result = await executeNodeStandalone(node.type, node.config, input, ctx);
      console.log(`[Execution ${this.executionId}]`, (result as { message: string }).message, input);
      return result;
    }
    return executeNodeStandalone(node.type, node.config, input, ctx);
  }

  private topologicalSort(nodes: WorkflowNodeData[], edges: WorkflowEdgeData[]): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      adjList.get(edge.source)?.push(edge.target);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      for (const neighbor of adjList.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return order;
  }
}

export async function triggerWorkflow(
  workflowId: string,
  trigger: string,
  triggerData?: unknown
) {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { nodes: true, edges: true },
  });

  if (!workflow) throw new Error("Workflow not found");

  const execution = await db.execution.create({
    data: { workflowId, status: "PENDING", trigger },
  });

  const nodes: WorkflowNodeData[] = (workflow.nodes as WorkflowNode[]).map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    config: n.config as WorkflowNodeConfig,
    workflowId: n.workflowId,
    positionX: n.positionX,
    positionY: n.positionY,
  }));

  const edges: WorkflowEdgeData[] = (workflow.edges as WorkflowEdge[]).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    workflowId: e.workflowId,
  }));

  const engine = new WorkflowEngine(execution.id, workflow.userId);
  await engine.execute(nodes, edges, triggerData);

  return execution.id;
}
