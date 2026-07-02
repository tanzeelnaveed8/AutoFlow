import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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

  const configuredSlugs = new Set<string>(
    INTEGRATIONS.filter((i) => {
      if (i.authType !== "oauth" || !i.oauthConfig) return false;
      return !!process.env[i.oauthConfig.clientIdEnv];
    }).map((i) => i.slug)
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {userIntegrations.length} of {INTEGRATIONS.length} connected
          </p>
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
