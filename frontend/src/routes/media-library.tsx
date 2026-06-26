import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/media-library")({
  head: () => ({ meta: [{ title: "Media Library — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Asset Library"
      title="Media Library"
      description="Every frame, plate, and reference image — one searchable vault."
    />
  ),
});
