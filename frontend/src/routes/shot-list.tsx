import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/shot-list")({
  head: () => ({ meta: [{ title: "Shot List — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Pre-Production"
      title="Shot List"
      description="Auto-generated shot lists with setups, lenses, and call sheets."
    />
  ),
});
