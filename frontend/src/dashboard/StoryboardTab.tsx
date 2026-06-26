import { Clapperboard, Camera, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/dashboard/StudioLayout";
import type { StoryboardResponse } from "@/lib/api";

export function StoryboardTab({ storyboard }: { storyboard: StoryboardResponse | null }) {
  const panels = storyboard?.panels ?? [];

  if (panels.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No storyboard panels available yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {panels.map((panel, i) => (
        <motion.div
          key={panel.scene_number}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.5) }}
        >
          <GlassCard className="flex h-full flex-col">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-[var(--gold-bright)]">
                Panel {panel.panel_number}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                S{panel.scene_number}
              </span>
            </div>

            {/* Descriptive storyboard "frame" -- no AI-generated image, this
                is a text-based panel built from the scene's shot type,
                camera angle, and mood/lighting notes. */}
            <div className="mb-3 flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-black/30 p-3 text-center">
              <Clapperboard className="h-6 w-6 text-[var(--gold-dim)]" />
              <div className="text-xs font-semibold text-foreground">{panel.shot_type}</div>
              <div className="text-[10px] text-muted-foreground">{panel.camera_angle}</div>
            </div>

            <div className="truncate text-xs text-muted-foreground">{panel.scene_heading}</div>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-foreground/80">
              {panel.composition_notes}
            </p>

            <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-[11px]">
              {panel.mood_lighting && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Sun className="h-3 w-3 text-[var(--gold-dim)]" /> {panel.mood_lighting}
                </div>
              )}
              {panel.key_visual_elements && (
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <Camera className="mt-0.5 h-3 w-3 shrink-0 text-[var(--gold-dim)]" />
                  <span>{panel.key_visual_elements}</span>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
