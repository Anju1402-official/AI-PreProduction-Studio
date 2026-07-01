import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  StudioLayout,
  PageHeader,
  GlassCard,
  GoldButton,
} from "@/components/dashboard/StudioLayout";
import { ArtifactContent } from "@/components/studio/ArtifactContent";
import { ApiError, type Artifact } from "@/lib/api";

export interface GeneratorField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "select" | "number";
  options?: string[];
  optional?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string;
}

export function GeneratorShell({
  eyebrow,
  title,
  description,
  fields,
  submitLabel = "Generate",
  generate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  fields: GeneratorField[];
  submitLabel?: string;
  generate: (values: Record<string, string>) => Promise<Artifact>;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])),
  );
  const [result, setResult] = useState<Artifact | null>(null);

  const mutation = useMutation({
    mutationFn: () => generate(values),
    onSuccess: (artifact) => {
      setResult(artifact);
      toast.success(`Generated “${artifact.title}”.`);
      queryClient.invalidateQueries({ queryKey: ["studio", "library"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Generation failed. Please try again.";
      toast.error(msg);
    },
  });

  const requiredField = fields.find((f) => !f.optional);
  const canSubmit = requiredField ? values[requiredField.name]?.trim().length > 0 : true;

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  return (
    <StudioLayout>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-bright)]">
            <Wand2 className="h-3 w-3" /> AI Powered
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Form */}
        <GlassCard>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-[var(--gold-dim)]">
                  {field.label}
                  {field.optional && (
                    <span className="ml-1 text-muted-foreground">(optional)</span>
                  )}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.name]}
                    onChange={(e) => setField(field.name, e.target.value)}
                    rows={4}
                    placeholder={field.placeholder}
                    className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.name]}
                    onChange={(e) => setField(field.name, e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
                  >
                    <option value="">Any</option>
                    {field.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    min={field.min}
                    max={field.max}
                    value={values[field.name]}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.85_0.155_86/0.45)] focus:outline-none"
                  />
                )}
              </div>
            ))}

            <GoldButton
              onClick={() => {
                if (!canSubmit) {
                  toast.error("Fill in the prompt first.");
                  return;
                }
                mutation.mutate();
              }}
              className={`w-full justify-center ${mutation.isPending ? "pointer-events-none opacity-70" : ""}`}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> {submitLabel}
                </>
              )}
            </GoldButton>

            {result && (
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[oklch(0.85_0.155_86/0.25)] bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--gold-bright)] transition hover:bg-[oklch(0.85_0.155_86/0.08)] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
              </button>
            )}
          </div>
        </GlassCard>

        {/* Result */}
        <div>
          {mutation.isPending ? (
            <GlassCard className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black"
              >
                <Sparkles className="h-6 w-6 text-[var(--gold-bright)]" />
              </motion.div>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                Composing with AI…
              </p>
            </GlassCard>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GlassCard>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-foreground">{result.title}</h2>
                    {result.summary && (
                      <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                    Saved
                  </span>
                </div>
                <ArtifactContent artifact={result} />
              </GlassCard>
            </motion.div>
          ) : (
            <GlassCard className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.06)]">
                <Sparkles className="h-6 w-6 text-[var(--gold-bright)]" />
              </div>
              <h3 className="mt-4 font-display text-lg text-foreground">Ready when you are</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Fill in the brief on the left and generate. Every result is saved to your
                library automatically.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </StudioLayout>
  );
}
