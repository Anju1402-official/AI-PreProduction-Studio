import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  CornerDownLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useMobileSidebar } from "./MobileSidebarContext";

const planLabels: Record<string, string> = {
  creator: "Creator Plan",
  professional: "Professional Director",
  studio: "Studio Plan",
};

/* Every searchable destination in the studio. Plain client-side index — no
   backend call — so the command palette works instantly and offline. */
type SearchItem = { label: string; to: string; group: string; keywords?: string };

const SEARCH_ITEMS: SearchItem[] = [
  { label: "Dashboard", to: "/", group: "Navigate", keywords: "home overview studio" },
  { label: "AI Copilot", to: "/copilot", group: "AI Assistant", keywords: "chat ask help copilot assistant ai" },
  { label: "Script Upload", to: "/script-upload", group: "Create", keywords: "upload screenplay pdf analyze" },
  { label: "Story Generator", to: "/story-generator", group: "Create", keywords: "plot logline ai" },
  { label: "Script Generator", to: "/script-generator", group: "Create", keywords: "screenplay draft ai" },
  { label: "Character Generator", to: "/characters", group: "Create", keywords: "cast arc voice" },
  { label: "World Builder", to: "/world-builder", group: "Create", keywords: "lore map faction bible" },
  { label: "Templates", to: "/templates", group: "Create", keywords: "pitch deck story" },
  { label: "Script Correction", to: "/script-correction", group: "Analyze", keywords: "continuity formatting dialogue polish" },
  { label: "Shot List", to: "/shot-list", group: "Pre-Production", keywords: "setups lenses call sheet" },
  { label: "Storyboard Generator", to: "/storyboard", group: "Pre-Production", keywords: "frames panels visual" },
  { label: "Media Library", to: "/media-library", group: "Asset Library", keywords: "images plates references" },
  { label: "Character Library", to: "/character-library", group: "Asset Library", keywords: "casting wardrobe" },
  { label: "Location Library", to: "/location-library", group: "Asset Library", keywords: "scout permits" },
  { label: "Storyboard Library", to: "/sound-library", group: "Asset Library", keywords: "storyboard frames panels visual boards" },
  { label: "Script Library", to: "/props", group: "Asset Library", keywords: "scripts screenplay drafts writing" },
  { label: "Plan & Usage", to: "/credits", group: "Studio", keywords: "billing upgrade plan credits" },
  { label: "Studio Stats", to: "/admin", group: "Studio", keywords: "platform totals metrics" },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const { toggle } = useMobileSidebar();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const lastKeyRef = useRef<{ key: string; time: number }>({ key: "", time: 0 });

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.group} ${item.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [query]);

  // Open the palette with ⌘K / Ctrl-K from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip shortcuts when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const now = Date.now();
      const last = lastKeyRef.current;

      if (last.key === "g" && now - last.time < 500) {
        const shortcuts: Record<string, string> = {
          d: "/",
          s: "/script-upload",
          c: "/copilot",
          t: "/story-generator",
          a: "/script-correction",
        };
        const target = shortcuts[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate({ to: target });
          lastKeyRef.current = { key: "", time: 0 };
          return;
        }
      }

      lastKeyRef.current = { key: e.key.toLowerCase(), time: now };

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input and reset state whenever the palette opens.
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => paletteInputRef.current?.focus());
    }
  }, [paletteOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(to: string) {
    setPaletteOpen(false);
    navigate({ to });
  }

  function onPaletteKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item.to);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[oklch(0.85_0.155_86/0.08)] bg-[#0B0B0B]/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
          {/* Mobile menu trigger -- opens the off-canvas Sidebar drawer */}
          <button
            onClick={toggle}
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/5 bg-[#111111] text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Search -- opens the command palette. On small screens it collapses
              to an icon-only button so the placeholder text doesn't overflow. */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden flex-1 items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.12)] bg-[#111111]/80 px-5 py-3 text-sm text-left transition hover:border-[oklch(0.85_0.155_86/0.45)] hover:shadow-[0_0_0_4px_oklch(0.85_0.155_86/0.06)] sm:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-[var(--gold-dim)]" />
            <span className="w-full min-w-0 truncate text-muted-foreground">
              Search projects, scripts, assets...
            </span>
            <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground lg:block">
              ⌘ K
            </kbd>
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/5 bg-[#111111] text-muted-foreground transition hover:text-foreground sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Bell -- opens a notifications popover. Hidden on the smallest
              screens to keep the bar from overflowing. */}
          <div className="relative hidden shrink-0 min-[420px]:block">
            <button
              onClick={() => setBellOpen((v) => !v)}
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/5 bg-[#111111] text-muted-foreground transition hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--gold-bright)] shadow-[0_0_6px_var(--gold-bright)]" />
            </button>

            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#111111] p-2 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold-dim)]">
                      Notifications
                    </span>
                    <button
                      onClick={() => setBellOpen(false)}
                      aria-label="Close notifications"
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {[
                      {
                        title: "Welcome to the studio",
                        body: "Upload a screenplay to kick off your first analysis.",
                      },
                      {
                        title: "Pipeline ready",
                        body: "Character, emotion, shot, and budget analysis run automatically.",
                      },
                    ].map((n) => (
                      <li
                        key={n.title}
                        className="rounded-lg border border-white/5 bg-black/30 px-3 py-2"
                      >
                        <div className="text-xs text-foreground">{n.title}</div>
                        <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {n.body}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setBellOpen(false);
                      toast.success("You're all caught up.");
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-center text-[11px] text-[var(--gold-bright)] transition hover:bg-white/5"
                  >
                    Mark all as read
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-white/5 bg-[#111111] py-1 pl-1 pr-2 transition hover:border-[oklch(0.85_0.155_86/0.25)] sm:gap-3 sm:pr-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold-dim)] text-[11px] font-bold text-black">
                {initials}
              </div>
              <div className="hidden leading-tight text-left sm:block">
                <div className="text-xs text-foreground">{user?.name ?? "Loading…"}</div>
                <div className="text-[10px] text-[var(--gold-dim)]">
                  {user ? (planLabels[user.plan_type] ?? user.plan_type) : ""}
                </div>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#111111] p-2 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5 shrink-0" />{" "}
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/credits"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-white/5"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-[var(--gold-bright)]" /> Plan & Usage
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      toast.success("Logged out.");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-white/5"
                  >
                    <LogOut className="h-3.5 w-3.5 text-[var(--gold-bright)]" /> Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Command palette ---------------------------------------------------- */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          onClick={() => setPaletteOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[oklch(0.85_0.155_86/0.2)] bg-[#0d0d0d]/95 shadow-[var(--shadow-premium)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--gold-dim)]" />
              <input
                ref={paletteInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onPaletteKeyDown}
                placeholder="Search projects, scripts, assets..."
                className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matches for “{query}”.
                </p>
              ) : (
                results.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <button
                      key={item.to + item.label}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(item.to)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-[oklch(0.85_0.155_86/0.12)] text-foreground"
                          : "text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="truncate text-foreground/90">{item.label}</span>
                        <span className="hidden text-[10px] uppercase tracking-widest text-[var(--gold-dim)] sm:inline">
                          {item.group}
                        </span>
                      </span>
                      {active && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--gold-bright)]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/5 px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↵</kbd> Open</span>
                <span className="flex items-center gap-1"><kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">esc</kbd> Close</span>
              </div>
              <span className="hidden sm:block">g then d/s/c for quick nav</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
