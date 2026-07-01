import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wand2, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
  GoldButton,
} from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError, type ScriptCorrectionResponse } from "@/lib/api";

export const Route = createFileRoute("/script-correction")({
  head: () => ({ meta: [{ title: "Script Correction — Studio" }] }),
  component: ScriptCorrection,
});

const CATEGORY_STYLES: Record<string, string> = {
  continuity: "border-red-400/30 bg-red-400/5 text-red-300",
  formatting: "border-blue-400/30 bg-blue-400/5 text-blue-300",
  dialogue: "border-[oklch(0.85_0.155_86/0.4)] bg-[oklch(0.85_0.155_86/0.08)] text-[var(--gold-bright)]",
  grammar: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
};

function ScriptCorrection() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [report, setReport] = useState<ScriptCorrectionResponse | null>(null);

  const scriptsQuery = useQuery({
    queryKey: ["scripts", "forUser", user?.id],
    queryFn: () => api.scripts.forUser(user!.id),
    enabled: !!user,
  });

  const correctMutation = useMutation({
    mutationFn: (scriptId: number) => api.studio.correctScript(scriptId),
    onSuccess: (data) => {
      setReport(data);
      if (data.scenes_with_issues === 0) {
        toast.success("No issues found — this script is clean!");
      } else {
        toast.success(`Found notes across ${data.scenes_with_issues} scene(s).`);
      }
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Correction failed. Please try again."),
  });

  const scripts = scriptsQuery.data ?? [];

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Analyze"
        title="Script Correction"
        description="Continuity, formatting, dialogue, and grammar notes in a single AI pass over one of your uploaded scripts."
        actions={
          <span className="flex items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-bright)]">
            <Wand2 className="h-3 w-3" /> AI Powered
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <GlassCard>
          <h3 className="mb-4 font-display text-lg text-foreground">Choose a Script</h3>
          {scriptsQuery.isLoading ? (
            <LoadingState label="Loading your scripts…" />
          ) : scriptsQuery.isError ? (
            <ErrorState message="Couldn't load your scripts." onRetry={() => scriptsQuery.refetch()} />
          ) : scripts.length === 0 ? (
            <EmptyState
              title="No scripts yet"
              description="Upload a screenplay first, then run a correction pass on it."
              icon={<FileText className="h-6 w-6 text-[var(--gold-bright)]" />}
            />
          ) : (
            <ul className="space-y-2">
              {scripts.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setSelected(s.id);
                      setReport(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      selected === s.id
                        ? "border-[oklch(0.85_0.155_86/0.5)] bg-[oklch(0.85_0.155_86/0.08)]"
                        : "border-white/5 bg-black/30 hover:border-[oklch(0.85_0.155_86/0.3)]"
                    }`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.08)]">
                      <FileText className="h-4 w-4 text-[var(--gold-bright)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground">{s.status}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <GoldButton
            onClick={() => {
              if (selected == null) {
                toast.error("Select a script first.");
                return;
              }
              correctMutation.mutate(selected);
            }}
            className={`mt-4 w-full justify-center ${correctMutation.isPending ? "pointer-events-none opacity-70" : ""}`}
          >
            {correctMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reviewing…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" /> Run Correction Pass
              </>
            )}
          </GoldButton>
        </GlassCard>

        <div>
          {correctMutation.isPending ? (
            <GlassCard className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black"
              >
                <Wand2 className="h-6 w-6 text-[var(--gold-bright)]" />
              </motion.div>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                Reviewing scene by scene…
              </p>
            </GlassCard>
          ) : report ? (
            <div className="space-y-4">
              <GlassCard>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                      Scenes Reviewed
                    </div>
                    <div className="font-display text-3xl text-foreground">{report.scenes_reviewed}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                      With Notes
                    </div>
                    <div className="font-display text-3xl text-foreground">{report.scenes_with_issues}</div>
                  </div>
                </div>
              </GlassCard>

              {report.results.length === 0 ? (
                <GlassCard className="flex min-h-[180px] flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  <h3 className="mt-3 font-display text-lg text-foreground">Clean pass</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No notable continuity, formatting, dialogue, or grammar issues found.
                  </p>
                </GlassCard>
              ) : (
                report.results.map((scene, i) => (
                  <motion.div
                    key={scene.scene_number}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  >
                    <GlassCard>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] font-mono text-xs text-[var(--gold-bright)]">
                          S{scene.scene_number}
                        </span>
                        <div className="text-sm text-foreground">{scene.heading}</div>
                      </div>
                      <ul className="space-y-3">
                        {scene.issues.map((issue, j) => (
                          <li key={j} className="rounded-lg border border-white/5 bg-black/20 p-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${
                                  CATEGORY_STYLES[issue.category] ?? CATEGORY_STYLES.dialogue
                                }`}
                              >
                                {issue.category}
                              </span>
                            </div>
                            <p className="mt-2 flex items-start gap-2 text-sm text-foreground/90">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                              {issue.description}
                            </p>
                            <p className="mt-1.5 flex items-start gap-2 text-sm text-emerald-200/90">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                              {issue.suggestion}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <GlassCard className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)]">
                <Wand2 className="h-6 w-6 text-[var(--gold-bright)]" />
              </div>
              <h3 className="mt-4 font-display text-lg text-foreground">Pick a script to review</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The AI reviews up to the first 12 scenes for continuity, formatting, dialogue, and
                grammar, with a concrete suggested fix for each note.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </StudioLayout>
  );
}
