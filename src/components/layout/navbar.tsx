"use client";

import { signOut } from "next-auth/react";
import { User, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user: { name?: string | null; email?: string | null };
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="fixed top-0 right-0 left-60 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-6 backdrop-blur">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm text-zinc-300 max-w-30 truncate">
              {user.name ?? user.email}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-zinc-500 truncate">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-400 focus:text-red-400 focus:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
