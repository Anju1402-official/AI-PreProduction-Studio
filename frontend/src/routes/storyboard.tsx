import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/storyboard")({
  head: () => ({ meta: [{ title: "Storyboard Generator — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Pre-Production"
      title="Storyboard Generator"
      description="Frame-by-frame visual storyboards generated from your script — coming soon."
    />
  ),
});
