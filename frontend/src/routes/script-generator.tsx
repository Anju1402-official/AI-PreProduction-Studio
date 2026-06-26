import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/script-generator")({
  head: () => ({ meta: [{ title: "Script Generator — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Create"
      title="Script Generator"
      description="Turn a logline or outline into a full screenplay draft with AI — coming soon."
    />
  ),
});
