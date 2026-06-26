import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/script-correction")({
  head: () => ({ meta: [{ title: "Script Correction — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Analyze"
      title="Script Correction"
      description="Continuity, formatting, and dialogue polish in a single pass."
    />
  ),
});
