import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, Clock, XCircle, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
  GoldButton,
} from "@/components/dashboard/StudioLayout";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/StatusStates";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/script-upload")({
  head: () => ({ meta: [{ title: "Script Upload — Studio" }] }),
  component: ScriptUpload,
});

const statusMeta: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> =
  {
    completed: {
      label: "Completed",
      className: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
      icon: CheckCircle2,
    },
    processing: {
      label: "Analyzing…",
      className:
        "border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)] text-[var(--gold-bright)]",
      icon: Loader2,
    },
    uploaded: {
      label: "Uploaded",
      className: "border-white/10 bg-white/5 text-muted-foreground",
      icon: Clock,
    },
    failed: {
      label: "Failed",
      className: "border-red-400/30 bg-red-400/5 text-red-300",
      icon: XCircle,
    },
  };

function ScriptUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const scriptsQuery = useQuery({
    queryKey: ["scripts", "forUser", user?.id],
    queryFn: () => api.scripts.forUser(user!.id),
    enabled: !!user,
    refetchInterval: (query) => {
      const scripts = query.state.data ?? [];
      const stillRunning = scripts.some(
        (s) => s.status === "uploaded" || s.status === "processing",
      );
      return stillRunning ? 4000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; file: File }) =>
      api.scripts.upload({ ...data, user_id: user!.id }),
    onSuccess: (script) => {
      toast.success(`"${script.title}" uploaded — running full analysis now.`);
      setPendingFile(null);
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["scripts", "forUser", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", "check-limit", user?.id] });
      navigate({ to: "/scripts/$scriptId", params: { scriptId: String(script.id) } });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    },
  });

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      toast.error("Only .pdf and .txt files are supported.");
      return;
    }
    setPendingFile(file);
    if (!title) setTitle(file.name.replace(/\.(pdf|txt)$/i, ""));
  }

  function handleSubmit() {
    if (!pendingFile) {
      toast.error("Choose a screenplay file first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Give your script a title.");
      return;
    }
    uploadMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      file: pendingFile,
    });
  }

  const scripts = useMemo(() => scriptsQuery.data ?? [], [scriptsQuery.data]);

  return (
    <StudioLayout>
      <PageHeader
        eyebrow="Create"
        title="Script Upload"
        description="Upload a screenplay once — character tracking, emotion analysis, shot suggestions, BGM, storyboard, and cost estimation all run automatically."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <GlassCard>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`relative flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
              dragging
                ? "border-[var(--gold-bright)] bg-[oklch(0.85_0.155_86/0.08)]"
                : "border-white/10 bg-black/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="grid h-20 w-20 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black shadow-[0_0_40px_-10px_var(--gold-bright)]"
            >
              <Upload className="h-9 w-9 text-[var(--gold-bright)]" />
            </motion.div>
            <h3 className="mt-6 font-display text-xl text-foreground">
              {pendingFile ? pendingFile.name : "Drop your screenplay here"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF or TXT — full analysis runs automatically
            </p>
            <div className="mt-6">
              <GoldButton onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Browse Files
              </GoldButton>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Working title for this script"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="A short logline or note about this draft"
                className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
              />
            </div>
            <GoldButton
              onClick={handleSubmit}
              className={`w-full justify-center ${uploadMutation.isPending ? "pointer-events-none opacity-70" : ""}`}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Upload & Analyze
                </>
              )}
            </GoldButton>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg text-foreground">Your Scripts</h3>
            <span className="text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
              {scripts.length} file{scripts.length === 1 ? "" : "s"}
            </span>
          </div>

          {scriptsQuery.isLoading ? (
            <LoadingState label="Loading your scripts…" />
          ) : scriptsQuery.isError ? (
            <ErrorState
              message={
                scriptsQuery.error instanceof ApiError
                  ? scriptsQuery.error.message
                  : "Couldn't load your scripts."
              }
              onRetry={() => scriptsQuery.refetch()}
            />
          ) : scripts.length === 0 ? (
            <EmptyState
              title="No scripts yet"
              description="Upload a screenplay on the left to see it appear here."
              icon={<FileText className="h-6 w-6 text-[var(--gold-bright)]" />}
            />
          ) : (
            <ul className="space-y-2">
              {scripts.map((s) => {
                const meta = statusMeta[s.status] ?? statusMeta.uploaded;
                const Icon = meta.icon;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() =>
                        navigate({ to: "/scripts/$scriptId", params: { scriptId: String(s.id) } })
                      }
                      className="group flex w-full items-center gap-3 rounded-lg border border-white/5 bg-black/30 p-3 text-left transition hover:border-[oklch(0.85_0.155_86/0.3)]"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.08)]">
                        <FileText className="h-4 w-4 text-[var(--gold-bright)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">{s.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${meta.className}`}
                      >
                        <Icon
                          className={`h-3 w-3 ${s.status === "processing" ? "animate-spin" : ""}`}
                        />
                        {meta.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--gold-bright)]" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>
      </div>
    </StudioLayout>
  );
}
