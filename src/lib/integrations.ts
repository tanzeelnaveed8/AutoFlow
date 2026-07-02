export type IntegrationCategory =
  | "ai"
  | "communication"
  | "productivity"
  | "database"
  | "developer";

export type IntegrationAuthType = "oauth" | "apikey" | "none";

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  tokenExchange: "body" | "basic_auth";
  additionalAuthParams?: Record<string, string>;
}

export interface IntegrationDefinition {
  slug: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  color: string;
  bgColor: string;
  iconText: string;
  oauthConfig?: OAuthConfig;
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
    oauthConfig: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
      tokenExchange: "body",
      additionalAuthParams: { access_type: "offline", prompt: "consent" },
    },
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
    oauthConfig: {
      authorizationUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      scopes: ["chat:write", "channels:read", "users:read"],
      clientIdEnv: "SLACK_CLIENT_ID",
      clientSecretEnv: "SLACK_CLIENT_SECRET",
      tokenExchange: "body",
    },
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
    oauthConfig: {
      authorizationUrl: "https://discord.com/api/oauth2/authorize",
      tokenUrl: "https://discord.com/api/oauth2/token",
      scopes: ["identify", "email", "guilds"],
      clientIdEnv: "DISCORD_CLIENT_ID",
      clientSecretEnv: "DISCORD_CLIENT_SECRET",
      tokenExchange: "body",
    },
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
    oauthConfig: {
      authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
      tokenUrl: "https://api.notion.com/v1/oauth/token",
      scopes: [],
      clientIdEnv: "NOTION_CLIENT_ID",
      clientSecretEnv: "NOTION_CLIENT_SECRET",
      tokenExchange: "basic_auth",
      additionalAuthParams: { owner: "user" },
    },
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
    oauthConfig: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
      tokenExchange: "body",
      additionalAuthParams: { access_type: "offline", prompt: "consent" },
    },
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
    oauthConfig: {
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: ["repo", "user:email"],
      clientIdEnv: "GITHUB_CLIENT_ID",
      clientSecretEnv: "GITHUB_CLIENT_SECRET",
      tokenExchange: "body",
    },
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
