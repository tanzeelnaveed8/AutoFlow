import { z } from "zod";
import { interp, getToken } from "../helpers";
import type { NodePlugin } from "../base-types";

export const DEVELOPER_NODES: NodePlugin[] = [
  {
    id: "github-issue",
    name: "GitHub: Create Issue",
    category: "action",
    group: "GitHub",
    icon: "github",
    color: "#ffffff",
    bgColor: "#0d1117",
    description: "Create a new issue in a GitHub repository",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "issue", label: "Created Issue", type: "object" }],
    configFields: [
      { key: "owner", label: "Owner (username or org)", type: "text", placeholder: "myorg", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "my-repo", required: true },
      { key: "title", label: "Issue Title", type: "text", placeholder: "Bug: {{errorMessage}}", required: true },
      { key: "body", label: "Issue Body", type: "textarea", placeholder: "## Description\n\n{{description}}", rows: 6 },
      { key: "labels", label: "Labels", type: "text", placeholder: "bug, priority-high", description: "Comma-separated label names" },
      { key: "assignees", label: "Assignees", type: "text", placeholder: "username1, username2", description: "Comma-separated GitHub usernames" },
    ],
    zodSchema: z.object({
      owner: z.string().optional(), repo: z.string().optional(),
      title: z.string().optional(), body: z.string().optional(),
      labels: z.string().optional(), assignees: z.string().optional(),
    }),
    execute: async (config, input, ctx) => {
      const token = await getToken("github", ctx);
      const owner = interp((config.owner as string) ?? "", input);
      const repo = interp((config.repo as string) ?? "", input);
      const title = interp((config.title as string) ?? "", input);
      const body: Record<string, unknown> = { title, body: interp((config.body as string) ?? "", input) };
      if (config.labels) body.labels = (config.labels as string).split(",").map((l) => l.trim());
      if (config.assignees) body.assignees = (config.assignees as string).split(",").map((a) => a.trim());
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`GitHub create issue failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { number: data.number, title, url: data.html_url, nodeId: data.node_id };
    },
  },
  {
    id: "github-pr",
    name: "GitHub: Create PR",
    category: "action",
    group: "GitHub",
    icon: "github",
    color: "#ffffff",
    bgColor: "#0d1117",
    description: "Create a pull request in a GitHub repository",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "pr", label: "Created PR", type: "object" }],
    configFields: [
      { key: "owner", label: "Owner", type: "text", placeholder: "myorg", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "my-repo", required: true },
      { key: "title", label: "PR Title", type: "text", placeholder: "Feature: {{featureName}}", required: true },
      { key: "body", label: "PR Description", type: "textarea", placeholder: "## Changes\n\n{{description}}", rows: 6 },
      { key: "head", label: "Head Branch", type: "text", placeholder: "feature/{{branchName}}", required: true, description: "The branch with your changes" },
      { key: "base", label: "Base Branch", type: "text", placeholder: "main", defaultValue: "main", description: "The branch to merge into" },
      { key: "draft", label: "Draft PR", type: "checkbox", defaultValue: false },
    ],
    zodSchema: z.object({
      owner: z.string().optional(), repo: z.string().optional(),
      title: z.string().optional(), body: z.string().optional(),
      head: z.string().optional(), base: z.string().optional(), draft: z.boolean().optional(),
    }),
    execute: async (config, input, ctx) => {
      const token = await getToken("github", ctx);
      const owner = interp((config.owner as string) ?? "", input);
      const repo = interp((config.repo as string) ?? "", input);
      const title = interp((config.title as string) ?? "", input);
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: interp((config.body as string) ?? "", input),
          head: interp((config.head as string) ?? "", input),
          base: interp((config.base as string) ?? "main", input),
          draft: config.draft ?? false,
        }),
      });
      if (!res.ok) throw new Error(`GitHub create PR failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { number: data.number, title, url: data.html_url, state: data.state };
    },
  },
  {
    id: "github-repo",
    name: "GitHub: Get Repo Info",
    category: "action",
    group: "GitHub",
    icon: "github",
    color: "#ffffff",
    bgColor: "#0d1117",
    description: "Fetch metadata and stats for a GitHub repository",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "repo", label: "Repository Info", type: "object" }],
    configFields: [
      { key: "owner", label: "Owner", type: "text", placeholder: "octocat", required: true },
      { key: "repo", label: "Repository", type: "text", placeholder: "Hello-World", required: true },
    ],
    zodSchema: z.object({ owner: z.string().optional(), repo: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("github", ctx);
      const owner = interp((config.owner as string) ?? "", input);
      const repo = interp((config.repo as string) ?? "", input);
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(`GitHub get repo failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return {
        id: data.id, name: data.name, fullName: data.full_name,
        description: data.description, url: data.html_url,
        stars: data.stargazers_count, forks: data.forks_count,
        openIssues: data.open_issues_count, language: data.language,
        defaultBranch: data.default_branch, private: data.private,
        createdAt: data.created_at, updatedAt: data.updated_at,
      };
    },
  },
];
