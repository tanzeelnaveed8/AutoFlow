import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { LayoutShell, PagePadding } from "@/components/layout/layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <LayoutShell>
        <Navbar user={session.user!} />
        <main className="flex-1">
          <PagePadding>{children}</PagePadding>
        </main>
      </LayoutShell>
    </div>
  );
}
