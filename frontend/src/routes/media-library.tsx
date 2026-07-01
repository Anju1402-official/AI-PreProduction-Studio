import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/studio/LibraryShell";

export const Route = createFileRoute("/media-library")({
  head: () => ({ meta: [{ title: "Media Library — Studio" }] }),
  component: () => (
    <LibraryShell
      eyebrow="Asset Library"
      title="Media Library"
      description="Every story and script you've generated — one searchable vault."
      emptyCtaLabel="Generate a Story"
      emptyCtaTo="/story-generator"
    />
  ),
});
