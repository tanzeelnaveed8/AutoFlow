"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "./form-fields";
import { getFieldDefault } from "@/lib/node-schemas";
import type { NodeSchemaDefinition } from "@/lib/node-schemas";

interface DynamicNodeFormProps {
  nodeId: string;
  nodeLabel: string;
  nodeConfig: Record<string, unknown>;
  schema: NodeSchemaDefinition;
  onSave: (nodeId: string, config: Record<string, unknown>, label: string) => void;
  onClose: () => void;
}

export function DynamicNodeForm({
  nodeId,
  nodeLabel,
  nodeConfig,
  schema,
  onSave,
  onClose,
}: DynamicNodeFormProps) {
  const fullSchema = schema.zodSchema.extend({
    label: z.string().min(1, "Label is required"),
  });

  const fieldDefaults = Object.fromEntries(
    schema.fields.map((f) => [f.key, getFieldDefault(f)])
  );

  const defaultValues: Record<string, unknown> = {
    label: nodeLabel,
    ...fieldDefaults,
    ...nodeConfig,
  };

  const { register, handleSubmit, reset, control, watch, formState: { errors } } =
    useForm<Record<string, unknown>>({
      defaultValues,
      resolver: zodResolver(fullSchema),
    });

  useEffect(() => {
    reset({
      label: nodeLabel,
      ...fieldDefaults,
      ...nodeConfig,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const values = watch();

  function onSubmit(data: Record<string, unknown>) {
    const { label, ...config } = data;
    onSave(nodeId, config, label as string);
    onClose();
  }

  const visibleFields = schema.fields.filter(
    (f) => !f.condition || f.condition(values)
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          placeholder="Node label"
          {...register("label")}
        />
        {errors.label && (
          <p className="text-xs text-red-400">{errors.label.message as string}</p>
        )}
      </div>

      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          register={register}
          control={control}
          errors={errors}
        />
      ))}

      {schema.fields.length === 0 && (
        <p className="text-xs text-zinc-500 rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center">
          This node has no configuration options.
        </p>
      )}

      <div className="mt-auto pt-4">
        <Button type="submit" className="w-full">
          Save Settings
        </Button>
      </div>
    </form>
  );
}
