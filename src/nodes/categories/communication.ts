import { z } from "zod";
import { interp, getToken } from "../helpers";
import type { NodePlugin } from "../base-types";

export const COMMUNICATION_NODES: NodePlugin[] = [
  {
    id: "gmail-send",
    name: "Gmail: Send Email",
    category: "action",
    group: "Gmail",
    icon: "gmail",
    color: "#ea4335",
    bgColor: "#2c1210",
    description: "Send an email via Gmail",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "message", label: "Sent Message", type: "object" }],
    configFields: [
      { key: "to", label: "To", type: "text", placeholder: "user@example.com or {{email}}", required: true },
      { key: "cc", label: "CC", type: "text", placeholder: "cc@example.com", description: "Comma-separated email addresses" },
      { key: "subject", label: "Subject", type: "text", placeholder: "Hello {{name}}", required: true },
      { key: "body", label: "Body", type: "textarea", placeholder: "Hi {{name}},\n\n{{message}}", rows: 6, required: true },
      {
        key: "bodyType",
        label: "Body Type",
        type: "select",
        options: [{ label: "Plain Text", value: "plain" }, { label: "HTML", value: "html" }],
        defaultValue: "plain",
      },
    ],
    zodSchema: z.object({
      to: z.string().optional(), cc: z.string().optional(),
      subject: z.string().optional(), body: z.string().optional(), bodyType: z.string().optional(),
    }),
    execute: async (config, input, ctx) => {
      const token = await getToken("google", ctx);
      const to = interp((config.to as string) ?? "", input);
      const subject = interp((config.subject as string) ?? "", input);
      const body = interp((config.body as string) ?? "", input);
      const isHtml = (config.bodyType as string) === "html";
      const lines = [
        `To: ${to}`,
        ...(config.cc ? [`Cc: ${interp(config.cc as string, input)}`] : []),
        `Subject: ${subject}`,
        `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
        "",
        body,
      ];
      const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
      const data = await res.json() as Record<string, unknown>;
      return { messageId: data.id, threadId: data.threadId, to, subject };
    },
  },
  {
    id: "gmail-get",
    name: "Gmail: Get Email",
    category: "action",
    group: "Gmail",
    icon: "gmail",
    color: "#ea4335",
    bgColor: "#2c1210",
    description: "Fetch an email from Gmail by message ID",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "email", label: "Email Data", type: "object" }],
    configFields: [
      { key: "messageId", label: "Message ID", type: "text", placeholder: "{{messageId}}", required: true, description: "Gmail message ID from a previous trigger or node" },
    ],
    zodSchema: z.object({ messageId: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("google", ctx);
      const id = interp((config.messageId as string) ?? "", input);
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Gmail get failed: ${await res.text()}`);
      const msg = await res.json() as { payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: Array<{ mimeType: string; body?: { data?: string } }> }; snippet?: string; id?: string; threadId?: string };
      const headers: Record<string, string> = {};
      for (const h of msg.payload?.headers ?? []) headers[h.name.toLowerCase()] = h.value;
      const bodyPart = msg.payload?.parts?.find((p) => p.mimeType === "text/plain") ?? msg.payload?.parts?.find((p) => p.mimeType === "text/html");
      const bodyData = bodyPart?.body?.data ?? msg.payload?.body?.data ?? "";
      const bodyText = bodyData ? Buffer.from(bodyData, "base64url").toString("utf-8") : msg.snippet ?? "";
      return { id: msg.id, threadId: msg.threadId, from: headers["from"], to: headers["to"], subject: headers["subject"], date: headers["date"], body: bodyText, snippet: msg.snippet };
    },
  },
  {
    id: "slack-message",
    name: "Slack: Send Message",
    category: "action",
    group: "Slack",
    icon: "slack",
    color: "#4a154b",
    bgColor: "#1a0520",
    description: "Post a message to a Slack channel",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "message", label: "Sent Message", type: "object" }],
    configFields: [
      { key: "channel", label: "Channel", type: "text", placeholder: "#general or {{channel}}", required: true, description: "Channel name with # or channel ID" },
      { key: "text", label: "Message Text", type: "textarea", placeholder: "Hello {{name}}! New event: {{title}}", rows: 4, required: true, description: "Supports Slack markdown. Use {{variable}} for dynamic content." },
      { key: "username", label: "Bot Name (optional)", type: "text", placeholder: "AutoFlow Bot", description: "Override the default bot name" },
      { key: "emoji", label: "Icon Emoji (optional)", type: "text", placeholder: ":robot_face:", description: "Emoji to use as the bot icon" },
    ],
    zodSchema: z.object({
      channel: z.string().optional(), text: z.string().optional(),
      username: z.string().optional(), emoji: z.string().optional(),
    }),
    execute: async (config, input, ctx) => {
      const token = await getToken("slack", ctx);
      const channel = interp((config.channel as string) ?? "", input);
      const text = interp((config.text as string) ?? "", input);
      const body: Record<string, unknown> = { channel, text };
      if (config.username) body.username = config.username;
      if (config.emoji) body.icon_emoji = config.emoji;
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Slack API error: ${await res.text()}`);
      const data = await res.json() as { ok: boolean; error?: string; ts?: string; channel?: string };
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { timestamp: data.ts, channel: data.channel, text };
    },
  },
  {
    id: "slack-dm",
    name: "Slack: Direct Message",
    category: "action",
    group: "Slack",
    icon: "slack",
    color: "#4a154b",
    bgColor: "#1a0520",
    description: "Send a direct message to a Slack user",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "message", label: "Sent DM", type: "object" }],
    configFields: [
      { key: "user", label: "User", type: "text", placeholder: "@username or {{userId}}", required: true, description: "Slack user ID or @username" },
      { key: "text", label: "Message", type: "textarea", placeholder: "Hi {{name}}, {{message}}", rows: 4, required: true },
    ],
    zodSchema: z.object({ user: z.string().optional(), text: z.string().optional() }),
    execute: async (config, input, ctx) => {
      const token = await getToken("slack", ctx);
      const user = interp((config.user as string) ?? "", input);
      const text = interp((config.text as string) ?? "", input);
      const openRes = await fetch("https://slack.com/api/conversations.open", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ users: user.replace("@", "") }),
      });
      const openData = await openRes.json() as { ok: boolean; channel?: { id: string }; error?: string };
      if (!openData.ok) throw new Error(`Slack DM open failed: ${openData.error}`);
      const channel = openData.channel!.id;
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text }),
      });
      const data = await res.json() as { ok: boolean; error?: string; ts?: string };
      if (!data.ok) throw new Error(`Slack DM error: ${data.error}`);
      return { timestamp: data.ts, channel, user, text };
    },
  },
  {
    id: "discord-message",
    name: "Discord: Send Message",
    category: "action",
    group: "Discord",
    icon: "discord",
    color: "#5865f2",
    bgColor: "#0e0e2c",
    description: "Send a message to a Discord channel via webhook or bot",
    inputs: [{ id: "default", label: "Input", type: "any" }],
    outputs: [{ id: "message", label: "Sent Message", type: "object" }],
    configFields: [
      {
        key: "mode",
        label: "Send via",
        type: "select",
        options: [{ label: "Webhook URL", value: "webhook" }, { label: "Bot + Channel ID", value: "bot" }],
        defaultValue: "webhook",
      },
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/...", condition: (v) => v.mode === "webhook", required: true },
      { key: "channelId", label: "Channel ID", type: "text", placeholder: "1234567890123456789", condition: (v) => v.mode === "bot", required: true },
      { key: "content", label: "Message", type: "textarea", placeholder: "{{notification}}", rows: 4, required: true },
      { key: "username", label: "Username Override", type: "text", placeholder: "AutoFlow Bot", condition: (v) => v.mode === "webhook" },
    ],
    zodSchema: z.object({
      mode: z.string().optional(), webhookUrl: z.string().optional(), channelId: z.string().optional(),
      content: z.string().optional(), username: z.string().optional(),
    }),
    execute: async (config, input, ctx) => {
      const mode = (config.mode as string) ?? "webhook";
      const content = interp((config.content as string) ?? "", input);
      if (mode === "webhook") {
        const url = interp((config.webhookUrl as string) ?? "", input);
        const body: Record<string, unknown> = { content };
        if (config.username) body.username = config.username;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Discord webhook error: ${await res.text()}`);
        return { sent: true, content, mode: "webhook" };
      } else {
        const token = await getToken("discord", ctx);
        const channelId = interp((config.channelId as string) ?? "", input);
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error(`Discord bot error: ${await res.text()}`);
        const data = await res.json() as Record<string, unknown>;
        return { messageId: data.id, channelId, content, mode: "bot" };
      }
    },
  },
];
