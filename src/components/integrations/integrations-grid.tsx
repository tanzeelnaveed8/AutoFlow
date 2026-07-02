"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Puzzle, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IntegrationCard } from "./integration-card";
import { INTEGRATIONS, CATEGORIES, getIntegration, type IntegrationCategory } from "@/lib/integrations";

interface ConnectedIntegration {
  slug: string;
  connectedAt: Date;
}

interface IntegrationsGridProps {
  connected: ConnectedIntegration[];
  configuredSlugs: string[];
  flashConnected: string | null;
  flashError: string | null;
}

export function IntegrationsGrid({
  connected,
  configuredSlugs,
  flashConnected,
  flashError,
}: IntegrationsGridProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const configuredSet = useMemo(() => new Set(configuredSlugs), [configuredSlugs]);

  const connectedMap = useMemo(() => {
    const map = new Map<string, Date>();
    for (const c of connected) map.set(c.slug, c.connectedAt);
    return map;
  }, [connected]);

  // Show banner from URL params, then clean URL
  useEffect(() => {
    if (flashConnected) {
      const integration = getIntegration(flashConnected);
      setBanner({
        type: "success",
        message: `${integration?.name ?? flashConnected} connected successfully.`,
      });
      router.replace("/integrations");
    } else if (flashError) {
      const msg =
        flashError === "not_configured"
          ? "OAuth credentials not configured. Add the required environment variables."
          : flashError === "invalid_state"
          ? "OAuth state mismatch. Please try connecting again."
          : decodeURIComponent(flashError);
      setBanner({ type: "error", message: msg });
      router.replace("/integrations");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return INTEGRATIONS.filter((integration) => {
      const matchesCategory = category === "all" || integration.category === category;
      const matchesSearch =
        !q ||
        integration.name.toLowerCase().includes(q) ||
        integration.description.toLowerCase().includes(q) ||
        integration.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <div className="flex flex-col gap-6">
      {banner && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span className="text-sm flex-1">{banner.message}</span>
          <button onClick={() => setBanner(null)} className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              size="sm"
              variant={category === cat.value ? "default" : "ghost"}
              onClick={() => setCategory(cat.value as IntegrationCategory | "all")}
              className="h-7 text-xs px-3"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {connected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
            {connected.length}
          </span>
          integration{connected.length !== 1 ? "s" : ""} connected
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-3">
            <Puzzle className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="font-medium text-zinc-300">No integrations found</p>
          <p className="text-sm text-zinc-500 mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.slug}
              integration={integration}
              connected={connectedMap.has(integration.slug)}
              connectedAt={connectedMap.get(integration.slug)}
              isConfigured={
                integration.authType !== "oauth" || configuredSet.has(integration.slug)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
