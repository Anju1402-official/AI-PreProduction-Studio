import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { CreditCard, Sparkles, Clapperboard, ArrowRight } from "lucide-react";
import type { DashboardSummary, PlanLimitResponse } from "@/lib/api";

const planLabels: Record<string, string> = {
  creator: "Creator Plan",
  professional: "Professional Director",
  studio: "Studio Plan",
};

export function RightPanel({
  summary,
  limit,
}: {
  summary?: DashboardSummary;
  limit?: PlanLimitResponse;
}) {
  return (
    <aside className="flex w-full flex-col gap-4">
      {/* Plan & Usage */}
      <div className="relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.25)] bg-gradient-to-br from-[#1a1408] via-[#0e0a04] to-black p-5 shadow-[var(--shadow-glow-gold)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-[oklch(0.85_0.155_86/0.22)] blur-3xl" />
        <div className="relative mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
          <span>Your Plan</span>
          <CreditCard className="h-3.5 w-3.5" />
        </div>
        <div className="relative font-display text-2xl text-foreground">
          {summary ? (planLabels[summary.plan_type] ?? summary.plan_type) : "—"}
        </div>
        {limit && (
          <>
            <div className="relative mt-3 flex items-end justify-between text-sm">
              <span className="text-muted-foreground">Scripts uploaded</span>
              <span className="font-mono text-foreground">{limit.scripts_uploaded}</span>
            </div>
            <p
              className={`relative mt-2 text-[11px] ${
                limit.can_upload ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {limit.message}
            </p>
          </>
        )}
        <Link
          to="/credits"
          className="relative mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-2 text-xs font-semibold text-[var(--gold-bright)] transition hover:bg-[oklch(0.85_0.155_86/0.15)]"
        >
          View Plans <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Recent Scripts */}
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Recent Scripts
          </div>
          <Link to="/script-upload" className="text-[10px] text-[var(--gold-bright)]">
            Upload →
          </Link>
        </div>
        {!summary || summary.recent_scripts.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No scripts uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {summary.recent_scripts.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.2)] bg-[oklch(0.85_0.155_86/0.08)]">
                  <Clapperboard className="h-3.5 w-3.5 text-[var(--gold-bright)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-foreground">{s.title}</div>
                  <div className="text-[10px] text-muted-foreground">{s.status}</div>
                </div>
                <div className="text-[10px] text-[var(--gold-dim)]">
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick access to each script's unified dashboard */}
      <div className="relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.18)] bg-gradient-to-br from-[#15110a] to-black p-5">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[oklch(0.85_0.155_86/0.15)] blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--gold-bright)]" />
          <div className="font-display text-base text-foreground">JUMP TO ANALYSIS</div>
        </div>
        <p className="relative mt-2 text-xs text-muted-foreground">
          Every script gets one dashboard — Overview, Analysis, Recommendations, and Storyboard.
        </p>
        <div className="relative mt-3 flex flex-col gap-1.5">
          {!summary || summary.recent_scripts.length === 0 ? (
            <Link
              to="/script-upload"
              className="flex items-center gap-2 rounded-lg border border-[oklch(0.85_0.155_86/0.2)] bg-[oklch(0.85_0.155_86/0.05)] px-3 py-2 text-xs text-foreground transition hover:border-[oklch(0.85_0.155_86/0.4)] hover:bg-[oklch(0.85_0.155_86/0.1)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold-bright)]" />
              Upload your first script
            </Link>
          ) : (
            summary.recent_scripts.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                to="/scripts/$scriptId"
                params={{ scriptId: String(s.id) }}
                className="flex items-center gap-2 rounded-lg border border-[oklch(0.85_0.155_86/0.2)] bg-[oklch(0.85_0.155_86/0.05)] px-3 py-2 text-xs text-foreground transition hover:border-[oklch(0.85_0.155_86/0.4)] hover:bg-[oklch(0.85_0.155_86/0.1)]"
              >
                <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--gold-bright)]" />
                <span className="truncate">{s.title}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
