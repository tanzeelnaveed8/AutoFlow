import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Workflow } from "@prisma/client";
import {
  Workflow as WorkflowIcon,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Zap,
  TrendingUp,
  Play,
} from "lucide-react";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { CreateWorkflowDialog } from "@/components/dashboard/create-workflow-dialog";

type WorkflowWithMeta = Workflow & {
  _count: { executions: number };
  executions: Array<{ status: string; startedAt: Date }>;
};

function getGreeting(name: string | null | undefined) {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${prefix}, ${name ?? "there"}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [workflows, allExecutions] = await Promise.all([
    db.workflow.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { executions: true } },
        executions: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true, startedAt: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.execution.findMany({
      where: { workflow: { userId: session.user.id } },
      orderBy: { startedAt: "desc" },
      take: 8,
      select: {
        id: true, status: true, trigger: true, startedAt: true, duration: true, error: true,
        workflow: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalExecutions = (workflows as WorkflowWithMeta[]).reduce((s, w) => s + w._count.executions, 0);
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  const successCount = allExecutions.filter((e) => e.status === "SUCCESS").length;
  const failedCount = allExecutions.filter((e) => e.status === "FAILED").length;
  const successRate = allExecutions.length > 0 ? Math.round((successCount / allExecutions.length) * 100) : 0;

  const recentWorkflows = (workflows as WorkflowWithMeta[]).slice(0, 6);

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting(session.user.name)}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {workflows.length === 0
              ? "Create your first workflow to get started"
              : `You have ${workflows.length} workflow${workflows.length === 1 ? "" : "s"} · ${activeWorkflows} active`}
          </p>
        </div>
        <CreateWorkflowDialog />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Workflows"
          value={workflows.length}
          icon={WorkflowIcon}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          sub={activeWorkflows > 0 ? `${activeWorkflows} active` : "none active"}
        />
        <StatCard
          label="Total Executions"
          value={totalExecutions}
          icon={Zap}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          sub="all time"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          sub={`${successCount} of ${allExecutions.length} recent`}
        />
        <StatCard
          label="Failed Runs"
          value={failedCount}
          icon={XCircle}
          iconColor={failedCount > 0 ? "text-red-400" : "text-zinc-600"}
          iconBg={failedCount > 0 ? "bg-red-500/10" : "bg-zinc-800"}
          sub="recent runs"
        />
      </div>

      {/* Workflows section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">
            Your Workflows
            <span className="ml-2 text-sm font-normal text-zinc-500">({workflows.length})</span>
          </h2>
          {workflows.length > 6 && (
            <Link href="/workflows" className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {workflows.length === 0 ? (
          <EmptyWorkflows />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow as WorkflowWithMeta}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Executions */}
      {allExecutions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Executions</h2>
            <Link href="/executions" className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="divide-y divide-zinc-800/60">
              {allExecutions.map((exec) => (
                <Link
                  key={exec.id}
                  href={`/executions/${exec.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition-colors group"
                >
                  <StatusDot status={exec.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                      {exec.workflow.name}
                    </p>
                    {exec.status === "FAILED" && exec.error && (
                      <p className="text-[11px] text-red-400/80 truncate mt-0.5">{exec.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500">
                    <span className="capitalize">{exec.trigger}</span>
                    {exec.duration != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exec.duration < 1000
                          ? `${exec.duration}ms`
                          : `${(exec.duration / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    <span>{formatRelative(exec.startedAt)}</span>
                    <StatusBadge status={exec.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick actions — shown when no workflows */}
      {workflows.length === 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {QUICK_STARTS.map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${item.iconBg}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconColor, iconBg, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-600">{sub}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <div
      className={`h-2 w-2 rounded-full shrink-0 ${
        status === "SUCCESS" ? "bg-emerald-400" :
        status === "FAILED" ? "bg-red-400" :
        status === "RUNNING" ? "bg-yellow-400 animate-pulse" :
        "bg-zinc-600"
      }`}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
    RUNNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    PENDING: "bg-zinc-800 text-zinc-500 border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.PENDING}`}>
      {status}
    </span>
  );
}

function EmptyWorkflows() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
      <div className="mb-4">
        <Image src="/logoo.png" alt="AutoFlow" width={48} height={48} className="opacity-80" />
      </div>
      <p className="font-semibold text-white text-base">No workflows yet</p>
      <p className="text-sm text-zinc-500 mt-1 max-w-xs">
        Build your first automation workflow by connecting apps and actions
      </p>
      <div className="mt-6">
        <CreateWorkflowDialog />
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const QUICK_STARTS = [
  {
    title: "Connect Gmail",
    desc: "Trigger workflows from incoming emails, or send emails automatically",
    icon: Activity,
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  {
    title: "Use Webhooks",
    desc: "Receive HTTP webhooks from any external service to trigger your workflow",
    icon: Play,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
  },
  {
    title: "Add AI Steps",
    desc: "Summarize, classify, translate, or extract data using OpenAI or Claude",
    icon: CheckCircle2,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
  },
];
