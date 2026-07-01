import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/studio/LibraryShell";

export const Route = createFileRoute("/props")({
  head: () => ({ meta: [{ title: "Script Library — Studio" }] }),
  component: () => (
    <LibraryShell
      eyebrow="Asset Library"
      title="Script Library"
      description="Short screenplays you've generated, scene by scene."
      kind="script"
      emptyCtaLabel="Generate a Script"
      emptyCtaTo="/script-generator"
    />
  ),
});
