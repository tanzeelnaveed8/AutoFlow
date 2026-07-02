import { db } from "@/lib/db";
import type { ExecutionContext } from "./base-types";

export type Output = Record<string, unknown>;

export function interp(template: string, data: Output): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => {
    const keys = key.split(".");
    let value: unknown = data;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else { value = undefined; break; }
    }
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export async function getToken(slug: string, ctx: ExecutionContext): Promise<string> {
  if (!ctx.userId) throw new Error(`Connect ${slug} in Integrations to use this node.`);
  const row = await db.userIntegration.findFirst({ where: { userId: ctx.userId, slug } });
  if (!row?.accessToken) throw new Error(`${slug} not connected — go to Integrations to connect it.`);
  return row.accessToken;
}

export function resolveField(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let v: unknown = obj;
  for (const k of keys) {
    if (v && typeof v === "object") v = (v as Record<string, unknown>)[k];
    else return undefined;
  }
  return v;
}
