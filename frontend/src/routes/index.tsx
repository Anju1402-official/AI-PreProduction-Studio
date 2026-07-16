import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StudioLayout } from "@/components/dashboard/StudioLayout";
import { HeroProject } from "@/components/dashboard/HeroProject";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { AICreativeSuite } from "@/components/dashboard/AICreativeSuite";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { WorkflowSteps } from "@/components/dashboard/WorkflowSteps";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CineOS AI — Dashboard" },
      {
        name: "description",
        content:
          "From Script to Production — Powered by AI",
      },
      { property: "og:title", content: "CineOS AI" },
      { property: "og:description", content: "From Script to Production — Powered by AI" },
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
              <WorkflowSteps />
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
