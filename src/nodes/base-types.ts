import { z } from "zod";
import type { FieldDefinition } from "@/lib/node-schemas";

export interface ExecutionContext {
  userId?: string;
  variables?: Map<string, unknown>;
}

export interface NodePort {
  id: string;
  label: string;
  type: "any" | "string" | "number" | "boolean" | "object" | "array";
}

export interface NodePlugin {
  id: string;
  name: string;
  category: "trigger" | "action";
  group: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configFields: FieldDefinition[];
  zodSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  execute: (
    config: Record<string, unknown>,
    input: Record<string, unknown>,
    ctx: ExecutionContext
  ) => Promise<Record<string, unknown>>;
}

export class StopWorkflowError extends Error {
  constructor(message = "Workflow stopped") {
    super(message);
    this.name = "StopWorkflowError";
  }
}
