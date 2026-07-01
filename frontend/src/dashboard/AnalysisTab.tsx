import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Mic, Star } from "lucide-react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/dashboard/StudioLayout";
import type { DashboardAnalysisTab as AnalysisTabData } from "@/lib/api";

const EMOTION_PALETTE: Record<string, string> = {
  Joy: "oklch(0.85 0.155 86)",
  Fear: "#7c3aed",
  Sadness: "#3b82f6",
  Anger: "#ef4444",
  Tension: "#f97316",
};

const CHARACTER_PALETTE = [
  "oklch(0.85 0.155 86)",
  "#e879f9",
  "#ef4444",
  "#3b82f6",
  "#9a9a9a",
  "#34d399",
  "#f97316",
];

const CATEGORY_STYLES: Record<string, string> = {
  "Critical Scene": "border-red-400/30 bg-red-400/5 text-red-300",
  "Important Scene":
    "border-[oklch(0.85_0.155_86/0.4)] bg-[oklch(0.85_0.155_86/0.08)] text-[var(--gold-bright)]",
  "Supporting Scene": "border-amber-400/30 bg-amber-400/5 text-amber-300",
  "Redundant Scene": "border-white/10 bg-white/5 text-muted-foreground",
};

/**
 * Custom legend for the Emotional Flow chart. Recharts' default legend
 * renders plain sans labels; this one renders each emotion name (Joy,
 * Sadness, Fear, Anger, Tension) in the studio's premium display font
 * (Cinzel) with a small letter-spaced, color-matched swatch so the chart
 * reads as part of the premium UI rather than a stock recharts widget.
 */
function EmotionLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {Object.entries(EMOTION_PALETTE).map(([name, color]) => (
        <span key={name} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px -1px ${color}` }}
          />
          <span
            className="text-xs uppercase tracking-[0.18em] text-foreground/80"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {name}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AnalysisTab({ data }: { data: AnalysisTabData }) {
  const emotionChartData = (data.emotion?.emotions ?? []).map((e) => ({
    scene: String(e.scene_number),
    Joy: e.joy,
    Fear: e.fear,
    Sadness: e.sadness,
    Anger: e.anger,
    Tension: e.tension,
  }));

  const speakers = (data.dialogue?.dialogues ?? [])
    .slice()
    .sort((a, b) => b.word_count - a.word_count)
    .map((d, i) => ({ ...d, color: CHARACTER_PALETTE[i % CHARACTER_PALETTE.length] }));

  const characters = data.character_tracking?.characters ?? [];
  const sceneImportance = [...(data.scene_importance?.scenes ?? [])].sort(
    (a, b) => b.importance_score - a.importance_score,
  );

  return (
    <div className="space-y-6">
      {emotionChartData.length > 0 && (
        <GlassCard>
          <h3 className="mb-4 font-display text-lg text-foreground">
            Emotional Flow Across Scenes
          </h3>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={emotionChartData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                <defs>
                  {Object.entries(EMOTION_PALETTE).map(([k, c]) => (
                    <linearGradient id={`unified-g-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.155 86 / 0.08)" />
                <XAxis
                  dataKey="scene"
                  tick={{ fill: "#9a9a9a", fontSize: 11, fontFamily: "var(--font-display)" }}
                />
                <YAxis tick={{ fill: "#9a9a9a", fontSize: 11, fontFamily: "var(--font-display)" }} />
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid oklch(0.85 0.155 86 / 0.3)",
                    borderRadius: 12,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.04em",
                  }}
                  labelStyle={{ fontFamily: "var(--font-display)", color: "var(--gold-bright)" }}
                  itemStyle={{ fontFamily: "var(--font-display)" }}
                />
                <Legend content={<EmotionLegend />} />
                {Object.entries(EMOTION_PALETTE).map(([k, c]) => (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={c}
                    fill={`url(#unified-g-${k})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {speakers.length > 0 && (
          <GlassCard>
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-foreground">
              <Mic className="h-4 w-4 text-[var(--gold-bright)]" /> Dialogue by Character
            </h3>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={speakers} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.155 86 / 0.08)" />
                  <XAxis type="number" tick={{ fill: "#9a9a9a", fontSize: 11, fontFamily: "var(--font-display)" }} />
                  <YAxis
                    type="category"
                    dataKey="character_name"
                    tick={{ fill: "#9a9a9a", fontSize: 11, fontFamily: "var(--font-display)" }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0d0d0d",
                      border: "1px solid oklch(0.85 0.155 86 / 0.3)",
                      borderRadius: 12,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.04em",
                    }}
                    labelStyle={{ fontFamily: "var(--font-display)", color: "var(--gold-bright)" }}
                    itemStyle={{ fontFamily: "var(--font-display)" }}
                  />
                  <Bar dataKey="word_count" fill="oklch(0.85 0.155 86)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {data.dialogue?.total_words ?? 0} total words of dialogue
            </div>
          </GlassCard>
        )}

        {characters.length > 0 && (
          <GlassCard>
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg text-foreground">
              <Users className="h-4 w-4 text-[var(--gold-bright)]" /> Character Tracking
            </h3>
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {characters.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="text-foreground/90">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.detected_via.join(" + ")}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono text-[var(--gold-bright)]">
                      {c.scene_count} scenes
                    </div>
                    <div className="text-muted-foreground">{c.speaking_scene_count} speaking</div>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

      {sceneImportance.length > 0 && (
        <GlassCard className="p-0">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 font-display text-lg text-foreground">
            <Star className="h-4 w-4 text-[var(--gold-bright)]" /> Scene Importance Ranking
          </div>

          {/* Column header -- hidden on mobile, where each row renders as a
              self-labeled stacked card instead of a grid row. */}
          <div className="hidden grid-cols-12 border-b border-white/5 px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--gold-dim)] md:grid">
            <div className="col-span-1">Scene</div>
            <div className="col-span-5">Heading</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-4">Importance</div>
          </div>

          <ul>
            {sceneImportance.map((s, i) => (
              <motion.li
                key={s.scene_number}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className="border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/[0.02] md:grid md:grid-cols-12 md:items-center md:gap-2"
              >
                {/* Mobile layout: heading + scene number on one line,
                    category badge + importance bar below. */}
                <div className="flex items-center justify-between gap-2 md:hidden">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-xs text-[var(--gold-bright)]">
                      S{s.scene_number}
                    </span>
                    <span className="truncate text-foreground/90">
                      {s.scene_heading || `Scene ${s.scene_number}`}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      CATEGORY_STYLES[s.category] ?? CATEGORY_STYLES["Redundant Scene"]
                    }`}
                  >
                    {s.category}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 md:hidden">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)]"
                      style={{ width: `${Math.min(s.importance_score, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.importance_score.toFixed(1)}
                  </span>
                </div>

                {/* Desktop/tablet layout: original 12-column grid row. */}
                <div className="col-span-1 hidden font-mono text-xs text-[var(--gold-bright)] md:block">
                  S{s.scene_number}
                </div>
                <div className="col-span-5 hidden truncate text-foreground/90 md:block">
                  {s.scene_heading || `Scene ${s.scene_number}`}
                </div>
                <div className="col-span-2 hidden md:block">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      CATEGORY_STYLES[s.category] ?? CATEGORY_STYLES["Redundant Scene"]
                    }`}
                  >
                    {s.category}
                  </span>
                </div>
                <div className="col-span-4 hidden items-center gap-3 md:flex">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)]"
                      style={{ width: `${Math.min(s.importance_score, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.importance_score.toFixed(1)}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
