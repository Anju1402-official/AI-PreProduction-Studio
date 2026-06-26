import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/character-library")({
  head: () => ({ meta: [{ title: "Character Library — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Asset Library"
      title="Character Library"
      description="Casting boards, wardrobe, and character bibles."
    />
  ),
});
