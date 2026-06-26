import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Polls GET /scripts/{id}/dashboard while the backend's AI pipeline is
 * still running (status !== "completed" and !== "failed"), and stops
 * polling once it's done. This is what lets Script Upload be the single
 * entry point — the frontend never calls each analysis endpoint itself,
 * it just watches one resource until every stage has populated it.
 */
export function usePipelineDashboard(scriptId: number | null) {
  return useQuery({
    queryKey: ["scripts", scriptId, "dashboard"],
    queryFn: () => api.scripts.dashboard(scriptId!),
    enabled: scriptId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 2000;
    },
  });
}

/** Human-readable label for a pipeline_stage value, for progress UI. */
export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  parsing: "Parsing screenplay…",
  character_tracking: "Tracking characters…",
  emotion_analysis: "Analyzing emotional tone…",
  shot_suggestions: "Generating shot suggestions…",
  storyboard: "Building storyboard…",
  script_review: "Scoring scenes & estimating cost…",
  completed: "Analysis complete",
};

export function pipelineStageLabel(stage: string | null | undefined): string {
  if (!stage) return "Starting analysis…";
  return PIPELINE_STAGE_LABELS[stage] ?? "Processing…";
}
