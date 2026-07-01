import { createFileRoute } from "@tanstack/react-router";
import { GeneratorShell } from "@/components/studio/GeneratorShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/world-builder")({
  head: () => ({ meta: [{ title: "World Builder — Studio" }] }),
  component: () => (
    <GeneratorShell
      eyebrow="Create"
      title="World Builder"
      description="Map continents, factions, history, and the rules of your world into one cohesive bible."
      submitLabel="Build World"
      fields={[
        { name: "concept", label: "World Concept", type: "textarea", placeholder: "A drowned city where citizens trade memories as currency…" },
        { name: "genre", label: "Genre", type: "select", optional: true, options: ["Sci-Fi", "Fantasy", "Dystopian", "Historical", "Horror", "Steampunk", "Cyberpunk"] },
      ]}
      generate={(v) => api.studio.generateWorld({ concept: v.concept, genre: v.genre || undefined })}
    />
  ),
});
