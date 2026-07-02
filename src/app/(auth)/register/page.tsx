"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import logoImage from "@/assets/logoo.png";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { register as registerAction } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    const result = await registerAction(data);
    if (result.error) {
      setServerError(result.error);
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Image src={logoImage} alt="AutoFlow" width={48} height={48} className="rounded-xl" />
        <h1 className="text-2xl font-bold text-white">Create account</h1>
        <p className="text-sm text-zinc-400">Start automating your workflows</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Your name"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-950/50 border border-red-800 px-3 py-2 text-sm text-red-400">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-orange-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
