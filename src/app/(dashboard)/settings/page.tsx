"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, updatePassword } from "@/actions/settings";
import { useSession } from "next-auth/react";

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Min. 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileInput = z.infer<typeof profileSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

// ── Toast helper ──────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        type === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-950/50 text-red-400"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {msg}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();

  // Profile form
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: session?.user?.name ?? "" },
  });

  async function onProfileSubmit(data: ProfileInput) {
    setProfileMsg(null);
    const res = await updateProfile(data);
    if (res.error) {
      setProfileMsg({ text: res.error, type: "error" });
    } else {
      await updateSession({ name: data.name });
      setProfileMsg({ text: res.success!, type: "success" });
    }
  }

  // Password form
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onPasswordSubmit(data: PasswordInput) {
    setPasswordMsg(null);
    const res = await updatePassword(data);
    if (res.error) {
      setPasswordMsg({ text: res.error, type: "error" });
    } else {
      setPasswordMsg({ text: res.success!, type: "success" });
      passwordForm.reset();
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <User className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Profile</h2>
            <p className="text-xs text-zinc-500">Update your display name</p>
          </div>
        </div>

        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              {...profileForm.register("name")}
            />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-red-400">{profileForm.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input value={session?.user?.email ?? ""} disabled className="opacity-50 cursor-not-allowed" />
            <p className="text-xs text-zinc-600">Email cannot be changed</p>
          </div>

          {profileMsg && <Toast msg={profileMsg.text} type={profileMsg.type} />}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {profileForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Lock className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Password</h2>
            <p className="text-xs text-zinc-500">Change your account password</p>
          </div>
        </div>

        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              {...passwordForm.register("currentPassword")}
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-xs text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Min. 6 characters"
              {...passwordForm.register("newPassword")}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-xs text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...passwordForm.register("confirmPassword")}
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {passwordMsg && <Toast msg={passwordMsg.text} type={passwordMsg.type} />}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {passwordForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Account info */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-semibold text-white mb-3">Account</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Email</span>
            <span className="text-zinc-300">{session?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Name</span>
            <span className="text-zinc-300">{session?.user?.name ?? "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
