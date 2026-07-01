"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntegration } from "@/lib/integrations";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session as typeof session & { user: { id: string } };
}

export async function connectApiKey(slug: string, apiKey: string) {
  const session = await getSession();

  const integration = getIntegration(slug);
  if (!integration) return { error: "Integration not found" };
  if (integration.authType !== "apikey") return { error: "Invalid auth type" };
  if (!apiKey.trim()) return { error: "API key is required" };

  await db.userIntegration.upsert({
    where: { userId_slug: { userId: session.user.id, slug } },
    create: { userId: session.user.id, slug, accessToken: apiKey.trim() },
    update: { accessToken: apiKey.trim(), updatedAt: new Date() },
  });

  revalidatePath("/integrations");
  return { success: true };
}

export async function connectNone(slug: string) {
  const session = await getSession();

  const integration = getIntegration(slug);
  if (!integration) return { error: "Integration not found" };
  if (integration.authType !== "none") return { error: "Invalid auth type" };

  await db.userIntegration.upsert({
    where: { userId_slug: { userId: session.user.id, slug } },
    create: { userId: session.user.id, slug },
    update: { updatedAt: new Date() },
  });

  revalidatePath("/integrations");
  return { success: true };
}

export async function connectOAuth(slug: string, accessToken: string) {
  const session = await getSession();

  const integration = getIntegration(slug);
  if (!integration) return { error: "Integration not found" };
  if (integration.authType !== "oauth") return { error: "Invalid auth type" };

  await db.userIntegration.upsert({
    where: { userId_slug: { userId: session.user.id, slug } },
    create: { userId: session.user.id, slug, accessToken },
    update: { accessToken, updatedAt: new Date() },
  });

  revalidatePath("/integrations");
  return { success: true };
}

export async function disconnectIntegration(slug: string) {
  const session = await getSession();

  const existing = await db.userIntegration.findUnique({
    where: { userId_slug: { userId: session.user.id, slug } },
  });

  if (!existing) return { error: "Integration not connected" };

  await db.userIntegration.delete({
    where: { userId_slug: { userId: session.user.id, slug } },
  });

  revalidatePath("/integrations");
  return { success: true };
}

export async function getUserIntegrations() {
  const session = await getSession();

  const integrations = await db.userIntegration.findMany({
    where: { userId: session.user.id },
    select: { slug: true, connectedAt: true },
  });

  return integrations;
}
