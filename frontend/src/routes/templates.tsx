import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutTemplate, X, ArrowRight, Sparkles } from "lucide-react";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
} from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/StatusStates";
import { ArtifactContent } from "@/components/studio/ArtifactContent";
import { api, ApiError, type Artifact } from "@/lib/api";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — Studio" }] }),
  component: Templates,
});

const KIND_TO_ROUTE: Record<string, string> = {
  story: "/story-generator",
  script: "/script-generator",
  character: "/characters",
  world: "/world-builder",
  storyboard: "/storyboard",
};

function Templates() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Artifact | null>(null);

  const query = useQuery({
    queryKey: ["studio", "templates"],
    queryFn: () => api.studio.templates(),
  });

  const templates = query.data ?? [];

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Create"
        title="Templates"
        description="Story, script, character, and world starting points from working filmmakers."
      />

      {query.isLoading ? (
        <LoadingState label="Loading templates…" />
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : "Couldn't load templates."}
          onRetry={() => query.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, i) => {
            const kind = (t.content as any)?.template_kind as string | undefined;
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                onClick={() => setOpen(t)}
                className="group glass-card flex flex-col rounded-2xl p-5 text-left hover-glow"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)]">
                  <LayoutTemplate className="h-5 w-5 text-[var(--gold-bright)]" />
                </div>
                <h3 className="mt-4 font-display text-lg text-foreground">{t.title}</h3>
                {t.summary && (
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{t.summary}</p>
                )}
                {kind && (
                  <span className="mt-3 inline-block w-fit rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--gold-dim)]">
                    {kind}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(null)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[oklch(0.85_0.155_86/0.15)] bg-[#0b0b0b] p-6 shadow-[var(--shadow-premium)]"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-foreground">{open.title}</h2>
                <button
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ArtifactContent artifact={open} />
              {(() => {
                const kind = (open.content as any)?.template_kind as string | undefined;
                const to = kind ? KIND_TO_ROUTE[kind] : undefined;
                if (!to) return null;
                return (
                  <div className="mt-8 border-t border-white/5 pt-5">
                    <button
                      onClick={() => navigate({ to })}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Use this template
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StudioLayout>
  );
}
