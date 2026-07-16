import { Link } from "@tanstack/react-router";
import {
  FolderPlus,
  BookOpen,
  FileText,
  Upload,
  BarChart3,
  Layout,
  Layers,
  Bot,
} from "lucide-react";

const steps = [
  { label: "Create Project", icon: FolderPlus, to: "/story-generator", done: false },
  { label: "Generate Story", icon: BookOpen, to: "/story-generator", done: false },
  { label: "Generate Script", icon: FileText, to: "/script-generator", done: false },
  { label: "Upload Script", icon: Upload, to: "/script-upload", done: false },
  { label: "AI Analysis", icon: BarChart3, to: "/script-upload", done: false },
  { label: "Production Dashboard", icon: Layout, to: "/", done: false },
  { label: "Storyboard", icon: Layers, to: "/storyboard", done: false },
  { label: "AI Copilot", icon: Bot, to: "/copilot", done: false },
];

export function WorkflowSteps() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[var(--gold-bright)]">✦</span>
        <h2 className="font-display text-xl tracking-[0.18em] text-foreground">
          YOUR <span className="bg-gradient-to-r from-[var(--gold-bright)] via-[var(--gold)] to-[var(--gold-dim)] bg-clip-text text-transparent">WORKFLOW</span>
        </h2>
      </div>

      <div className="relative overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max pb-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center">
                <Link
                  to={step.to}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:border-[oklch(0.85_0.155_86/0.25)] hover:bg-[oklch(0.85_0.155_86/0.05)] min-w-[100px]"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-[oklch(0.85_0.155_86/0.2)] bg-[oklch(0.85_0.155_86/0.06)] transition group-hover:border-[oklch(0.85_0.155_86/0.4)] group-hover:bg-[oklch(0.85_0.155_86/0.12)]">
                    <Icon className="h-4 w-4 text-[var(--gold-dim)] group-hover:text-[var(--gold-bright)]" />
                  </div>
                  <span className="text-[10px] text-center uppercase tracking-wider text-muted-foreground group-hover:text-foreground whitespace-nowrap">
                    {step.label}
                  </span>
                </Link>
                {i < steps.length - 1 && (
                  <div className="mx-0.5 h-px w-4 bg-white/10 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
