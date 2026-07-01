import { createFileRoute } from "@tanstack/react-router";
import { GeneratorShell } from "@/components/studio/GeneratorShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/story-generator")({
  head: () => ({ meta: [{ title: "Story Generator — Studio" }] }),
  component: () => (
    <GeneratorShell
      eyebrow="Create"
      title="Story Generator"
      description="Generate original stories, plots, and loglines with AI. Every result is saved to your Media Library."
      submitLabel="Generate Story"
      fields={[
        { name: "prompt", label: "Your Idea", type: "textarea", placeholder: "A retired thief is pulled back in for one last job in near-future Tokyo…" },
        { name: "genre", label: "Genre", type: "select", optional: true, options: ["Drama", "Thriller", "Comedy", "Sci-Fi", "Horror", "Romance", "Action", "Fantasy", "Crime", "Documentary"] },
        { name: "tone", label: "Tone", type: "text", optional: true, placeholder: "e.g. Dark and suspenseful" },
      ]}
      generate={(v) => api.studio.generateStory({ prompt: v.prompt, genre: v.genre || undefined, tone: v.tone || undefined })}
    />
  ),
});
