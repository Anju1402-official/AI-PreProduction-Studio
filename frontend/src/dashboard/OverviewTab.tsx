import { Link } from "@tanstack/react-router";
import { Film, Users, MessageSquare, Coins, Star } from "lucide-react";
import { GlassCard } from "@/components/dashboard/StudioLayout";
import type { DashboardOverview } from "@/lib/api";

export function OverviewTab({ overview }: { overview: DashboardOverview }) {
  const cost = overview.cost_estimation;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
            <Film className="h-3.5 w-3.5" /> Scenes
          </div>
          <div className="mt-2 font-display text-4xl text-foreground">{overview.total_scenes}</div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
            <Users className="h-3.5 w-3.5" /> Characters
          </div>
          <div className="mt-2 font-display text-4xl text-foreground">
            {overview.total_characters}
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
            <MessageSquare className="h-3.5 w-3.5" /> Dialogue Words
          </div>
          <div className="mt-2 font-display text-4xl text-foreground">
            {overview.total_words_of_dialogue}
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
            <Coins className="h-3.5 w-3.5" /> Budget Risk
          </div>
          <div className="mt-2 font-display text-4xl text-foreground">
            {cost ? `${cost.budget_risk_score}` : "—"}
            <span className="text-sm text-muted-foreground"> /100</span>
          </div>
        </GlassCard>
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
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
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
