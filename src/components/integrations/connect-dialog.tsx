"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Unplug,
  Key,
  Zap,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import type { IntegrationDefinition } from "@/lib/integrations";
import { connectApiKey, connectNone, disconnectIntegration } from "@/actions/integrations";
import { IntegrationIcon } from "./integration-icon";

interface ConnectDialogProps {
  integration: IntegrationDefinition;
  connected: boolean;
  isConfigured: boolean;
  children: React.ReactNode;
}

export function ConnectDialog({
  integration,
  connected,
  isConfigured,
  children,
}: ConnectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setApiKey("");
    setError("");
  }

  function handleApiKeyConnect() {
    setError("");
    startTransition(async () => {
      const result = await connectApiKey(integration.slug, apiKey);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  function handleNoneConnect() {
    startTransition(async () => {
      const result = await connectNone(integration.slug);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectIntegration(integration.slug);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  function handleOAuthConnect() {
    router.push(`/api/integrations/oauth/${integration.slug}`);
    handleClose();
  }

  const oauthCfg = integration.oauthConfig;
  const authLabel =
    integration.authType === "none"
      ? "No auth required"
      : integration.authType === "apikey"
      ? "API Key"
      : "OAuth 2.0";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <IntegrationIcon
              slug={integration.slug}
              color={integration.color}
              bgColor={integration.bgColor}
              iconText={integration.iconText}
            />
            <div>
              <DialogTitle>{integration.name}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 capitalize">
                {integration.category} · {authLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-zinc-400">{integration.description}</p>

        {connected ? (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">
                This integration is connected and active.
              </p>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isPending}
                className="gap-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {/* OAuth — not configured */}
            {integration.authType === "oauth" && !isConfigured && oauthCfg && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-sm text-amber-300 font-medium">
                    Environment variables required
                  </p>
                  <p className="text-xs text-zinc-400">
                    Add these to your <code className="text-zinc-300">.env.local</code> to enable{" "}
                    {integration.name} OAuth:
                  </p>
                  <div className="rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-300 space-y-1">
                    <p>
                      <span className="text-amber-400">{oauthCfg.clientIdEnv}</span>
                      =your_client_id
                    </p>
                    <p>
                      <span className="text-amber-400">{oauthCfg.clientSecretEnv}</span>
                      =your_client_secret
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Callback URL to register with the provider:
                  </p>
                  <div className="flex items-center gap-2 rounded bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300">
                    <Terminal className="h-3 w-3 text-zinc-500 shrink-0" />
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/integrations/oauth/callback`
                      : "/api/integrations/oauth/callback"}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* OAuth — configured */}
            {integration.authType === "oauth" && isConfigured && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-sm text-zinc-400">
                  You&apos;ll be redirected to {integration.name} to authorize access. We only
                  request the minimum permissions needed.
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOAuthConnect}
                    disabled={isPending}
                    className="gap-2"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Connect with {integration.name}
                  </Button>
                </div>
              </div>
            )}

            {/* API Key */}
            {integration.authType === "apikey" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="apikey" className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-zinc-400" />
                    {integration.apiKeyLabel ?? "API Key"}
                  </Label>
                  <Input
                    id="apikey"
                    type="password"
                    placeholder={integration.apiKeyPlaceholder ?? "Enter your API key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApiKeyConnect()}
                  />
                  {integration.docsUrl && (
                    <a
                      href={integration.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-0.5"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApiKeyConnect}
                    disabled={isPending || !apiKey.trim()}
                    className="gap-2"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Connect
                  </Button>
                </div>
              </div>
            )}

            {/* No auth */}
            {integration.authType === "none" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-sm text-zinc-400">
                  This integration requires no authentication. Enable it to start using it in your
                  workflows.
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleNoneConnect} disabled={isPending} className="gap-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Enable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
