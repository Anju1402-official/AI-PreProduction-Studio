import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Film, Users, MessageSquare, FileCheck2 } from "lucide-react";
import type { DashboardSummary } from "@/lib/api";

export function AnalyticsSection({ summary }: { summary?: DashboardSummary }) {
  if (!summary) return null;

  const { stats } = summary;
  const completionPct = stats.total_scripts
    ? Math.round((stats.completed_scripts / stats.total_scripts) * 100)
    : 0;

  const cards = [
    {
      icon: FileCheck2,
      label: "Scripts",
      value: stats.total_scripts,
      caption: `${stats.completed_scripts} completed`,
      to: "/script-upload",
    },
    {
      icon: Film,
      label: "Scenes Parsed",
      value: stats.total_scenes,
      caption: "Across all scripts",
      to: "/script-upload",
    },
    {
      icon: Users,
      label: "Characters",
      value: stats.total_characters,
      caption: "Detected by the parser",
      to: "/script-upload",
    },
    {
      icon: MessageSquare,
      label: "Dialogue Lines",
      value: stats.total_dialogues,
      caption: "Lines of dialogue",
      to: "/script-upload",
    },
  ];

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl tracking-[0.18em] text-foreground">
          STUDIO <span className="gold-text">OVERVIEW</span>
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link
                to={c.to}
                className="glass-card block rounded-2xl p-4 hover-glow transition hover:border-[oklch(0.85_0.155_86/0.3)]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {c.label}
                  </div>
                  <Icon className="h-4 w-4 text-[var(--gold-bright)]" />
                </div>
                <div className="mt-2 font-display text-4xl text-foreground">{c.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{c.caption}</div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.22em] text-muted-foreground">Completion Rate</span>
          <span className="font-mono text-[var(--gold-bright)]">{completionPct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] shadow-[0_0_8px_var(--gold-bright)]"
          />
        </div>
      </div>
    </section>
  );
}
