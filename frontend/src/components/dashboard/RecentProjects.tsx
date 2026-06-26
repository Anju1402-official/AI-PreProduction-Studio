import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Plus } from "lucide-react";
import type { DashboardSummary } from "@/lib/api";

const statusStyles: Record<string, string> = {
  completed: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
  processing:
    "border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)] text-[var(--gold-bright)]",
  uploaded: "border-white/10 bg-white/5 text-muted-foreground",
  failed: "border-red-400/30 bg-red-400/5 text-red-300",
};

export function RecentProjects({ summary }: { summary?: DashboardSummary }) {
  const scripts = summary?.recent_scripts ?? [];

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl tracking-[0.18em] text-foreground">
          RECENT <span className="gold-text">SCRIPTS</span>
        </h2>
        <Link
          to="/script-upload"
          className="flex items-center gap-1 text-xs text-[var(--gold-bright)]"
        >
          View All Scripts <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* New upload tile */}
        <Link
          to="/script-upload"
          className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-[oklch(0.85_0.155_86/0.25)] bg-[#0c0c0c] py-12 text-center transition hover:border-[oklch(0.85_0.155_86/0.5)] hover:bg-[oklch(0.85_0.155_86/0.05)]"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] transition group-hover:scale-110 group-hover:bg-[oklch(0.85_0.155_86/0.18)]">
            <Plus className="h-6 w-6 text-[var(--gold-bright)]" />
          </div>
          <div className="mt-3 text-xs uppercase tracking-widest text-[var(--gold-bright)]">
            Upload Script
          </div>
        </Link>

        {scripts.length === 0 && (
          <div className="col-span-full flex min-h-[100px] items-center justify-center rounded-2xl border border-white/5 bg-black/20 text-sm text-muted-foreground sm:col-span-2 md:col-span-2 lg:col-span-5">
            No scripts uploaded yet — your uploads will show up here.
          </div>
        )}

        {scripts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.12)] bg-[#0f0f0f] hover-glow"
          >
            <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-gradient-to-br from-[#161616] to-[#0a0a0a]">
              <FileText className="h-10 w-10 text-[var(--gold-dim)]" />
            </div>
            <div className="p-3.5">
              <div className="truncate font-display text-sm text-foreground">{p.title}</div>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${
                    statusStyles[p.status] ?? statusStyles.uploaded
                  }`}
                >
                  {p.status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
