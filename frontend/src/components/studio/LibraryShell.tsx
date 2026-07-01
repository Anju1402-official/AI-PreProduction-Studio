import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Trash2, X, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
} from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/StatusStates";
import { ArtifactContent } from "@/components/studio/ArtifactContent";
import { api, ApiError, type ArtifactKind } from "@/lib/api";

export function LibraryShell({
  eyebrow,
  title,
  description,
  kind,
  emptyCtaLabel,
  emptyCtaTo,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** Filter to a single kind, or undefined for everything the user made. */
  kind?: ArtifactKind;
  emptyCtaLabel: string;
  emptyCtaTo: string;
}) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["studio", "library", kind ?? "all"],
    queryFn: () => api.studio.library(kind),
  });

  const detailQuery = useQuery({
    queryKey: ["studio", "artifact", openId],
    queryFn: () => api.studio.artifact(openId!),
    enabled: openId != null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.studio.deleteArtifact(id),
    onSuccess: () => {
      toast.success("Deleted.");
      setOpenId(null);
      queryClient.invalidateQueries({ queryKey: ["studio", "library"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete that item."),
  });

  const items = listQuery.data ?? [];

  return (
    <StudioLayout>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <Link
            to={emptyCtaTo}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)]"
          >
            <Sparkles className="h-3.5 w-3.5" /> {emptyCtaLabel}
          </Link>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState label="Loading your library…" />
      ) : listQuery.isError ? (
        <ErrorState
          message={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : "Couldn't load your library."
          }
          onRetry={() => listQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Generate something and it'll be saved here automatically."
          action={
            <Link
              to={emptyCtaTo}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)]"
            >
              <Sparkles className="h-3.5 w-3.5" /> {emptyCtaLabel}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              onClick={() => setOpenId(item.id)}
              className="group glass-card flex flex-col rounded-2xl p-5 text-left hover-glow"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--gold-bright)]">
                  {item.kind}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-2 font-display text-lg text-foreground">
                {item.title}
              </h3>
              {item.summary && (
                <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {item.summary}
                </p>
              )}
              <span className="mt-4 flex items-center gap-1 text-[11px] text-[var(--gold-bright)]">
                Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {openId != null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
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
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
                    {detailQuery.data?.kind ?? ""}
                  </div>
                  <h2 className="font-display text-2xl text-foreground">
                    {detailQuery.data?.title ?? "Loading…"}
                  </h2>
                </div>
                <button
                  onClick={() => setOpenId(null)}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {detailQuery.isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--gold-bright)]" />
                </div>
              ) : detailQuery.isError ? (
                <ErrorState message="Couldn't load this item." onRetry={() => detailQuery.refetch()} />
              ) : detailQuery.data ? (
                <>
                  <ArtifactContent artifact={detailQuery.data} />
                  <div className="mt-8 border-t border-white/5 pt-5">
                    <button
                      onClick={() => {
                        if (confirm("Delete this item permanently?")) {
                          deleteMutation.mutate(detailQuery.data!.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StudioLayout>
  );
}
