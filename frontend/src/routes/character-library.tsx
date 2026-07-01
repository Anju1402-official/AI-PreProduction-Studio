import { createFileRoute } from "@tanstack/react-router";
import { LibraryShell } from "@/components/studio/LibraryShell";

export const Route = createFileRoute("/character-library")({
  head: () => ({ meta: [{ title: "Character Library — Studio" }] }),
  component: () => (
    <LibraryShell
      eyebrow="Asset Library"
      title="Character Library"
      description="Casting boards and character bibles you've generated."
      kind="character"
      emptyCtaLabel="Generate a Character"
      emptyCtaTo="/characters"
    />
  ),
});
