"use client";

import { XCircle, AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ValidationResult, ValidationErrorType } from "@/lib/workflow-validator";

const ERROR_ICONS: Record<ValidationErrorType, React.ElementType> = {
  NO_TRIGGER: AlertTriangle,
  MULTIPLE_TRIGGERS: AlertTriangle,
  CYCLE: XCircle,
  DISCONNECTED: XCircle,
  ORPHAN: XCircle,
  INVALID_EDGE: XCircle,
  MISSING_CONFIG: AlertTriangle,
};

const ERROR_COLORS: Record<ValidationErrorType, string> = {
  NO_TRIGGER: "text-amber-400",
  MULTIPLE_TRIGGERS: "text-amber-400",
  CYCLE: "text-red-400",
  DISCONNECTED: "text-red-400",
  ORPHAN: "text-red-400",
  INVALID_EDGE: "text-red-400",
  MISSING_CONFIG: "text-amber-400",
};

interface ValidationPanelProps {
  result: ValidationResult;
  onDismiss: () => void;
}

export function ValidationPanel({ result, onDismiss }: ValidationPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (result.valid) return null;

  const errorCount = result.errors.length;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-red-500/20 bg-zinc-950/95 backdrop-blur-sm shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {errorCount} validation error{errorCount !== 1 ? "s" : ""}
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Error list */}
      {!collapsed && (
        <div className="max-h-44 overflow-y-auto">
          {result.errors.map((err, i) => {
            const Icon = ERROR_ICONS[err.type];
            const color = ERROR_COLORS[err.type];
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 px-4 py-2.5",
                  i < result.errors.length - 1 && "border-b border-zinc-800/50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", color)} />
                <p className="text-sm text-zinc-300 leading-relaxed">{err.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
