import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Film, Users, MessageSquare, Coins, Star } from "lucide-react";
import { GlassCard } from "@/components/dashboard/StudioLayout";
import type { DashboardOverview } from "@/lib/api";

export function OverviewTab({ overview }: { overview: DashboardOverview }) {
  const cost = overview.cost_estimation;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Film, label: "Scenes", value: String(overview.total_scenes) },
          { icon: Users, label: "Characters", value: String(overview.total_characters) },
          { icon: MessageSquare, label: "Dialogue Words", value: String(overview.total_words_of_dialogue) },
          { icon: Coins, label: "Budget Risk", value: cost ? `${cost.budget_risk_score}` : "—", suffix: "/100" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <GlassCard className="transition-shadow duration-300 hover:shadow-[0_0_24px_-8px_var(--gold-bright)]">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
                  <Icon className="h-3.5 w-3.5" /> {stat.label}
                </div>
                <div className="mt-2 font-display text-4xl text-foreground">
                  {stat.value}
                  {stat.suffix && <span className="text-sm text-muted-foreground"> {stat.suffix}</span>}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-foreground">
            <Star className="h-4 w-4 text-[var(--gold-bright)]" /> Most Important Scenes
          </h3>
          {overview.top_scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scene-importance data yet.</p>
          ) : (
            <ul className="space-y-2">
              {overview.top_scenes.map((s) => (
                <li
                  key={s.scene_number}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm transition-colors duration-200 hover:border-[oklch(0.85_0.155_86/0.2)] hover:bg-black/30"
                >
                  <span className="truncate text-foreground/90">
                    S{s.scene_number} · {s.scene_heading || "Untitled scene"}
                  </span>
                  <span className="font-mono text-xs text-[var(--gold-bright)]">
                    {s.importance_score.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-foreground">
            <Coins className="h-4 w-4 text-[var(--gold-bright)]" /> Production Snapshot
          </h3>
          {cost ? (
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">VFX Complexity</span>
                <span className="text-foreground">{cost.vfx_complexity}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Shooting Difficulty</span>
                <span className="text-foreground">{cost.shooting_difficulty}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Locations</span>
                <span className="text-foreground">{cost.total_locations}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Budget</span>
                <span className="text-[var(--gold-bright)]">{cost.estimated_budget_range}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No production estimate yet.</p>
          )}
          <Link to="/script-upload" className="mt-4 inline-block text-xs text-[var(--gold-bright)]">
            ← Back to all scripts
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
