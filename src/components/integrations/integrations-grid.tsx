"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, AlertCircle, X, Puzzle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IntegrationCard } from "./integration-card";
import { INTEGRATIONS, CATEGORIES, getIntegration, type IntegrationCategory } from "@/lib/integrations";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (flashConnected) {
      const integration = getIntegration(flashConnected);
      setBanner({ type: "success", message: `${integration?.name ?? flashConnected} connected successfully.` });
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
    return INTEGRATIONS.filter((i) => {
      const matchesCategory = category === "all" || i.category === category;
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  // Group by category when "all" is selected and no search
  const grouped = useMemo(() => {
    if (category !== "all" || search.trim()) return null;
    const map = new Map<string, typeof filtered>();
    for (const i of filtered) {
      if (!map.has(i.category)) map.set(i.category, []);
      map.get(i.category)!.push(i);
    }
    return map;
  }, [filtered, category, search]);

  const CATEGORY_LABELS: Record<string, string> = {
    ai: "AI",
    communication: "Communication",
    productivity: "Productivity",
    database: "Database",
    developer: "Developer",
  };

  return (
    <div className="flex flex-col gap-5">
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

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value as IntegrationCategory | "all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat.value
                  ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-3">
            <Puzzle className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="font-medium text-zinc-300">No integrations found</p>
          <p className="text-sm text-zinc-500 mt-1">Try a different search or category</p>
        </div>
      ) : grouped ? (
        // Grouped by category
        <div className="flex flex-col gap-8">
          {[...grouped.entries()].map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((integration) => (
                  <IntegrationCard
                    key={integration.slug}
                    integration={integration}
                    connected={connectedMap.has(integration.slug)}
                    connectedAt={connectedMap.get(integration.slug)}
                    isConfigured={integration.authType !== "oauth" || configuredSet.has(integration.slug)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat grid (filtered/searched)
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.slug}
              integration={integration}
              connected={connectedMap.has(integration.slug)}
              connectedAt={connectedMap.get(integration.slug)}
              isConfigured={integration.authType !== "oauth" || configuredSet.has(integration.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
