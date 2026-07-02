"use client";

import { CheckCircle2, Plug, Settings, AlertTriangle, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntegrationDefinition } from "@/lib/integrations";
import { ConnectDialog } from "./connect-dialog";
import { IntegrationIcon } from "./integration-icon";

interface IntegrationCardProps {
  integration: IntegrationDefinition;
  connected: boolean;
  connectedAt?: Date;
  isConfigured: boolean;
}

export function IntegrationCard({
  integration,
  connected,
  connectedAt,
  isConfigured,
}: IntegrationCardProps) {
  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-zinc-900 p-5 transition-all hover:bg-zinc-900/80 ${
        connected
          ? "border-emerald-500/20 hover:border-emerald-500/30"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <IntegrationIcon
          slug={integration.slug}
          color={integration.color}
          bgColor={integration.bgColor}
          iconText={integration.iconText}
        />

        {connected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </span>
        ) : !isConfigured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Setup needed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
            <ZapOff className="h-3 w-3" />
            Not connected
          </span>
        )}
      </div>

      {/* Name + desc */}
      <h3 className="font-semibold text-white text-sm mb-1">{integration.name}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed flex-1 mb-4">
        {integration.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {connected && connectedAt ? (
          <span className="text-xs text-zinc-600">
            Since {new Date(connectedAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-zinc-700 capitalize">{integration.category}</span>
        )}

        {connected ? (
          <ConnectDialog integration={integration} connected={connected} isConfigured={isConfigured}>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs px-2.5">
              <Settings className="h-3 w-3" />
              Manage
            </Button>
          </ConnectDialog>
        ) : (
          <ConnectDialog integration={integration} connected={connected} isConfigured={isConfigured}>
            <Button
              size="sm"
              className={`gap-1.5 h-7 text-xs px-2.5 ${
                !isConfigured ? "bg-amber-600 hover:bg-amber-500" : "bg-orange-600 hover:bg-orange-500"
              }`}
            >
              {!isConfigured ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Plug className="h-3 w-3" />
              )}
              {!isConfigured ? "Setup" : "Connect"}
            </Button>
          </ConnectDialog>
        )}
      </div>
    </div>
  );
}
