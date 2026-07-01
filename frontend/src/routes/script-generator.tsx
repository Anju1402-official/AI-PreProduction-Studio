import { createFileRoute } from "@tanstack/react-router";
import { GeneratorShell } from "@/components/studio/GeneratorShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/script-generator")({
  head: () => ({ meta: [{ title: "Script Generator — Studio" }] }),
  component: () => (
    <GeneratorShell
      eyebrow="Create"
      title="Script Generator"
      description="Turn a premise into a formatted short screenplay with scene headings, action, and dialogue."
      submitLabel="Generate Script"
      fields={[
        { name: "premise", label: "Premise", type: "textarea", placeholder: "Two strangers stuck in an elevator discover they're being hunted by the same person…" },
        { name: "genre", label: "Genre", type: "select", optional: true, options: ["Drama", "Thriller", "Comedy", "Sci-Fi", "Horror", "Romance", "Action", "Fantasy", "Crime"] },
        { name: "num_scenes", label: "Number of Scenes", type: "number", min: 1, max: 12, defaultValue: "4" },
      ]}
      generate={(v) => api.studio.generateScript({ premise: v.premise, genre: v.genre || undefined, num_scenes: Number(v.num_scenes) || 4 })}
    />
  ),
});
