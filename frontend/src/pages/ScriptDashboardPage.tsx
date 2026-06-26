import { StudioLayout } from "@/components/dashboard/StudioLayout";
import { ScriptDashboard } from "@/dashboard/ScriptDashboard";

/**
 * Page-level component for the unified per-script dashboard. Kept separate
 * from the route file (src/routes/scripts.$scriptId.tsx) so the route file
 * only handles route registration / param parsing, and this file holds the
 * actual page implementation -- consistent with how other multi-section
 * pages in src/pages/ are structured.
 */
export function ScriptDashboardPage({ scriptId }: { scriptId: number }) {
  return (
    <StudioLayout>
      <ScriptDashboard scriptId={scriptId} />
    </StudioLayout>
  );
}
