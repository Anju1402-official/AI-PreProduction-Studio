import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudioLayout, PageHeader, GlassCard } from "@/components/dashboard/StudioLayout";
import { Users, Film, FileText, UserSquare2, Shield } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Studio Stats — Studio" }] }),
  component: Admin,
});

function Admin() {
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.dashboard.stats(),
  });

  const stats = statsQuery.data
    ? [
        { label: "Total Users", value: statsQuery.data.total_users, icon: Users },
        { label: "Total Scripts", value: statsQuery.data.total_scripts, icon: FileText },
        { label: "Total Scenes", value: statsQuery.data.total_scenes, icon: Film },
        { label: "Total Characters", value: statsQuery.data.total_characters, icon: UserSquare2 },
      ]
    : [];

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Studio"
        title="Studio Stats"
        description="Platform-wide totals across every user of the studio."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-bright)]">
            <Shield className="h-3 w-3" /> Public Totals
          </div>
        }
      />

      {statsQuery.isLoading ? (
        <LoadingState label="Loading platform stats…" />
      ) : statsQuery.isError ? (
        <ErrorState
          message={
            statsQuery.error instanceof ApiError
              ? statsQuery.error.message
              : "Couldn't load platform stats."
          }
          onRetry={() => statsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
                      {s.label}
                    </div>
                    <div className="mt-2 font-display text-3xl text-foreground">{s.value}</div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-md border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)]">
                    <Icon className="h-4 w-4 text-[var(--gold-bright)]" />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <GlassCard className="mt-6">
        <p className="text-sm text-muted-foreground">
          This studio doesn't yet have per-user account management or role-based admin controls —
          these totals are aggregated across all users on the platform.
        </p>
      </GlassCard>
    </StudioLayout>
  );
}
