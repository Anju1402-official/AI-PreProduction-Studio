import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListChecks, FileText, Camera } from "lucide-react";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
} from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/shot-list")({
  head: () => ({ meta: [{ title: "Shot List — Studio" }] }),
  component: ShotList,
});

function ShotList() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);

  const scriptsQuery = useQuery({
    queryKey: ["scripts", "forUser", user?.id],
    queryFn: () => api.scripts.forUser(user!.id),
    enabled: !!user,
  });

  const shotsQuery = useQuery({
    queryKey: ["analysis", "shots", selected],
    queryFn: () => api.analysis.shots(selected!),
    enabled: selected != null,
    retry: false,
  });

  const scripts = scriptsQuery.data ?? [];

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Pre-Production"
        title="Shot List"
        description="Auto-generated shot suggestions per scene, pulled from your script's analysis pipeline."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <GlassCard>
          <h3 className="mb-4 font-display text-lg text-foreground">Choose a Script</h3>
          {scriptsQuery.isLoading ? (
            <LoadingState label="Loading your scripts…" />
          ) : scriptsQuery.isError ? (
            <ErrorState message="Couldn't load your scripts." onRetry={() => scriptsQuery.refetch()} />
          ) : scripts.length === 0 ? (
            <EmptyState
              title="No scripts yet"
              description="Upload a screenplay to generate its shot list."
              icon={<FileText className="h-6 w-6 text-[var(--gold-bright)]" />}
            />
          ) : (
            <ul className="space-y-2">
              {scripts.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      selected === s.id
                        ? "border-[oklch(0.85_0.155_86/0.5)] bg-[oklch(0.85_0.155_86/0.08)]"
                        : "border-white/5 bg-black/30 hover:border-[oklch(0.85_0.155_86/0.3)]"
                    }`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.08)]">
                      <FileText className="h-4 w-4 text-[var(--gold-bright)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground">{s.status}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <div>
          {selected == null ? (
            <GlassCard className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)]">
                <ListChecks className="h-6 w-6 text-[var(--gold-bright)]" />
              </div>
              <h3 className="mt-4 font-display text-lg text-foreground">Pick a script</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Select one of your scripts to see its scene-by-scene shot suggestions.
              </p>
            </GlassCard>
          ) : shotsQuery.isLoading ? (
            <LoadingState label="Loading shot suggestions…" />
          ) : shotsQuery.isError ? (
            <ErrorState
              message={
                shotsQuery.error instanceof ApiError
                  ? shotsQuery.error.message
                  : "Shot suggestions aren't ready for this script yet."
              }
              onRetry={() => shotsQuery.refetch()}
            />
          ) : (
            <div className="space-y-4">
              {(shotsQuery.data?.suggestions ?? []).map((s, i) => (
                <motion.div
                  key={s.scene_number}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                >
                  <GlassCard>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] font-mono text-xs text-[var(--gold-bright)]">
                        S{s.scene_number}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm text-foreground">{s.scene_heading}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                          {s.emotion}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.suggested_shots.map((shot, j) => (
                        <span
                          key={j}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/90 transition-all duration-200 hover:border-[oklch(0.85_0.155_86/0.4)] hover:bg-[oklch(0.85_0.155_86/0.08)] hover:shadow-[0_0_12px_-4px_var(--gold-bright)]"
                        >
                          <Camera className="h-3 w-3 text-[var(--gold-dim)]" />
                          {shot}
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudioLayout>
  );
}
