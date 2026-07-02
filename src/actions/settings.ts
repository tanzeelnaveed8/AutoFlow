"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function updateProfile(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  return { success: "Profile updated" };
}

export async function updatePassword(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) return { error: "No password set on this account" };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });

  return { success: "Password updated" };
}
