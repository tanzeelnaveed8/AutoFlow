import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/register"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isApiAuth = pathname.startsWith("/api/auth");
  const isWebhook = pathname.startsWith("/api/webhooks");

  if (isApiAuth || isWebhook) return NextResponse.next();
  if (isPublic && isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
  if (!isPublic && !isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
