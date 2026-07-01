import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileSidebarProvider } from "./MobileSidebarContext";
import { RequireAuth } from "@/components/auth/RequireAuth";

export function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <MobileSidebarProvider>
        <div className="relative flex min-h-screen w-full text-foreground">
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute left-[18%] top-10 h-72 w-72 rounded-full bg-[oklch(0.85_0.155_86/0.10)] blur-[120px] animate-float-light" />
            <div
              className="absolute right-[8%] top-[40%] h-96 w-96 rounded-full bg-[oklch(0.78_0.135_84/0.08)] blur-[140px] animate-float-light"
              style={{ animationDelay: "2s" }}
            />
            {/* Projector light beam drifting across the frame */}
            <div className="cinema-sweep" />
            <div className="absolute inset-0" style={{ background: "var(--gradient-vignette)" }} />
            {/* Celluloid film grain over everything */}
            <div className="cinema-grain" />
          </div>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      </MobileSidebarProvider>
    </RequireAuth>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[var(--gold-dim)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold-bright)] animate-marquee-flicker" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
          <span className="bg-gradient-to-r from-[var(--gold-bright)] via-[var(--gold)] to-[var(--gold-dim)] bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        {/* Cinematic filmstrip accent under the title */}
        <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full opacity-60 cinema-filmstrip" />
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.12)] bg-[#0d0d0d]/80 p-6 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.85_0.155_86/0.4)] to-transparent" />
      {children}
    </div>
  );
}

export function GoldButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black shadow-[0_0_24px_-6px_var(--gold-bright)] transition hover:shadow-[0_0_32px_-2px_var(--gold-bright)] ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border border-[oklch(0.85_0.155_86/0.25)] bg-white/[0.02] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--gold-bright)] transition hover:bg-[oklch(0.85_0.155_86/0.08)] ${className}`}
    >
      {children}
    </button>
  );
}
