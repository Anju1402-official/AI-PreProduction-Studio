import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
  GhostButton,
} from "@/components/dashboard/StudioLayout";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/credits")({
  head: () => ({ meta: [{ title: "Plan & Usage — Studio" }] }),
  component: Credits,
});

const planLabels: Record<string, string> = {
  creator: "Creator",
  professional: "Professional Director",
  studio: "Studio",
};

function Credits() {
  const { user } = useAuth();

  const limitQuery = useQuery({
    queryKey: ["payments", "check-limit", user?.id],
    queryFn: () => api.payments.checkLimit(user!.id),
    enabled: !!user,
  });

  const plansQuery = useQuery({
    queryKey: ["payments", "plans"],
    queryFn: () => api.payments.plans(),
  });

  const isLoading = limitQuery.isLoading || plansQuery.isLoading;
  const isError = limitQuery.isError || plansQuery.isError;
  const firstError = limitQuery.error ?? plansQuery.error;

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Studio"
        title="Plan & Usage"
        description="Your current plan, script limit, and upgrade options."
      />

      {isLoading ? (
        <LoadingState label="Loading your plan…" />
      ) : isError ? (
        <ErrorState
          message={firstError instanceof ApiError ? firstError.message : "Couldn't load your plan."}
          onRetry={() => {
            limitQuery.refetch();
            plansQuery.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <GlassCard className="lg:col-span-1">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
                Current Plan
              </div>
              <div className="mt-3 flex items-end gap-3">
                <CreditCard className="h-8 w-8 text-[var(--gold-bright)] drop-shadow-[0_0_18px_var(--gold-bright)]" />
                <div className="font-display text-3xl">
                  <span className="bg-gradient-to-r from-[var(--gold-bright)] to-[var(--gold-dim)] bg-clip-text text-transparent">
                    {limitQuery.data
                      ? (planLabels[limitQuery.data.plan_type] ?? limitQuery.data.plan_type)
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="mt-6 rounded-lg border border-white/5 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                  Scripts Uploaded
                </div>
                <div className="mt-1 font-mono text-lg text-foreground">
                  {limitQuery.data?.scripts_uploaded ?? 0}
                </div>
              </div>
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${
                  limitQuery.data?.can_upload
                    ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"
                    : "border-amber-400/30 bg-amber-400/5 text-amber-300"
                }`}
              >
                {limitQuery.data?.can_upload ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {limitQuery.data?.message}
              </div>
            </GlassCard>

            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              {(plansQuery.data?.plans ?? []).map((p) => {
                const isCurrent = limitQuery.data?.plan_type === p.plan_type;
                return (
                  <GlassCard
                    key={p.plan_type}
                    className={isCurrent ? "ring-1 ring-[oklch(0.85_0.155_86/0.5)]" : ""}
                  >
                    {isCurrent && (
                      <div className="mb-2 inline-block rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black">
                        Current Plan
                      </div>
                    )}
                    <h3 className="font-display text-xl text-foreground">{p.name}</h3>
                    <div className="mt-2 font-display text-2xl">
                      <span className="bg-gradient-to-r from-[var(--gold-bright)] to-[var(--gold-dim)] bg-clip-text text-transparent">
                        {p.price}
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-[var(--gold-bright)]" /> {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <div className="mt-5">
                        <GhostButton
                          className="w-full justify-center"
                          onClick={() =>
                            toast.info("Plan upgrades are handled by your studio administrator.")
                          }
                        >
                          Request Upgrade
                        </GhostButton>
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </>
      )}
    </StudioLayout>
  );
}
