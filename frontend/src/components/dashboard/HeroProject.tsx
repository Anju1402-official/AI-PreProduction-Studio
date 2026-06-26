import { motion } from "framer-motion";
import { Film, Users, FileCheck2, Calendar, ArrowRight, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DashboardSummary } from "@/lib/api";
import { EmptyState } from "@/components/dashboard/StatusStates";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusLabel: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function HeroProject({ summary }: { summary?: DashboardSummary }) {
  const latest = summary?.recent_scripts?.[0];

  if (!summary || !latest) {
    return (
      <EmptyState
        title="No scripts yet"
        description="Upload your first screenplay to see it appear here as your current project, with live stats from the studio."
        icon={<Upload className="h-6 w-6 text-[var(--gold-bright)]" />}
        action={
          <Link
            to="/script-upload"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)]"
          >
            <Upload className="h-3.5 w-3.5" /> Upload a Script
          </Link>
        }
      />
    );
  }

  const metrics = [
    { icon: Film, label: "Scenes", value: String(summary.stats.total_scenes) },
    { icon: Users, label: "Characters", value: String(summary.stats.total_characters) },
    { icon: FileCheck2, label: "Total Scripts", value: String(summary.stats.total_scripts) },
    { icon: Calendar, label: "Last Updated", value: formatDate(latest.created_at) },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.15)] bg-[#0f0f0f] shadow-[var(--shadow-premium)]"
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT — text */}
        <div className="relative z-10 flex flex-col gap-4 p-7">
          <div className="text-[10px] uppercase tracking-[0.32em] text-[var(--gold-dim)]">
            Current Project
          </div>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-foreground md:text-4xl">
            {latest.title}
          </h1>

          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-1 text-[11px] uppercase tracking-widest text-[var(--gold-bright)]">
              {statusLabel[latest.status] ?? latest.status}
            </span>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {summary.stats.total_scenes} scenes · {summary.stats.total_characters} characters ·{" "}
            {summary.stats.total_dialogues} lines of dialogue parsed so far across your{" "}
            {summary.stats.total_scripts} script{summary.stats.total_scripts === 1 ? "" : "s"}.
          </p>

          <div className="mt-2 flex items-center gap-3">
            <Link
              to="/scripts/$scriptId"
              params={{ scriptId: String(latest.id) }}
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_36px_-2px_var(--gold-bright)]"
            >
              View Analysis
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT — script overview card */}
        <div className="relative z-10 m-4 rounded-2xl border border-[oklch(0.85_0.155_86/0.18)] bg-[#0d0d0d]/80 p-5 backdrop-blur-xl">
          <div className="mb-1 text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
            Studio Stats
          </div>
          <div className="flex items-end gap-2">
            <div className="font-display text-5xl text-foreground">
              {summary.stats.completed_scripts}
            </div>
            <div className="mb-2 text-xs text-[var(--gold-bright)]">scripts fully analyzed</div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: summary.stats.total_scripts
                  ? `${(summary.stats.completed_scripts / summary.stats.total_scripts) * 100}%`
                  : "0%",
              }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] shadow-[0_0_10px_var(--gold-bright)]"
            />
          </div>

          <ul className="mt-5 space-y-2.5">
            {summary.recent_scripts.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{s.title}</span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    s.status === "completed"
                      ? "border-[var(--gold-bright)] bg-[oklch(0.85_0.155_86/0.12)] text-[var(--gold-bright)]"
                      : s.status === "failed"
                        ? "border-red-400/30 bg-red-400/5 text-red-300"
                        : "border-white/10 bg-white/5 text-muted-foreground"
                  }`}
                >
                  {statusLabel[s.status] ?? s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metric strip */}
      <div className="relative z-10 grid grid-cols-2 gap-px border-t border-[oklch(0.85_0.155_86/0.1)] bg-[oklch(0.85_0.155_86/0.1)] sm:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="flex items-center gap-2 bg-[#0d0d0d] px-3 py-3 sm:gap-3 sm:px-5"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.2)] bg-[oklch(0.85_0.155_86/0.08)]">
                <Icon className="h-4 w-4 text-[var(--gold-bright)]" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.label}
                </div>
                <div className="truncate font-display text-base text-foreground">{m.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
