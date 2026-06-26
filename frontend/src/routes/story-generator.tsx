import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/story-generator")({
  head: () => ({ meta: [{ title: "Story Generator — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Create"
      title="Story Generator"
      description="Generate original stories, plots, and loglines with AI — coming soon."
    />
  ),
});
