"use client";

import { usePathname } from "next/navigation";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditor = /^\/workflows\/[^/]+/.test(pathname);

  return (
    <div className={`flex flex-1 flex-col ${isEditor ? "" : "pl-56"}`}>
      {children}
    </div>
  );
}

export function PagePadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditor = /^\/workflows\/[^/]+/.test(pathname);

  if (isEditor) return <>{children}</>;
  return <div className="p-6">{children}</div>;
}
