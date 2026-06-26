import { useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useMobileSidebar } from "./MobileSidebarContext";

const planLabels: Record<string, string> = {
  creator: "Creator Plan",
  professional: "Professional Director",
  studio: "Studio Plan",
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { toggle } = useMobileSidebar();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
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

        {/* Search -- collapses to an icon-only button on small screens so
            the placeholder text and kbd hint don't force horizontal
            overflow at narrow widths. */}
        <div className="hidden flex-1 items-center gap-2 rounded-full border border-[oklch(0.85_0.155_86/0.12)] bg-[#111111]/80 px-5 py-3 text-sm transition focus-within:border-[oklch(0.85_0.155_86/0.45)] focus-within:shadow-[0_0_0_4px_oklch(0.85_0.155_86/0.08)] sm:flex">
          <Search className="h-4 w-4 shrink-0 text-[var(--gold-dim)]" />
          <input
            placeholder="Search projects, scripts, assets..."
            className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground lg:block">
            ⌘ K
          </kbd>
        </div>
        <button
          aria-label="Search"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/5 bg-[#111111] text-muted-foreground transition hover:text-foreground sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Bell -- hidden on the smallest screens to keep the bar from
            overflowing; profile menu remains the priority action. */}
        <button className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-white/5 bg-[#111111] text-muted-foreground transition hover:text-foreground min-[420px]:grid">
          <Bell className="h-4 w-4" />
        </button>

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
  );
}
