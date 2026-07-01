import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/studio/LibraryShell";

export const Route = createFileRoute("/location-library")({
  head: () => ({ meta: [{ title: "Location Library — Studio" }] }),
  component: () => (
    <LibraryShell
      eyebrow="Asset Library"
      title="Location Library"
      description="Worlds and settings you've built — geography, factions, and history."
      kind="world"
      emptyCtaLabel="Build a World"
      emptyCtaTo="/world-builder"
    />
  ),
});
