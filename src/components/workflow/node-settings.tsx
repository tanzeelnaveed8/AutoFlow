"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicNodeForm } from "./dynamic-node-form";
import { getNodeSchema } from "@/lib/node-schemas";
import type { WorkflowNodeData, WorkflowNodeConfig, NodeType } from "@/types";

interface NodeSettingsProps {
  node: WorkflowNodeData;
  onClose: () => void;
  onSave: (nodeId: string, config: WorkflowNodeConfig, label: string) => void;
}

export function NodeSettings({ node, onClose, onSave }: NodeSettingsProps) {
  const schema = getNodeSchema(node.type as NodeType);

  function handleSave(nodeId: string, config: Record<string, unknown>, label: string) {
    onSave(nodeId, config as WorkflowNodeConfig, label);
  }

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

      {node.type === "webhook-trigger" && (
        <div className="mx-4 mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs font-medium text-zinc-400 mb-1">Webhook URL</p>
          <p className="text-xs text-zinc-500 break-all">
            POST /api/webhooks/[workflow-id]
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Activate the workflow to receive webhook events
          </p>
        </div>
      )}

      <DynamicNodeForm
        nodeId={node.id}
        nodeLabel={node.label}
        nodeConfig={node.config as Record<string, unknown>}
        schema={schema}
        onSave={handleSave}
        onClose={onClose}
      />
    </div>
  );
}
