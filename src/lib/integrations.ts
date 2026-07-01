export type IntegrationCategory =
  | "ai"
  | "communication"
  | "productivity"
  | "database"
  | "developer";

export type IntegrationAuthType = "oauth" | "apikey" | "none";

export interface IntegrationDefinition {
  slug: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  color: string;
  bgColor: string;
  iconText: string;
  oauthProvider?: string;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  docsUrl?: string;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    slug: "openai",
    name: "OpenAI",
    description: "Connect GPT-4, DALL·E, and other OpenAI models to generate text, images, and more.",
    category: "ai",
    authType: "apikey",
    color: "#10b981",
    bgColor: "#052e16",
    iconText: "AI",
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    slug: "gmail",
    name: "Gmail",
    description: "Send, read, and manage emails through your Gmail account in any workflow.",
    category: "communication",
    authType: "oauth",
    color: "#ea4335",
    bgColor: "#2c1210",
    iconText: "Gm",
    oauthProvider: "google",
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Post messages, create channels, and interact with your Slack workspace.",
    category: "communication",
    authType: "oauth",
    color: "#4a154b",
    bgColor: "#1a0a1b",
    iconText: "Sl",
  },
  {
    slug: "discord",
    name: "Discord",
    description: "Send messages and manage Discord servers with bot or webhook integrations.",
    category: "communication",
    authType: "oauth",
    color: "#5865f2",
    bgColor: "#0e1030",
    iconText: "Dc",
  },
  {
    slug: "notion",
    name: "Notion",
    description: "Create, read, and update pages, databases, and blocks in Notion.",
    category: "productivity",
    authType: "oauth",
    color: "#ffffff",
    bgColor: "#1a1a1a",
    iconText: "No",
  },
  {
    slug: "google-sheets",
    name: "Google Sheets",
    description: "Read and write rows, manage spreadsheets, and trigger workflows from sheet changes.",
    category: "productivity",
    authType: "oauth",
    color: "#34a853",
    bgColor: "#0a2010",
    iconText: "GS",
    oauthProvider: "google",
  },
  {
    slug: "github",
    name: "GitHub",
    description: "Trigger workflows on push, pull requests, issues, and manage repos via API.",
    category: "developer",
    authType: "oauth",
    color: "#f0f6fc",
    bgColor: "#161b22",
    iconText: "GH",
  },
  {
    slug: "webhook",
    name: "Webhook",
    description: "Receive HTTP webhook events from any external service to trigger your workflows.",
    category: "developer",
    authType: "none",
    color: "#f97316",
    bgColor: "#1c0a02",
    iconText: "WH",
  },
  {
    slug: "http-request",
    name: "HTTP Request",
    description: "Make GET, POST, PUT, DELETE requests to any REST API endpoint.",
    category: "developer",
    authType: "none",
    color: "#0ea5e9",
    bgColor: "#020d14",
    iconText: "HTTP",
  },
];

export const CATEGORIES: { value: IntegrationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "communication", label: "Communication" },
  { value: "productivity", label: "Productivity" },
  { value: "database", label: "Database" },
  { value: "developer", label: "Developer" },
];

export function getIntegration(slug: string): IntegrationDefinition | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug);
}
