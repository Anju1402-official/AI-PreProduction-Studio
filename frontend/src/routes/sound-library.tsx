import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/sound-library")({
  head: () => ({ meta: [{ title: "Sound Library — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Asset Library"
      title="Sound Library"
      description="Foley, ambiences, and original cues — tagged and ready."
    />
  ),
});
