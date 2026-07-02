"use client";

import Image from "next/image";
import Link from "next/link";
import logoImage from "@/assets/logoo.png";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  History,
  Puzzle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/executions", label: "Executions", icon: History },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
];

export function Sidebar() {
  const pathname = usePathname();

  if (/^\/workflows\/[^/]+/.test(pathname)) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-zinc-800/80 bg-zinc-950">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800/80 px-4">
        <Image src={logoImage} alt="AutoFlow" width={28} height={28} className="rounded-md" />
        <span className="text-[15px] font-bold text-white tracking-tight">AutoFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-orange-500/12 text-orange-400"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-orange-400" : "text-zinc-500")} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800/80 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
            pathname === "/settings"
              ? "bg-orange-500/12 text-orange-400"
              : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
