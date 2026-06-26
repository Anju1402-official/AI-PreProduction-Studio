import { createFileRoute } from "@tanstack/react-router";
import { ScriptDashboardPage } from "@/pages/ScriptDashboardPage";

export const Route = createFileRoute("/scripts/$scriptId")({
  head: () => ({ meta: [{ title: "Script Dashboard — Studio" }] }),
  component: ScriptDashboardRoute,
});

function ScriptDashboardRoute() {
  const { scriptId } = Route.useParams();
  return <ScriptDashboardPage scriptId={Number(scriptId)} />;
}
