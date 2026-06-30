"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowNodeData, WorkflowNodeConfig } from "@/types";

interface NodeSettingsProps {
  node: WorkflowNodeData;
  onClose: () => void;
  onSave: (nodeId: string, config: WorkflowNodeConfig, label: string) => void;
}

export function NodeSettings({ node, onClose, onSave }: NodeSettingsProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      label: node.label,
      ...node.config,
    },
  });

  useEffect(() => {
    reset({ label: node.label, ...node.config });
  }, [node.id, reset, node.label, node.config]);

  function onSubmit(data: Record<string, unknown>) {
    const { label, ...config } = data;
    onSave(node.id, config as WorkflowNodeConfig, label as string);
    onClose();
  }

  const method = watch("method") as string | undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Node Settings</p>
          <p className="text-xs text-zinc-500 capitalize">
            {node.type.replace(/-/g, " ")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Label</Label>
          <Input placeholder="Node label" {...register("label")} />
        </div>

        {node.type === "webhook-trigger" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs font-medium text-zinc-400 mb-1">Webhook URL</p>
            <p className="text-xs text-zinc-500 break-all">
              POST /api/webhooks/[workflow-id]
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Activate the workflow to receive webhook events
            </p>
          </div>
        )}

        {node.type === "http-request" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Method</Label>
              <Select
                defaultValue={(node.config.method as string) ?? "GET"}
                onValueChange={(v) => setValue("method", v as "GET" | "POST" | "PUT" | "DELETE" | "PATCH")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL</Label>
              <Input placeholder="https://api.example.com/endpoint" {...register("url")} />
            </div>
            {method !== "GET" && (
              <div className="flex flex-col gap-1.5">
                <Label>Body (JSON)</Label>
                <Textarea
                  placeholder='{"key": "{{value}}"}'
                  rows={4}
                  className="font-mono text-xs"
                  {...register("body")}
                />
                <p className="text-xs text-zinc-500">
                  Use {"{{variable}}"} to interpolate data from previous nodes
                </p>
              </div>
            )}
          </>
        )}

        {node.type === "openai" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Model</Label>
              <Select
                defaultValue={(node.config.model as string) ?? "gpt-4o-mini"}
                onValueChange={(v) => setValue("model", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="You are a helpful assistant."
                rows={2}
                {...register("systemPrompt")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>User Prompt</Label>
              <Textarea
                placeholder="Summarize: {{data}}"
                rows={4}
                {...register("prompt")}
              />
              <p className="text-xs text-zinc-500">
                Use {"{{variable}}"} to include data from previous nodes
              </p>
            </div>
          </>
        )}

        {node.type === "delay" && (
          <div className="flex flex-col gap-1.5">
            <Label>Delay (milliseconds)</Label>
            <Input
              type="number"
              placeholder="1000"
              min={0}
              {...register("delayMs", { valueAsNumber: true })}
            />
            <p className="text-xs text-zinc-500">
              {((watch("delayMs") as number) ?? 0) / 1000}s
            </p>
          </div>
        )}

        {node.type === "log" && (
          <div className="flex flex-col gap-1.5">
            <Label>Message</Label>
            <Textarea
              placeholder="Logging: {{data}}"
              rows={3}
              {...register("message")}
            />
            <p className="text-xs text-zinc-500">
              Use {"{{variable}}"} to include data
            </p>
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
