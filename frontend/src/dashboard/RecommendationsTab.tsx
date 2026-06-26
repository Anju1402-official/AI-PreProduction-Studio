import { Camera, Music2 } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/dashboard/StudioLayout";
import type { DashboardRecommendationsTab as RecommendationsTabData } from "@/lib/api";

export function RecommendationsTab({ data }: { data: RecommendationsTabData }) {
  const shotsByScene = new Map(
    (data.shot_suggestions?.suggestions ?? []).map((s) => [s.scene_number, s]),
  );
  const bgmByScene = new Map(
    (data.bgm_recommendations?.recommendations ?? []).map((b) => [b.scene_number, b]),
  );

  const sceneNumbers = Array.from(new Set([...shotsByScene.keys(), ...bgmByScene.keys()])).sort(
    (a, b) => a - b,
  );

  if (sceneNumbers.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No recommendations available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sceneNumbers.map((sceneNumber, i) => {
        const shot = shotsByScene.get(sceneNumber);
        const bgm = bgmByScene.get(sceneNumber);
        const heading = shot?.scene_heading || bgm?.scene_heading || `Scene ${sceneNumber}`;

        return (
          <motion.div
            key={sceneNumber}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
          >
            <GlassCard>
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-[oklch(0.85_0.155_86/0.08)] font-mono text-xs text-[var(--gold-bright)]">
                  S{sceneNumber}
                </span>
                <div className="text-sm text-foreground">{heading}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {shot && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                      <Camera className="h-3 w-3" /> Shots — {shot.emotion}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {shot.suggested_shots.map((s, j) => (
                        <span
                          key={j}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-foreground/90"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {bgm && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--gold-dim)]">
                      <Music2 className="h-3 w-3" /> Music — {bgm.mood}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bgm.recommended_music.map((m, j) => (
                        <span
                          key={j}
                          className="rounded-full border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.06)] px-2.5 py-1 text-xs text-[var(--gold-bright)]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
