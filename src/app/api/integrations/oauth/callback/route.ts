import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntegration } from "@/lib/integrations";
import { verifyOAuthState } from "../[slug]/route";

async function exchangeToken(
  tokenUrl: string,
  method: "body" | "basic_auth",
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; raw: unknown }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (method === "basic_auth") {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${creds}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const contentType = res.headers.get("content-type") ?? "";
  let data: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    data = (await res.json()) as Record<string, unknown>;
  } else {
    // GitHub returns URL-encoded form data
    const text = await res.text();
    data = Object.fromEntries(new URLSearchParams(text));
  }

  if (!res.ok || data.error) {
    const msg = (data.error_description ?? data.error ?? "Token exchange failed") as string;
    throw new Error(msg);
  }

  // Slack wraps the token: data.access_token or data.authed_user?.access_token
  const accessToken =
    (data.access_token as string | undefined) ??
    ((data.authed_user as Record<string, unknown> | undefined)?.access_token as string | undefined);

  if (!accessToken) throw new Error("No access_token in response");

  const refreshToken = data.refresh_token as string | undefined;
  const expiresIn = data.expires_in as number | undefined;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;

  return { accessToken, refreshToken, expiresAt, raw: data };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const desc = searchParams.get("error_description") ?? errorParam;
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(desc)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/integrations?error=missing_params", req.url));
  }

  const verified = verifyOAuthState(state, session.user.id);
  if (!verified) {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  }

  const { slug } = verified;
  const integration = getIntegration(slug);

  if (!integration || integration.authType !== "oauth" || !integration.oauthConfig) {
    return NextResponse.redirect(new URL("/integrations?error=invalid", req.url));
  }

  const cfg = integration.oauthConfig;
  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/integrations?error=not_configured&slug=${slug}`, req.url)
    );
  }

  const redirectUri = new URL("/api/integrations/oauth/callback", req.url).toString();

  try {
    const { accessToken, refreshToken, expiresAt, raw } = await exchangeToken(
      cfg.tokenUrl,
      cfg.tokenExchange,
      clientId,
      clientSecret,
      code,
      redirectUri
    );

    const metadata: Record<string, unknown> = {};
    if (refreshToken) metadata.refreshToken = refreshToken;
    if (expiresAt) metadata.expiresAt = expiresAt.toISOString();
    // Store safe subset of raw response (avoid logging full token)
    if (raw && typeof raw === "object") {
      const { access_token: _a, refresh_token: _r, ...rest } = raw as Record<string, unknown>;
      void _a; void _r;
      metadata.providerData = rest;
    }

    await db.userIntegration.upsert({
      where: { userId_slug: { userId: session.user.id, slug } },
      create: {
        userId: session.user.id,
        slug,
        accessToken,
        metadata: metadata as import("@prisma/client").Prisma.InputJsonValue,
      },
      update: {
        accessToken,
        metadata: metadata as import("@prisma/client").Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL(`/integrations?connected=${slug}`, req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(msg)}&slug=${slug}`, req.url)
    );
  }
}
