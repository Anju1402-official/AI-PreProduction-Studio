import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Create"
      title="Templates"
      description="Story, script, and pitch deck templates from working filmmakers."
    />
  ),
});
