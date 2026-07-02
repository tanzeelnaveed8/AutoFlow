"use client";

import { CheckCircle2, Plug, Settings, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <div className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80">
      <div className="flex items-start justify-between gap-3 mb-4">
        <IntegrationIcon
          slug={integration.slug}
          color={integration.color}
          bgColor={integration.bgColor}
        />

        {connected ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium"
          >
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        ) : !isConfigured ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium"
          >
            <AlertTriangle className="h-3 w-3" />
            Setup required
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-xs font-medium">
            Not connected
          </Badge>
        )}
      </div>

      <h3 className="font-semibold text-white text-sm mb-1">{integration.name}</h3>
      <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
        {integration.description}
      </p>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-xs text-zinc-600 capitalize">{integration.category}</span>

        <div className="flex items-center gap-2">
          {connected ? (
            <>
              {connectedAt && (
                <span className="text-xs text-zinc-600 hidden group-hover:inline">
                  Since {new Date(connectedAt).toLocaleDateString()}
                </span>
              )}
              <ConnectDialog
                integration={integration}
                connected={connected}
                isConfigured={isConfigured}
              >
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                  <Settings className="h-3 w-3" />
                  Manage
                </Button>
              </ConnectDialog>
            </>
          ) : (
            <ConnectDialog
              integration={integration}
              connected={connected}
              isConfigured={isConfigured}
            >
              <Button
                size="sm"
                className={`gap-1.5 h-7 text-xs ${
                  !isConfigured
                    ? "bg-amber-600 hover:bg-amber-500"
                    : ""
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
    </div>
  );
}
