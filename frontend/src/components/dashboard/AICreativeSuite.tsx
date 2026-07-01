import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PenLine, Clapperboard, Coins, Film, Music, Plus } from "lucide-react";
import writer from "@/assets/agent-writer.jpg";
import director from "@/assets/agent-director.jpg";
import producer from "@/assets/agent-producer.jpg";
import editor from "@/assets/agent-editor.jpg";
import music from "@/assets/agent-music.jpg";

const agents = [
  {
    name: "Writer Agent",
    img: writer,
    desc: "Generate stories, plots and compelling scripts.",
    cta: "Generate Story",
    icon: PenLine,
    to: "/story-generator" as const,
  },
  {
    name: "Director Agent",
    img: director,
    desc: "Get shot suggestions and camera moves for your scenes.",
    cta: "Upload & Analyze",
    icon: Clapperboard,
    to: "/script-upload" as const,
  },
  {
    name: "Producer Agent",
    img: producer,
    desc: "Estimate budgets, resources and production risks.",
    cta: "Upload & Analyze",
    icon: Coins,
    to: "/script-upload" as const,
  },
  {
    name: "Editor Agent",
    img: editor,
    desc: "Review structure, pacing and scene importance.",
    cta: "Upload & Analyze",
    icon: Film,
    to: "/script-upload" as const,
  },
  {
    name: "Music Agent",
    img: music,
    desc: "Get background music recommendations by scene.",
    cta: "Upload & Analyze",
    icon: Music,
    to: "/script-upload" as const,
  },
];

export function AICreativeSuite() {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[var(--gold-bright)]">✦</span>
          <h2 className="font-display text-xl tracking-[0.18em] text-foreground">
            AI <span className="gold-text">CREATIVE</span> SUITE
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {agents.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.article
              key={a.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.12)] bg-gradient-to-b from-[#141414] to-[#0a0a0a] hover-glow"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={a.img}
                  alt={a.name}
                  width={600}
                  height={600}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-[oklch(0.85_0.155_86/0.3)] bg-black/60 backdrop-blur">
                  <Icon className="h-3.5 w-3.5 text-[var(--gold-bright)]" />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="font-display text-lg text-foreground">{a.name}</div>
                <p className="mt-1 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                  {a.desc}
                </p>
                <Link
                  to={a.to}
                  className="mt-4 flex items-center justify-between rounded-lg border border-[oklch(0.85_0.155_86/0.25)] bg-[oklch(0.85_0.155_86/0.08)] px-3 py-2 text-xs text-[var(--gold-bright)] transition group-hover:border-[oklch(0.85_0.155_86/0.5)] group-hover:bg-[oklch(0.85_0.155_86/0.15)]"
                >
                  <span>{a.cta}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
