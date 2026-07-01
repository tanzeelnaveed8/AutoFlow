import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntegration } from "@/lib/integrations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  const code = searchParams.get("code");

  if (!slug || !code) {
    return NextResponse.redirect(new URL("/integrations?error=missing_params", req.url));
  }

  const integration = getIntegration(slug);
  if (!integration || integration.authType !== "oauth") {
    return NextResponse.redirect(new URL("/integrations?error=invalid", req.url));
  }

  // In a real implementation, exchange the code for an access token here.
  // For this MVP, we store a placeholder token to mark the integration as connected.
  const accessToken = `oauth_token_${slug}_${Date.now()}`;

  await db.userIntegration.upsert({
    where: { userId_slug: { userId: session.user.id, slug } },
    create: { userId: session.user.id, slug, accessToken },
    update: { accessToken, updatedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/integrations?connected=" + slug, req.url));
}
