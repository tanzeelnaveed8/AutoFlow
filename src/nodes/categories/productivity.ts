import { z } from "zod";
import { interp, getToken } from "../helpers";
import type { NodePlugin } from "../base-types";

export const PRODUCTIVITY_NODES: NodePlugin[] = [
  {
    id: "notion-create",
    name: "Notion: Create Page",
    category: "action",
    group: "Notion",
    icon: "notion",
    color: "#ffffff",
    bgColor: "#1a1a1a",
    description: "Create a new page in a Notion database",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "page", label: "Created Page", type: "object" }],
    configFields: [
      { key: "databaseId", label: "Database ID", type: "text", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true, description: "Find in Notion URL or Share menu" },
      { key: "title", label: "Title", type: "text", placeholder: "{{subject}}", required: true },
      {
        key: "properties",
        label: "Properties (JSON)",
        type: "json",
        placeholder: '{\n  "Status": "{{status}}",\n  "Priority": "High"\n}',
        rows: 5,
        description: "Additional Notion database properties as key-value JSON",
      },
      { key: "content", label: "Page Content", type: "textarea", placeholder: "{{body}}", rows: 5, description: "Text content for the page body" },
    ],
    zodSchema: z.object({
      databaseId: z.string().optional(), title: z.string().optional(),
      properties: z.string().optional(), content: z.string().optional(),
    }),
    execute: async (config, input, ctx) => {
      const token = await getToken("notion", ctx);
      const title = interp((config.title as string) ?? "", input);
      const dbId = (config.databaseId as string) ?? "";
      const notionProps: Record<string, unknown> = {
        title: { title: [{ text: { content: title } }] },
      };
      if (config.properties) {
        try {
          const extra = JSON.parse(interp(config.properties as string, input)) as Record<string, string>;
          for (const [key, val] of Object.entries(extra)) {
            notionProps[key] = { rich_text: [{ text: { content: String(val) } }] };
          }
        } catch { /* ignore malformed */ }
      }
      const children: unknown[] = [];
      if (config.content) {
        const text = interp(config.content as string, input);
        for (const para of text.split("\n\n")) {
          children.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: para } }] } });
        }
      }
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ parent: { database_id: dbId }, properties: notionProps, ...(children.length > 0 ? { children } : {}) }),
      });
      if (!res.ok) throw new Error(`Notion create failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { pageId: data.id, url: data.url, title, created: true };
    },
  },
  {
    id: "notion-update",
    name: "Notion: Update Page",
    category: "action",
    group: "Notion",
    icon: "notion",
    color: "#ffffff",
    bgColor: "#1a1a1a",
    description: "Update properties of an existing Notion page",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "page", label: "Updated Page", type: "object" }],
    configFields: [
      { key: "pageId", label: "Page ID", type: "text", placeholder: "{{pageId}}", required: true },
      {
        key: "properties",
        label: "Properties to Update (JSON)",
        type: "json",
        placeholder: '{\n  "Status": "Done",\n  "Reviewed": "{{reviewer}}"\n}',
        rows: 5,
        required: true,
        description: "Notion page properties to update as key-value JSON",
      },
    ],
    zodSchema: z.object({ pageId: z.string().optional(), properties: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("notion", ctx);
      const pageId = interp((config.pageId as string) ?? "", input);
      const notionProps: Record<string, unknown> = {};
      if (config.properties) {
        try {
          const props = JSON.parse(interp(config.properties as string, input)) as Record<string, string>;
          for (const [key, val] of Object.entries(props)) {
            notionProps[key] = { rich_text: [{ text: { content: String(val) } }] };
          }
        } catch { throw new Error("Properties JSON is invalid"); }
      }
      const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ properties: notionProps }),
      });
      if (!res.ok) throw new Error(`Notion update failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { pageId: data.id, url: data.url, updated: true };
    },
  },
  {
    id: "notion-search",
    name: "Notion: Search",
    category: "action",
    group: "Notion",
    icon: "notion",
    color: "#ffffff",
    bgColor: "#1a1a1a",
    description: "Search for pages or databases in Notion",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "results", label: "Search Results", type: "array" }],
    configFields: [
      { key: "query", label: "Search Query", type: "text", placeholder: "{{searchTerm}}", required: true },
      {
        key: "filterType",
        label: "Filter by Type",
        type: "select",
        options: [
          { label: "All", value: "all" },
          { label: "Pages only", value: "page" },
          { label: "Databases only", value: "database" },
        ],
        defaultValue: "all",
      },
      { key: "limit", label: "Max Results", type: "number", min: 1, max: 100, defaultValue: 10 },
    ],
    zodSchema: z.object({ query: z.string().optional(), filterType: z.string().optional(), limit: z.coerce.number().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("notion", ctx);
      const query = interp((config.query as string) ?? "", input);
      const filterType = (config.filterType as string) ?? "all";
      const body: Record<string, unknown> = { query, page_size: (config.limit as number) ?? 10 };
      if (filterType !== "all") body.filter = { value: filterType, property: "object" };
      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Notion search failed: ${await res.text()}`);
      const data = await res.json() as { results?: unknown[]; next_cursor?: string };
      return { results: data.results ?? [], count: (data.results ?? []).length, hasMore: !!data.next_cursor };
    },
  },
  {
    id: "sheets-add-row",
    name: "Sheets: Add Row",
    category: "action",
    group: "Google Sheets",
    icon: "googlesheets",
    color: "#34a853",
    bgColor: "#0d2114",
    description: "Append a new row to a Google Sheet",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "row", label: "Added Row", type: "object" }],
    configFields: [
      { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", required: true, description: "From the Google Sheets URL" },
      { key: "range", label: "Sheet Name / Range", type: "text", placeholder: "Sheet1!A:Z", defaultValue: "Sheet1", description: "Sheet name or A1 range notation" },
      {
        key: "values",
        label: "Row Values (JSON array)",
        type: "json",
        placeholder: '["{{name}}", "{{email}}", "{{date}}"]',
        rows: 3,
        required: true,
        description: "JSON array of values for each column in order",
      },
    ],
    zodSchema: z.object({ spreadsheetId: z.string().optional(), range: z.string().optional(), values: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("google", ctx);
      const spreadsheetId = (config.spreadsheetId as string) ?? "";
      const range = interp((config.range as string) ?? "Sheet1", input);
      const rawValues = interp((config.values as string) ?? "[]", input);
      let row: unknown[];
      try { row = JSON.parse(rawValues) as unknown[]; } catch { throw new Error("Row values must be a JSON array"); }
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }),
        }
      );
      if (!res.ok) throw new Error(`Sheets add row failed: ${await res.text()}`);
      const data = await res.json() as { updates?: { updatedRange?: string } };
      return { updatedRange: data.updates?.updatedRange, values: row, appended: true };
    },
  },
  {
    id: "sheets-get-rows",
    name: "Sheets: Get Rows",
    category: "action",
    group: "Google Sheets",
    icon: "googlesheets",
    color: "#34a853",
    bgColor: "#0d2114",
    description: "Read rows from a Google Sheet",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "rows", label: "Rows", type: "array" }],
    configFields: [
      { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", required: true },
      { key: "range", label: "Range", type: "text", placeholder: "Sheet1!A1:Z100", defaultValue: "Sheet1", description: "Sheet name or A1 range" },
      { key: "hasHeader", label: "First Row is Header", type: "checkbox", defaultValue: true, description: "Convert rows to objects using header as keys" },
    ],
    zodSchema: z.object({ spreadsheetId: z.string().optional(), range: z.string().optional(), hasHeader: z.boolean().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("google", ctx);
      const spreadsheetId = (config.spreadsheetId as string) ?? "";
      const range = interp((config.range as string) ?? "Sheet1", input);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Sheets get rows failed: ${await res.text()}`);
      const data = await res.json() as { values?: string[][] };
      const rawRows = data.values ?? [];
      const hasHeader = config.hasHeader !== false;
      if (hasHeader && rawRows.length > 1) {
        const headers = rawRows[0];
        const rows = rawRows.slice(1).map((row) =>
          Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
        );
        return { rows, count: rows.length, headers };
      }
      return { rows: rawRows, count: rawRows.length };
    },
  },
  {
    id: "sheets-update-row",
    name: "Sheets: Update Row",
    category: "action",
    group: "Google Sheets",
    icon: "googlesheets",
    color: "#34a853",
    bgColor: "#0d2114",
    description: "Update a specific row in a Google Sheet",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "result", label: "Update Result", type: "object" }],
    configFields: [
      { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", required: true },
      { key: "range", label: "Cell Range to Update", type: "text", placeholder: "Sheet1!A2:C2", required: true, description: "Exact cell range for the row to update (e.g. Sheet1!A5:D5)" },
      {
        key: "values",
        label: "New Values (JSON array)",
        type: "json",
        placeholder: '["{{name}}", "{{status}}", "{{date}}"]',
        rows: 3,
        required: true,
      },
    ],
    zodSchema: z.object({ spreadsheetId: z.string().optional(), range: z.string().optional(), values: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("google", ctx);
      const spreadsheetId = (config.spreadsheetId as string) ?? "";
      const range = interp((config.range as string) ?? "", input);
      const rawValues = interp((config.values as string) ?? "[]", input);
      let row: unknown[];
      try { row = JSON.parse(rawValues) as unknown[]; } catch { throw new Error("Values must be a JSON array"); }
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ range, majorDimension: "ROWS", values: [row] }),
        }
      );
      if (!res.ok) throw new Error(`Sheets update failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { updatedRange: data.updatedRange, values: row, updated: true };
    },
  },
];
