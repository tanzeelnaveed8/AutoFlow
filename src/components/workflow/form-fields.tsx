"use client";

import { useState, useEffect } from "react";
import { type UseFormRegister, type Control, type FieldErrors, Controller } from "react-hook-form";
import { Plus, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FieldDefinition } from "@/lib/node-schemas";

interface FieldRendererProps {
  field: FieldDefinition;
  register: UseFormRegister<Record<string, unknown>>;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
}

export function FieldRenderer({ field, register, control, errors }: FieldRendererProps) {
  const error = errors[field.key]?.message as string | undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {field.type !== "switch" && (
        <Label htmlFor={field.key} className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-400 text-xs">*</span>}
        </Label>
      )}

      {field.type === "text" && (
        <Input
          id={field.key}
          placeholder={field.placeholder}
          {...register(field.key)}
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          id={field.key}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className="font-mono text-xs resize-y"
          {...register(field.key)}
        />
      )}

      {field.type === "password" && (
        <Input
          id={field.key}
          type="password"
          placeholder={field.placeholder}
          {...register(field.key)}
        />
      )}

      {field.type === "number" && (
        <Input
          id={field.key}
          type="number"
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          {...register(field.key)}
        />
      )}

      {field.type === "select" && (
        <Controller
          name={field.key}
          control={control}
          render={({ field: f }) => (
            <Select
              value={(f.value as string) ?? ""}
              onValueChange={f.onChange}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}

      {field.type === "switch" && (
        <Controller
          name={field.key}
          control={control}
          render={({ field: f }) => (
            <div className="flex items-center gap-3">
              <Switch
                id={field.key}
                checked={!!f.value}
                onCheckedChange={f.onChange}
              />
              <Label htmlFor={field.key} className="cursor-pointer">
                {field.label}
              </Label>
            </div>
          )}
        />
      )}

      {field.type === "json" && (
        <Controller
          name={field.key}
          control={control}
          render={({ field: f }) => (
            <JsonEditor
              value={(f.value as string) ?? ""}
              onChange={f.onChange}
              placeholder={field.placeholder}
              rows={field.rows ?? 5}
            />
          )}
        />
      )}

      {field.type === "key-value" && (
        <Controller
          name={field.key}
          control={control}
          render={({ field: f }) => (
            <KeyValueEditor
              value={(f.value as Record<string, string>) ?? {}}
              onChange={f.onChange}
            />
          )}
        />
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {field.description && !error && (
        <p className="text-xs text-zinc-500">{field.description}</p>
      )}
    </div>
  );
}

// --- JSON Editor ---

interface JsonEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

function JsonEditor({ value, onChange, placeholder, rows = 5 }: JsonEditorProps) {
  const [raw, setRaw] = useState(value);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setRaw(v);
    setJsonError(null);
    onChange(v);
  }

  function handleBlur() {
    if (!raw.trim()) {
      setJsonError(null);
      return;
    }
    try {
      const formatted = JSON.stringify(JSON.parse(raw), null, 2);
      setRaw(formatted);
      onChange(formatted);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Textarea
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "font-mono text-xs resize-y",
            jsonError && "border-red-500 focus-visible:ring-red-500"
          )}
          spellCheck={false}
        />
        <span className="absolute top-2 right-2 text-[10px] text-zinc-600 select-none pointer-events-none">
          JSON
        </span>
      </div>
      {jsonError && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {jsonError}
        </p>
      )}
    </div>
  );
}

// --- Key-Value Editor ---

interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

function KeyValueEditor({ value, onChange }: KeyValueEditorProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(() =>
    Object.entries(value ?? {}).map(([k, v]) => ({ key: k, value: v }))
  );

  function syncPairs(newPairs: KeyValuePair[]) {
    setPairs(newPairs);
    const record: Record<string, string> = {};
    for (const pair of newPairs) {
      if (pair.key.trim()) record[pair.key.trim()] = pair.value;
    }
    onChange(record);
  }

  function updatePair(index: number, patch: Partial<KeyValuePair>) {
    const newPairs = pairs.map((p, i) => (i === index ? { ...p, ...patch } : p));
    syncPairs(newPairs);
  }

  function removePair(index: number) {
    syncPairs(pairs.filter((_, i) => i !== index));
  }

  function addPair() {
    syncPairs([...pairs, { key: "", value: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {pairs.length > 0 && (
        <div className="flex gap-2 mb-0.5">
          <span className="flex-1 text-xs text-zinc-500 pl-0.5">Key</span>
          <span className="flex-1 text-xs text-zinc-500 pl-0.5">Value</span>
          <span className="w-7" />
        </div>
      )}

      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="flex-1 h-8 text-xs"
            placeholder="key"
            value={pair.key}
            onChange={(e) => updatePair(i, { key: e.target.value })}
          />
          <Input
            className="flex-1 h-8 text-xs"
            placeholder="value"
            value={pair.value}
            onChange={(e) => updatePair(i, { value: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removePair(i)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addPair}
        className="h-7 w-full justify-start gap-2 text-xs text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-600"
      >
        <Plus className="h-3.5 w-3.5" />
        Add row
      </Button>
    </div>
  );
}
