import { createFileRoute } from "@tanstack/react-router";
import { GeneratorShell } from "@/components/studio/GeneratorShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/characters")({
  head: () => ({ meta: [{ title: "Character Generator — Studio" }] }),
  component: () => (
    <GeneratorShell
      eyebrow="Create"
      title="Character Generator"
      description="Conjure deep characters with backstory, arcs, motivations, and visual references — saved to your Character Library."
      submitLabel="Generate Character"
      fields={[
        { name: "brief", label: "Character Brief", type: "textarea", placeholder: "A weary detective with a gambling habit and a secret soft spot for stray dogs…" },
        { name: "role", label: "Dramatic Role", type: "select", optional: true, options: ["Protagonist", "Antagonist", "Mentor", "Sidekick", "Love Interest", "Foil", "Comic Relief"] },
      ]}
      generate={(v) => api.studio.generateCharacter({ brief: v.brief, role: v.role || undefined })}
    />
  ),
});
