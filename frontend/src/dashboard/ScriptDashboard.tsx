import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, BarChart3, Sparkles, Clapperboard, ArrowLeft } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { PipelineProgress } from "@/dashboard/PipelineProgress";
import { OverviewTab } from "@/dashboard/OverviewTab";
import { AnalysisTab } from "@/dashboard/AnalysisTab";
import { RecommendationsTab } from "@/dashboard/RecommendationsTab";
import { StoryboardTab } from "@/dashboard/StoryboardTab";
import { usePipelineDashboard } from "@/dashboard/usePipelineDashboard";
import { ApiError } from "@/lib/api";

type TabKey = "overview" | "analysis" | "recommendations" | "storyboard";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "analysis", label: "Analysis", icon: BarChart3 },
  { key: "recommendations", label: "Recommendations", icon: Sparkles },
  { key: "storyboard", label: "Storyboard", icon: Clapperboard },
];

export function ScriptDashboard({ scriptId }: { scriptId: number }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const query = usePipelineDashboard(scriptId);

  if (query.isLoading) {
    return <LoadingState label="Loading script dashboard…" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError
            ? query.error.message
            : "Couldn't load this script's dashboard."
        }
        onRetry={() => query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data) return null;

  const isRunning = data.status !== "completed" && data.status !== "failed";

  return (
    <>
      <PageHeader
        eyebrow="Script"
        title={data.overview?.title ?? `Script #${scriptId}`}
        description="Every analysis stage runs automatically after upload — explore the results in the tabs below."
        actions={
          <Link
            to="/script-upload"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground transition hover:border-[oklch(0.85_0.155_86/0.3)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Scripts
          </Link>
        }
      />

      {isRunning || data.status === "failed" ? (
        <PipelineProgress stage={data.pipeline_stage} errorMessage={data.error_message} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5 pb-3">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition sm:gap-2 sm:px-4 ${
                    active
                      ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-black font-semibold shadow-[0_0_20px_-6px_var(--gold-bright)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" &&
            (data.overview ? (
              <OverviewTab overview={data.overview} />
            ) : (
              <GlassCard>
                <p className="text-sm text-muted-foreground">No overview data available.</p>
              </GlassCard>
            ))}
          {tab === "analysis" &&
            (data.analysis ? (
              <AnalysisTab data={data.analysis} />
            ) : (
              <GlassCard>
                <p className="text-sm text-muted-foreground">No analysis data available.</p>
              </GlassCard>
            ))}
          {tab === "recommendations" &&
            (data.recommendations ? (
              <RecommendationsTab data={data.recommendations} />
            ) : (
              <GlassCard>
                <p className="text-sm text-muted-foreground">No recommendations available.</p>
              </GlassCard>
            ))}
          {tab === "storyboard" && <StoryboardTab storyboard={data.storyboard} />}
        </>
      )}
    </>
  );
}
