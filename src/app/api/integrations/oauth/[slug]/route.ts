import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getIntegration } from "@/lib/integrations";

function signState(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 24);
}

export function createOAuthState(userId: string, slug: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, slug, ts: Date.now() })).toString("base64url");
  const sig = signState(payload);
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string, userId: string): { slug: string } | null {
  const dotIdx = state.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const payload = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);
  if (signState(payload) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId: string;
      slug: string;
      ts: number;
    };
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null; // 10-minute window
    return { slug: parsed.slug };
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { slug } = await params;
  const integration = getIntegration(slug);

  if (!integration || integration.authType !== "oauth" || !integration.oauthConfig) {
    return NextResponse.redirect(new URL("/integrations?error=invalid", req.url));
  }

  const cfg = integration.oauthConfig;
  const clientId = process.env[cfg.clientIdEnv];

  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/integrations?error=not_configured&slug=${slug}`, req.url)
    );
  }

  const redirectUri = new URL("/api/integrations/oauth/callback", req.url).toString();
  const state = createOAuthState(session.user.id, slug);

  const authUrl = new URL(cfg.authorizationUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  if (cfg.scopes.length > 0) {
    authUrl.searchParams.set("scope", cfg.scopes.join(" "));
  }
  for (const [k, v] of Object.entries(cfg.additionalAuthParams ?? {})) {
    authUrl.searchParams.set(k, v);
  }

  return NextResponse.redirect(authUrl.toString());
}
