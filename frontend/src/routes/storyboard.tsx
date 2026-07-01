import { createFileRoute } from "@tanstack/react-router";
import { GeneratorShell } from "@/components/studio/GeneratorShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/storyboard")({
  head: () => ({ meta: [{ title: "Storyboard Generator — Studio" }] }),
  component: () => (
    <GeneratorShell
      eyebrow="Pre-Production"
      title="Storyboard Generator"
      description="Break any scene into a sequential shot list with shot types, camera angles, and lighting notes."
      submitLabel="Generate Storyboard"
      fields={[
        { name: "scene_description", label: "Scene Description", type: "textarea", placeholder: "A tense standoff in a rain-soaked alley as two rivals finally meet…" },
        { name: "num_panels", label: "Number of Panels", type: "number", min: 1, max: 12, defaultValue: "6" },
      ]}
      generate={(v) => api.studio.generateStoryboard({ scene_description: v.scene_description, num_panels: Number(v.num_panels) || 6 })}
    />
  ),
});
