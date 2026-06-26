import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { pipelineStageLabel } from "@/dashboard/usePipelineDashboard";

const STAGE_ORDER = [
  "parsing",
  "character_tracking",
  "emotion_analysis",
  "shot_suggestions",
  "storyboard",
  "script_review",
  "completed",
];

export function PipelineProgress({
  stage,
  errorMessage,
}: {
  stage: string | null;
  errorMessage?: string | null;
}) {
  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-400/30 bg-red-400/5 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-300" />
        <h3 className="font-display text-lg text-foreground">Analysis failed</h3>
        <p className="max-w-md text-sm text-red-200/80">{errorMessage}</p>
      </div>
    );
  }

  const currentIndex = stage ? STAGE_ORDER.indexOf(stage) : 0;

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-[oklch(0.85_0.155_86/0.15)] bg-[#0f0f0f] p-10 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="grid h-16 w-16 place-items-center rounded-2xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black"
      >
        <Loader2 className="h-7 w-7 text-[var(--gold-bright)]" />
      </motion.div>

      <div>
        <h3 className="font-display text-xl text-foreground">{pipelineStageLabel(stage)}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Your screenplay is being analyzed automatically — this page will update as each stage
          finishes.
        </p>
      </div>

      <div className="flex w-full max-w-md items-center gap-1.5">
        {STAGE_ORDER.slice(0, -1).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentIndex
                ? "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)]"
                : "bg-white/5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
