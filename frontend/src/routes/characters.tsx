import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/characters")({
  head: () => ({ meta: [{ title: "Character Generator — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Create"
      title="Character Generator"
      description="Conjure deep characters with arcs, voice, and visual references."
    />
  ),
});
