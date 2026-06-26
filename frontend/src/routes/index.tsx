import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudioLayout } from "@/components/dashboard/StudioLayout";
import { HeroProject } from "@/components/dashboard/HeroProject";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { AICreativeSuite } from "@/components/dashboard/AICreativeSuite";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Pre-Production Studio — Filmmaker Dashboard" },
      {
        name: "description",
        content:
          "Your AI copilot for filmmakers. Plan, write, direct, and produce from a single cinematic dashboard.",
      },
      { property: "og:title", content: "AI Pre-Production Studio" },
      { property: "og:description", content: "Your AI copilot for filmmakers." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", user?.id],
    queryFn: () => api.dashboard.summary(user!.id),
    enabled: !!user,
  });

  const limitQuery = useQuery({
    queryKey: ["payments", "check-limit", user?.id],
    queryFn: () => api.payments.checkLimit(user!.id),
    enabled: !!user,
  });

  return (
    <StudioLayout>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {summaryQuery.isLoading ? (
            <LoadingState label="Loading your studio…" />
          ) : summaryQuery.isError ? (
            <ErrorState
              message={
                summaryQuery.error instanceof ApiError
                  ? summaryQuery.error.message
                  : "Couldn't load your dashboard. Please try again."
              }
              onRetry={() => summaryQuery.refetch()}
            />
          ) : (
            <>
              <HeroProject summary={summaryQuery.data} />
              <AICreativeSuite />
              <AnalyticsSection summary={summaryQuery.data} />
              <RecentProjects summary={summaryQuery.data} />
            </>
          )}
        </div>
        <RightPanel summary={summaryQuery.data} limit={limitQuery.data} />
      </div>
    </StudioLayout>
  );
}
