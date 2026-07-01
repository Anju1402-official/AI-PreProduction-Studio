import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Users,
  Globe2,
  LayoutTemplate,
  Heart,
  MessagesSquare,
  Star,
  Wand2,
  Clapperboard,
  Camera,
  Music2,
  Wallet,
  ListChecks,
  Image as ImageIcon,
  UserSquare2,
  MapPin,
  AudioLines,
  Package,
  ArrowRight,
  Coins,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMobileSidebar } from "./MobileSidebarContext";

type Item = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  badge?: string;
};
type Group = { title: string | null; items: Item[] };

const groups: Group[] = [
  { title: null, items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/" }] },
  {
    title: "Create",
    items: [
      { label: "Story Generator", icon: Sparkles, to: "/story-generator", badge: "AI" },
      { label: "Script Generator", icon: FileText, to: "/script-generator" },
      { label: "Script Upload", icon: Upload, to: "/script-upload" },
      { label: "Character Generator", icon: Users, to: "/characters" },
      { label: "World Builder", icon: Globe2, to: "/world-builder" },
      { label: "Templates", icon: LayoutTemplate, to: "/templates" },
    ],
  },
  {
    title: "Analyze",
    items: [
      { label: "Script Correction", icon: Wand2, to: "/script-correction" },
    ],
  },
  {
    title: "Pre-Production",
    items: [{ label: "Shot List", icon: ListChecks, to: "/shot-list" }],
  },
  {
    title: "Asset Library",
    items: [
      { label: "Media Library", icon: ImageIcon, to: "/media-library" },
      { label: "Character Library", icon: UserSquare2, to: "/character-library" },
      { label: "Location Library", icon: MapPin, to: "/location-library" },
      { label: "Sound Library", icon: AudioLines, to: "/sound-library" },
      { label: "Props & Assets", icon: Package, to: "/props" },
    ],
  },
  {
    title: "Studio",
    items: [
      { label: "Plan & Usage", icon: Coins, to: "/credits" },
      { label: "Studio Stats", icon: Shield, to: "/admin" },
    ],
  },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOpen, close } = useMobileSidebar();

  // Close the mobile drawer automatically whenever the route changes, so
  // tapping a nav item doesn't leave the drawer covering the new page.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarContent = (
    <div className="sticky top-0 flex h-screen flex-col">
      {/* Brand */}
      <div className="relative flex items-start justify-between px-6 pb-5 pt-6">
        <Link to="/" className="group flex items-start gap-3" onClick={close}>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[oklch(0.85_0.155_86/0.35)] bg-gradient-to-br from-[#1a1408] to-black shadow-[0_0_24px_-6px_oklch(0.85_0.155_86/0.7)]">
            <Clapperboard
              className="h-6 w-6 text-[var(--gold-bright)] origin-top-left transition group-hover:animate-clapper-snap"
            />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--gold-dim)]">
              AI Pre-Production
            </div>
            <div className="font-display text-2xl tracking-[0.22em] text-foreground">STUDIO</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Your AI Copilot for Filmmakers
            </div>
          </div>
        </Link>
        <button
          onClick={close}
          aria-label="Close menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-muted-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.title && (
              <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--gold-dim)]">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to;
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={close}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-all ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="side-active"
                          className="absolute inset-0 rounded-lg border border-[oklch(0.85_0.155_86/0.3)] bg-gradient-to-r from-[oklch(0.85_0.155_86/0.18)] to-[oklch(0.85_0.155_86/0.02)]"
                          transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        />
                      )}
                      <span
                        className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                          isActive
                            ? "border-[oklch(0.85_0.155_86/0.5)] bg-[oklch(0.85_0.155_86/0.18)]"
                            : "border-white/5 bg-white/[0.03] group-hover:border-[oklch(0.85_0.155_86/0.25)]"
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${isActive ? "text-[var(--gold-bright)]" : "text-muted-foreground group-hover:text-[var(--gold)]"}`}
                        />
                      </span>
                      <span className="relative flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="relative rounded-md border border-[oklch(0.85_0.155_86/0.4)] bg-[oklch(0.85_0.155_86/0.12)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--gold-bright)]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 pb-5">
        <div className="relative overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.3)] bg-gradient-to-br from-[#1a1408] via-[#0d0a04] to-black p-4 shadow-[var(--shadow-glow-gold)]">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[oklch(0.85_0.155_86/0.25)] blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="font-display text-base text-foreground">Upgrade Your Plan</div>
            <Clapperboard className="h-7 w-7 text-[var(--gold-bright)] drop-shadow-[0_0_12px_var(--gold-bright)]" />
          </div>
          <ul className="relative mt-3 space-y-1.5 text-[11px] text-muted-foreground">
            {["More script uploads", "Team collaboration", "Advanced analytics"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--gold-bright)]" />
                {t}
              </li>
            ))}
          </ul>
          <Link
            to="/credits"
            onClick={close}
            className="relative mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-3 py-2 text-xs font-semibold text-black shadow-[0_0_20px_-4px_var(--gold-bright)] transition hover:shadow-[0_0_28px_-2px_var(--gold-bright)]"
          >
            View Plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static sidebar, always visible from md: up */}
      <aside className="relative hidden w-[260px] shrink-0 border-r border-[oklch(0.85_0.155_86/0.08)] bg-[#070707] md:block">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[oklch(0.85_0.155_86/0.14)] blur-3xl animate-float-light" />
        {sidebarContent}
      </aside>

      {/* Mobile: off-canvas drawer, toggled via the Topbar hamburger */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-[oklch(0.85_0.155_86/0.08)] bg-[#070707] md:hidden"
            >
              <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[oklch(0.85_0.155_86/0.14)] blur-3xl" />
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
