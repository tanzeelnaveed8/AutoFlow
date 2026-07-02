import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Puzzle } from "lucide-react";
import { IntegrationsGrid } from "@/components/integrations/integrations-grid";
import { INTEGRATIONS } from "@/lib/integrations";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userIntegrations = await db.userIntegration.findMany({
    where: { userId: session.user.id },
    select: { slug: true, connectedAt: true },
  });

  const sp = await searchParams;
  const flashConnected = typeof sp.connected === "string" ? sp.connected : null;
  const flashError = typeof sp.error === "string" ? sp.error : null;

  // Determine which OAuth integrations have credentials configured
  const configuredSlugs = new Set<string>(
    INTEGRATIONS.filter((i) => {
      if (i.authType !== "oauth" || !i.oauthConfig) return false;
      return !!process.env[i.oauthConfig.clientIdEnv];
    }).map((i) => i.slug)
  );

  const connectedCount = userIntegrations.length;
  const totalCount = INTEGRATIONS.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Connect your tools and services to power your workflows
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 pt-1">
          <Puzzle className="h-4 w-4" />
          {connectedCount} / {totalCount} connected
        </div>
      </div>

      <IntegrationsGrid
        connected={userIntegrations}
        configuredSlugs={[...configuredSlugs]}
        flashConnected={flashConnected}
        flashError={flashError}
      />
    </div>
  );
}
