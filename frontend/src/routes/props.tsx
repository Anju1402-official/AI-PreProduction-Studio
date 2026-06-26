import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export const Route = createFileRoute("/props")({
  head: () => ({ meta: [{ title: "Props & Assets — Studio" }] }),
  component: () => (
    <ComingSoon
      eyebrow="Asset Library"
      title="Props & Assets"
      description="Props, vehicles, and hero items — tracked across departments."
    />
  ),
});
