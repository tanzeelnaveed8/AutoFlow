import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIntegration } from "@/lib/integrations";

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

  if (!integration || integration.authType !== "oauth") {
    return NextResponse.redirect(new URL("/integrations?error=invalid", req.url));
  }

  // In a real implementation, redirect to the provider's OAuth authorization URL.
  // For this MVP, we simulate the OAuth flow by going directly to the callback.
  const callbackUrl = new URL("/api/integrations/oauth/callback", req.url);
  callbackUrl.searchParams.set("slug", slug);
  callbackUrl.searchParams.set("code", `mock_code_${Date.now()}`);
  callbackUrl.searchParams.set("state", session.user.id);

  return NextResponse.redirect(callbackUrl);
}
