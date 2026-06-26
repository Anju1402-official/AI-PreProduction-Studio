import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/world-builder")({
  head: () => ({ meta: [{ title: "World Builder — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Create"
      title="World Builder"
      description="Map continents, factions, and the rules of magic in one cohesive bible."
    />
  ),
});
