import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/location-library")({
  head: () => ({ meta: [{ title: "Location Library — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Asset Library"
      title="Location Library"
      description="Scouted locations with permits, light maps, and notes."
    />
  ),
});
