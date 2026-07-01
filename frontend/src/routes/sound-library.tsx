import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/studio/LibraryShell";

export const Route = createFileRoute("/sound-library")({
  head: () => ({ meta: [{ title: "Sound Library — Studio" }] }),
  component: () => (
    <LibraryShell
      eyebrow="Asset Library"
      title="Storyboard Library"
      description="Shot-by-shot storyboards you've generated, ready for coverage planning."
      kind="storyboard"
      emptyCtaLabel="Generate a Storyboard"
      emptyCtaTo="/storyboard"
    />
  ),
});
